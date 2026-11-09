import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { CreateGoalSchema, UpdateGoalSchema, UuidSchema } from "@sonder/contracts";
import { goals, lifeAreas } from "../db/schema";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const goalRoutes = new Hono<AppEnv>();

goalRoutes.get("/", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const rows = await c.get("db").select().from(goals).where(eq(goals.userId, user.id)).orderBy(asc(goals.targetDate), asc(goals.createdAt));
  return c.json({ data: rows });
});

goalRoutes.post("/", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = CreateGoalSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "VALIDATION_ERROR", message: "Check the goal details.", issues: parsed.error.issues } }, 400);
  const db = c.get("db");
  if (parsed.data.lifeAreaId) {
    const [area] = await db.select({ id: lifeAreas.id }).from(lifeAreas).where(and(eq(lifeAreas.id, parsed.data.lifeAreaId), eq(lifeAreas.userId, user.id))).limit(1);
    if (!area) return c.json({ error: { code: "INVALID_RELATION", message: "The selected life area does not exist." } }, 400);
  }
  const [created] = await db.insert(goals).values({ userId: user.id, title: parsed.data.title, description: parsed.data.description ?? null, lifeAreaId: parsed.data.lifeAreaId ?? null, targetDate: parsed.data.targetDate ?? null, status: parsed.data.status }).returning();
  return c.json({ data: created }, 201);
});

goalRoutes.patch("/:id", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = UpdateGoalSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return c.json({ error: { code: "VALIDATION_ERROR", message: "Provide valid goal changes." } }, 400);
  const db = c.get("db");
  if (parsed.data.lifeAreaId) {
    const [area] = await db.select({ id: lifeAreas.id }).from(lifeAreas).where(and(eq(lifeAreas.id, parsed.data.lifeAreaId), eq(lifeAreas.userId, user.id))).limit(1);
    if (!area) return c.json({ error: { code: "INVALID_RELATION", message: "The selected life area does not exist." } }, 400);
  }
  const [updated] = await db.update(goals).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(goals.id, id.data), eq(goals.userId, user.id))).returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Goal not found." } }, 404);
  return c.json({ data: updated });
});

goalRoutes.delete("/:id", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const [deleted] = await c.get("db").delete(goals).where(and(eq(goals.id, id.data), eq(goals.userId, user.id))).returning({ id: goals.id });
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Goal not found." } }, 404);
  return c.body(null, 204);
});
