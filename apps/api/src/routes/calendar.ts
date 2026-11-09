import { and, asc, eq, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import { CreateCalendarEventSchema, UpdateCalendarEventSchema, UuidSchema } from "@sonder/contracts";
import { calendarEvents, lifeAreas, projects } from "../db/schema";
import type { Database } from "../db";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const calendarRoutes = new Hono<AppEnv>();

async function validRelations(db: Database, userId: string, lifeAreaId?: string | null, projectId?: string | null) {
  if (lifeAreaId) {
    const [area] = await db.select({ id: lifeAreas.id }).from(lifeAreas).where(and(eq(lifeAreas.id, lifeAreaId), eq(lifeAreas.userId, userId))).limit(1);
    if (!area) return "The selected life area does not exist.";
  }
  if (projectId) {
    const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
    if (!project) return "The selected project does not exist.";
  }
  return null;
}

calendarRoutes.get("/", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const from = c.req.query("from");
  const to = c.req.query("to");
  const conditions = [eq(calendarEvents.userId, user.id)];
  if (from && !Number.isNaN(Date.parse(from))) conditions.push(gte(calendarEvents.startsAt, new Date(from)));
  if (to && !Number.isNaN(Date.parse(to))) conditions.push(lte(calendarEvents.startsAt, new Date(to)));
  const rows = await c.get("db").select().from(calendarEvents).where(and(...conditions)).orderBy(asc(calendarEvents.startsAt));
  return c.json({ data: rows });
});

calendarRoutes.post("/", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = CreateCalendarEventSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "VALIDATION_ERROR", message: "Check the event details.", issues: parsed.error.issues } }, 400);
  const db = c.get("db");
  const relationError = await validRelations(db, user.id, parsed.data.lifeAreaId, parsed.data.projectId);
  if (relationError) return c.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  const [created] = await db.insert(calendarEvents).values({ userId: user.id, ...parsed.data, startsAt: new Date(parsed.data.startsAt), endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null }).returning();
  return c.json({ data: created }, 201);
});

calendarRoutes.patch("/:id", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = UpdateCalendarEventSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return c.json({ error: { code: "VALIDATION_ERROR", message: "Provide valid event changes." } }, 400);
  const db = c.get("db");
  const relationError = await validRelations(db, user.id, parsed.data.lifeAreaId, parsed.data.projectId);
  if (relationError) return c.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  const data = parsed.data;
  const updates: Partial<typeof calendarEvents.$inferInsert> = { updatedAt: new Date() };
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.lifeAreaId !== undefined) updates.lifeAreaId = data.lifeAreaId;
  if (data.projectId !== undefined) updates.projectId = data.projectId;
  if (data.startsAt !== undefined) updates.startsAt = new Date(data.startsAt);
  if (data.endsAt !== undefined) updates.endsAt = data.endsAt ? new Date(data.endsAt) : null;
  if (data.allDay !== undefined) updates.allDay = data.allDay;
  if (data.location !== undefined) updates.location = data.location;
  const [updated] = await db.update(calendarEvents).set(updates).where(and(eq(calendarEvents.id, id.data), eq(calendarEvents.userId, user.id))).returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Event not found." } }, 404);
  return c.json({ data: updated });
});

calendarRoutes.delete("/:id", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const [deleted] = await c.get("db").delete(calendarEvents).where(and(eq(calendarEvents.id, id.data), eq(calendarEvents.userId, user.id))).returning({ id: calendarEvents.id });
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Event not found." } }, 404);
  return c.body(null, 204);
});
