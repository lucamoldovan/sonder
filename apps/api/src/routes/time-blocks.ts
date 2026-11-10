import { and, asc, eq, gt, gte, lt } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { tasks, timeBlocks } from "../db/schema";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const timeBlockRoutes = new Hono<AppEnv>();
const Id = z.string().uuid();
const Payload = z.object({
  taskId: Id,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  note: z.string().max(1000).nullable().optional()
}).refine(v => new Date(v.endsAt) > new Date(v.startsAt), { path: ["endsAt"], message: "End time must be after start time." });

timeBlockRoutes.get("/", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const from = c.req.query("from");
  const to = c.req.query("to");
  const filters = [eq(timeBlocks.userId, user.id)];
  if (from && !Number.isNaN(Date.parse(from))) filters.push(gte(timeBlocks.startsAt, new Date(from)));
  if (to && !Number.isNaN(Date.parse(to))) filters.push(lt(timeBlocks.startsAt, new Date(to)));
  const rows = await c.get("db").select().from(timeBlocks).where(and(...filters)).orderBy(asc(timeBlocks.startsAt));
  return c.json({ data: rows });
});

timeBlockRoutes.post("/", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = Payload.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "VALIDATION_ERROR", message: "Check the scheduled time block.", issues: parsed.error.issues } }, 400);
  const db = c.get("db");
  const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, parsed.data.taskId), eq(tasks.userId, user.id))).limit(1);
  if (!task) return c.json({ error: { code: "INVALID_RELATION", message: "The selected task does not exist." } }, 400);
  const [created] = await db.insert(timeBlocks).values({ userId: user.id, taskId: parsed.data.taskId, startsAt: new Date(parsed.data.startsAt), endsAt: new Date(parsed.data.endsAt), note: parsed.data.note ?? null }).returning();
  const overlaps = await db.select({ id: timeBlocks.id, startsAt: timeBlocks.startsAt, endsAt: timeBlocks.endsAt }).from(timeBlocks)
    .where(and(eq(timeBlocks.userId, user.id), lt(timeBlocks.startsAt, created.endsAt), gt(timeBlocks.endsAt, created.startsAt)));
  return c.json({ data: created, conflicts: overlaps.filter(row => row.id !== created.id) }, 201);
});

timeBlockRoutes.patch("/:id", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const id = Id.safeParse(c.req.param("id"));
  const parsed = Payload.partial().safeParse(await c.req.json().catch(() => null));
  if (!id.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) return c.json({ error: { code: "VALIDATION_ERROR", message: "Provide a valid time block and changes." } }, 400);
  const db = c.get("db");
  const [existing] = await db.select().from(timeBlocks).where(and(eq(timeBlocks.id, id.data), eq(timeBlocks.userId, user.id))).limit(1);
  if (!existing) return c.json({ error: { code: "NOT_FOUND", message: "Time block not found." } }, 404);
  if (parsed.data.taskId) {
    const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, parsed.data.taskId), eq(tasks.userId, user.id))).limit(1);
    if (!task) return c.json({ error: { code: "INVALID_RELATION", message: "The selected task does not exist." } }, 400);
  }
  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : existing.startsAt;
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : existing.endsAt;
  if (endsAt <= startsAt) return c.json({ error: { code: "VALIDATION_ERROR", message: "End time must be after start time." } }, 400);
  const [updated] = await db.update(timeBlocks).set({
    ...(parsed.data.taskId ? { taskId: parsed.data.taskId } : {}),
    ...(parsed.data.startsAt ? { startsAt } : {}),
    ...(parsed.data.endsAt ? { endsAt } : {}),
    ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
    updatedAt: new Date()
  }).where(and(eq(timeBlocks.id, id.data), eq(timeBlocks.userId, user.id))).returning();
  const conflicts = await db.select({ id: timeBlocks.id, startsAt: timeBlocks.startsAt, endsAt: timeBlocks.endsAt }).from(timeBlocks)
    .where(and(eq(timeBlocks.userId, user.id), lt(timeBlocks.startsAt, updated.endsAt), gt(timeBlocks.endsAt, updated.startsAt)));
  return c.json({ data: updated, conflicts: conflicts.filter(row => row.id !== updated.id) });
});

timeBlockRoutes.delete("/:id", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const id = Id.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "Provide a valid time block ID." } }, 400);
  const [deleted] = await c.get("db").delete(timeBlocks).where(and(eq(timeBlocks.id, id.data), eq(timeBlocks.userId, user.id))).returning({ id: timeBlocks.id });
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Time block not found." } }, 404);
  return c.body(null, 204);
});
