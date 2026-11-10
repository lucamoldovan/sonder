import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { goals, goalMilestones } from "../db/schema";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const milestoneRoutes = new Hono<AppEnv>();
const Id = z.string().uuid();
const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(value + "T00:00:00.000Z"); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }, "Expected a real calendar date");
const Fields = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  targetDate: DateOnly.nullable().optional(),
  position: z.number().int().min(0).max(10000).optional()
});

milestoneRoutes.get("/goals/:goalId/milestones", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const goalId = Id.safeParse(c.req.param("goalId"));
  if (!goalId.success) return c.json({ error: { code: "INVALID_ID", message: "Invalid goal ID." } }, 400);
  const [goal] = await c.get("db").select({ id: goals.id }).from(goals).where(and(eq(goals.id, goalId.data), eq(goals.userId, user.id))).limit(1);
  if (!goal) return c.json({ error: { code: "NOT_FOUND", message: "Goal not found." } }, 404);
  const rows = await c.get("db").select().from(goalMilestones).where(and(eq(goalMilestones.goalId, goalId.data), eq(goalMilestones.userId, user.id))).orderBy(asc(goalMilestones.position), asc(goalMilestones.createdAt));
  return c.json({ data: rows });
});

milestoneRoutes.post("/goals/:goalId/milestones", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const goalId = Id.safeParse(c.req.param("goalId"));
  const parsed = Fields.safeParse(await c.req.json().catch(() => null));
  if (!goalId.success || !parsed.success) return c.json({ error: { code: "VALIDATION_ERROR", message: "Check the milestone details." } }, 400);
  const db = c.get("db");
  const [goal] = await db.select({ id: goals.id }).from(goals).where(and(eq(goals.id, goalId.data), eq(goals.userId, user.id))).limit(1);
  if (!goal) return c.json({ error: { code: "NOT_FOUND", message: "Goal not found." } }, 404);
  const [created] = await db.insert(goalMilestones).values({ userId: user.id, goalId: goalId.data, ...parsed.data, targetDate: parsed.data.targetDate ?? null }).returning();
  return c.json({ data: created }, 201);
});

milestoneRoutes.patch("/milestones/:id", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const id = Id.safeParse(c.req.param("id"));
  const parsed = Fields.partial().extend({ status: z.enum(["pending", "completed"]).optional() }).safeParse(await c.req.json().catch(() => null));
  if (!id.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) return c.json({ error: { code: "VALIDATION_ERROR", message: "Provide valid milestone changes." } }, 400);
  const data = parsed.data;
  const [updated] = await c.get("db").update(goalMilestones).set({
    ...data,
    targetDate: data.targetDate === undefined ? undefined : data.targetDate,
    completedAt: data.status === undefined ? undefined : data.status === "completed" ? new Date() : null,
    updatedAt: new Date()
  }).where(and(eq(goalMilestones.id, id.data), eq(goalMilestones.userId, user.id))).returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Milestone not found." } }, 404);
  return c.json({ data: updated });
});

milestoneRoutes.delete("/milestones/:id", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const id = Id.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "Invalid milestone ID." } }, 400);
  const [deleted] = await c.get("db").delete(goalMilestones).where(and(eq(goalMilestones.id, id.data), eq(goalMilestones.userId, user.id))).returning({ id: goalMilestones.id });
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Milestone not found." } }, 404);
  return c.body(null, 204);
});
