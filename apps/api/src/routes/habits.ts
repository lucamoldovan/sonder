import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { CreateHabitSchema, UpdateHabitSchema, UuidSchema } from "@sonder/contracts";
import { habitEntries, habits, lifeAreas } from "../db/schema";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const habitRoutes = new Hono<AppEnv>();

habitRoutes.get("/", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const db = c.get("db");
  const rows = await db.select().from(habits).where(eq(habits.userId, user.id)).orderBy(asc(habits.createdAt));
  const entries = await db.select().from(habitEntries).where(eq(habitEntries.userId, user.id)).orderBy(desc(habitEntries.entryDate));
  return c.json({ data: rows, entries });
});

habitRoutes.post("/", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = CreateHabitSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "VALIDATION_ERROR", message: "Check the habit details.", issues: parsed.error.issues } }, 400);
  const db = c.get("db");
  if (parsed.data.lifeAreaId) {
    const [area] = await db.select({ id: lifeAreas.id }).from(lifeAreas).where(and(eq(lifeAreas.id, parsed.data.lifeAreaId), eq(lifeAreas.userId, user.id))).limit(1);
    if (!area) return c.json({ error: { code: "INVALID_RELATION", message: "The selected life area does not exist." } }, 400);
  }
  const [created] = await db.insert(habits).values({ userId: user.id, ...parsed.data }).returning();
  return c.json({ data: created }, 201);
});

habitRoutes.patch("/:id", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = UpdateHabitSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return c.json({ error: { code: "VALIDATION_ERROR", message: "Provide valid habit changes." } }, 400);
  const { archived, ...data } = parsed.data;
  const [updated] = await c.get("db").update(habits).set({ ...data, archivedAt: archived === undefined ? undefined : archived ? new Date() : null, updatedAt: new Date() }).where(and(eq(habits.id, id.data), eq(habits.userId, user.id))).returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Habit not found." } }, 404);
  return c.json({ data: updated });
});

habitRoutes.post("/:id/check-in", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const body = await c.req.json().catch(() => ({})) as { date?: string; note?: string | null };
  const date = body.date ?? new Date().toISOString().slice(0, 10);
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T00:00:00Z"))) return c.json({ error: { code: "INVALID_DATE", message: "Use YYYY-MM-DD for the check-in date." } }, 400);
  const db = c.get("db");
  const [habit] = await db.select({ id: habits.id }).from(habits).where(and(eq(habits.id, id.data), eq(habits.userId, user.id))).limit(1);
  if (!habit) return c.json({ error: { code: "NOT_FOUND", message: "Habit not found." } }, 404);
  const [entry] = await db.insert(habitEntries).values({ userId: user.id, habitId: id.data, entryDate: date, note: body.note ?? null }).onConflictDoNothing().returning();
  if (entry) return c.json({ data: entry }, 201);
  const [existing] = await db.select().from(habitEntries).where(and(eq(habitEntries.habitId, id.data), eq(habitEntries.entryDate, date), eq(habitEntries.userId, user.id))).limit(1);
  return c.json({ data: existing });
});

habitRoutes.delete("/:id/check-in/:date", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  const date = c.req.param("date");
  if (!id.success || !/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) return c.json({ error: { code: "INVALID_ID", message: "Provide a valid habit ID and date." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  await c.get("db").delete(habitEntries).where(and(eq(habitEntries.habitId, id.data), eq(habitEntries.entryDate, date), eq(habitEntries.userId, user.id)));
  return c.body(null, 204);
});

habitRoutes.delete("/:id", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const [deleted] = await c.get("db").delete(habits).where(and(eq(habits.id, id.data), eq(habits.userId, user.id))).returning({ id: habits.id });
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Habit not found." } }, 404);
  return c.body(null, 204);
});
