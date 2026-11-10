import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { CreateTaskSchema, UpdateTaskSchema, UuidSchema } from "@sonder/contracts";
import type { Database } from "../db";
import { activityLog, goals, lifeAreas, projects, taskDependencies, tasks } from "../db/schema";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const taskRoutes = new Hono<AppEnv>();

async function validateRelations(
  database: Database,
  userId: string,
  values: { lifeAreaId?: string | null; projectId?: string | null; goalId?: string | null; parentTaskId?: string | null },
  currentTaskId?: string
) {
  if (values.lifeAreaId) {
    const [area] = await database.select({ id: lifeAreas.id }).from(lifeAreas)
      .where(and(eq(lifeAreas.id, values.lifeAreaId), eq(lifeAreas.userId, userId))).limit(1);
    if (!area) return "The selected life area does not exist.";
  }
  if (values.projectId) {
    const [project] = await database.select({ id: projects.id }).from(projects)
      .where(and(eq(projects.id, values.projectId), eq(projects.userId, userId))).limit(1);
    if (!project) return "The selected project does not exist.";
  }
  if (values.goalId) {
    const [goal] = await database.select({ id: goals.id }).from(goals)
      .where(and(eq(goals.id, values.goalId), eq(goals.userId, userId))).limit(1);
    if (!goal) return "The selected goal does not exist.";
  }
  if (values.parentTaskId) {
    if (values.parentTaskId === currentTaskId) return "A task cannot be its own parent.";
    const rows = await database.select({ id: tasks.id, parentTaskId: tasks.parentTaskId })
      .from(tasks).where(eq(tasks.userId, userId));
    const parents = new Map(rows.map(row => [row.id, row.parentTaskId]));
    if (!parents.has(values.parentTaskId)) return "The parent task does not exist.";
    const visited = new Set<string>();
    let cursor: string | null = values.parentTaskId;
    while (cursor) {
      if (cursor === currentTaskId) return "That parent would create a subtask cycle.";
      if (visited.has(cursor)) return "The existing task hierarchy contains a cycle.";
      visited.add(cursor);
      cursor = parents.get(cursor) ?? null;
    }
  }
  return null;
}

function nextOccurrence(task: typeof tasks.$inferSelect) {
  if (!task.recurrenceFrequency || !task.dueAt) return null;
  const next = new Date(task.dueAt);
  if (task.recurrenceFrequency === "daily") next.setDate(next.getDate() + task.recurrenceInterval);
  if (task.recurrenceFrequency === "weekly") next.setDate(next.getDate() + 7 * task.recurrenceInterval);
  if (task.recurrenceFrequency === "monthly") {
    const originalDay = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + task.recurrenceInterval);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDay));
  }
  if (task.recurrenceUntil && next.toISOString().slice(0, 10) > task.recurrenceUntil) return null;
  const reminderAt = task.reminderAt && task.dueAt
    ? new Date(next.getTime() - (task.dueAt.getTime() - task.reminderAt.getTime()))
    : null;
  return { dueAt: next, reminderAt };
}

taskRoutes.get("/", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const rows = await c.get("db").select().from(tasks).where(eq(tasks.userId, user.id)).orderBy(desc(tasks.createdAt));
  return c.json({ data: rows });
});

taskRoutes.post("/", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = CreateTaskSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "VALIDATION_ERROR", message: "Check the task details.", issues: parsed.error.issues } }, 400);
  const db = c.get("db");
  const relationError = await validateRelations(db, user.id, parsed.data);
  if (relationError) return c.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  const data = parsed.data;
  const [created] = await db.insert(tasks).values({
    userId: user.id,
    title: data.title,
    description: data.description ?? null,
    lifeAreaId: data.lifeAreaId ?? null,
    projectId: data.projectId ?? null,
    goalId: data.goalId ?? null,
    parentTaskId: data.parentTaskId ?? null,
    status: data.status,
    priority: data.priority,
    dueAt: data.dueAt ? new Date(data.dueAt) : null,
    reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
    recurrenceFrequency: data.recurrenceFrequency ?? null,
    recurrenceInterval: data.recurrenceInterval ?? 1,
    recurrenceUntil: data.recurrenceUntil ?? null,
    estimateMinutes: data.estimateMinutes ?? null
  }).returning();
  await db.insert(activityLog).values({ userId: user.id, entityType: "task", entityId: created.id, action: "created", summary: `Created task “${created.title}”.` });
  return c.json({ data: created }, 201);
});

taskRoutes.get("/:id/dependencies", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const db = c.get("db");
  const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, id.data), eq(tasks.userId, user.id))).limit(1);
  if (!task) return c.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, 404);
  const rows = await db.select().from(taskDependencies).where(and(eq(taskDependencies.userId, user.id), eq(taskDependencies.taskId, id.data)));
  const dependentRows = await db.select().from(taskDependencies).where(and(eq(taskDependencies.userId, user.id), eq(taskDependencies.dependsOnTaskId, id.data)));
  return c.json({ data: rows, blockedBy: rows.map(row => row.dependsOnTaskId), blocking: dependentRows.map(row => row.taskId) });
});

taskRoutes.post("/:id/dependencies", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const body = await c.req.json().catch(() => ({})) as { dependsOnTaskId?: string };
  const dependencyId = UuidSchema.safeParse(body.dependsOnTaskId);
  if (!dependencyId.success || dependencyId.data === id.data) return c.json({ error: { code: "INVALID_DEPENDENCY", message: "Choose a different valid task." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const db = c.get("db");
  const owned = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.userId, user.id)));
  const ownedIds = new Set(owned.map(row => row.id));
  if (!ownedIds.has(id.data) || !ownedIds.has(dependencyId.data)) return c.json({ error: { code: "INVALID_RELATION", message: "Both tasks must belong to your account." } }, 400);
  const edges = await db.select({ taskId: taskDependencies.taskId, dependsOnTaskId: taskDependencies.dependsOnTaskId }).from(taskDependencies).where(eq(taskDependencies.userId, user.id));
  const graph = new Map<string, string[]>();
  for (const edge of edges) graph.set(edge.taskId, [...(graph.get(edge.taskId) ?? []), edge.dependsOnTaskId]);
  const stack = [dependencyId.data];
  const visited = new Set<string>();
  while (stack.length) {
    const current = stack.pop()!;
    if (current === id.data) return c.json({ error: { code: "DEPENDENCY_CYCLE", message: "That dependency would create a cycle." } }, 409);
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...(graph.get(current) ?? []));
  }
  const [created] = await db.insert(taskDependencies).values({ userId: user.id, taskId: id.data, dependsOnTaskId: dependencyId.data }).onConflictDoNothing().returning();
  return c.json({ data: created ?? null }, created ? 201 : 200);
});

taskRoutes.delete("/:id/dependencies/:dependencyId", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  const dependencyId = UuidSchema.safeParse(c.req.param("dependencyId"));
  if (!id.success || !dependencyId.success) return c.json({ error: { code: "INVALID_ID", message: "Provide valid task IDs." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  await c.get("db").delete(taskDependencies).where(and(eq(taskDependencies.userId, user.id), eq(taskDependencies.taskId, id.data), eq(taskDependencies.dependsOnTaskId, dependencyId.data)));
  return c.body(null, 204);
});

taskRoutes.patch("/:id", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = UpdateTaskSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return c.json({ error: { code: "VALIDATION_ERROR", message: "Provide valid task changes." } }, 400);
  const db = c.get("db");
  const relationError = await validateRelations(db, user.id, parsed.data, id.data);
  if (relationError) return c.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  const [existing] = await db.select().from(tasks).where(and(eq(tasks.id, id.data), eq(tasks.userId, user.id))).limit(1);
  if (!existing) return c.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, 404);
  const data = parsed.data;
  const updates: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.lifeAreaId !== undefined) updates.lifeAreaId = data.lifeAreaId;
  if (data.projectId !== undefined) updates.projectId = data.projectId;
  if (data.goalId !== undefined) updates.goalId = data.goalId;
  if (data.parentTaskId !== undefined) updates.parentTaskId = data.parentTaskId;
  if (data.status !== undefined) updates.status = data.status;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.dueAt !== undefined) updates.dueAt = data.dueAt ? new Date(data.dueAt) : null;
  if (data.reminderAt !== undefined) updates.reminderAt = data.reminderAt ? new Date(data.reminderAt) : null;
  if (data.recurrenceFrequency !== undefined) updates.recurrenceFrequency = data.recurrenceFrequency;
  if (data.recurrenceInterval !== undefined) updates.recurrenceInterval = data.recurrenceInterval;
  if (data.recurrenceUntil !== undefined) updates.recurrenceUntil = data.recurrenceUntil;
  if (data.estimateMinutes !== undefined) updates.estimateMinutes = data.estimateMinutes;
  if (data.status === "done") updates.completedAt = new Date();
  if (data.status && data.status !== "done") updates.completedAt = null;
  const [updated] = await db.update(tasks).set(updates).where(and(eq(tasks.id, id.data), eq(tasks.userId, user.id))).returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, 404);
  let nextTask = null;
  if (data.status === "done" && existing.status !== "done") {
    const next = nextOccurrence(updated);
    if (next) {
      const [created] = await db.insert(tasks).values({
        userId: user.id,
        title: updated.title,
        description: updated.description,
        lifeAreaId: updated.lifeAreaId,
        projectId: updated.projectId,
        goalId: updated.goalId,
        parentTaskId: updated.parentTaskId,
        status: "todo",
        priority: updated.priority,
        dueAt: next.dueAt,
        reminderAt: next.reminderAt,
        recurrenceFrequency: updated.recurrenceFrequency,
        recurrenceInterval: updated.recurrenceInterval,
        recurrenceUntil: updated.recurrenceUntil,
        estimateMinutes: updated.estimateMinutes
      }).returning();
      nextTask = created;
    }
  }
  await db.insert(activityLog).values({ userId: user.id, entityType: "task", entityId: updated.id, action: data.status === "done" ? "completed" : "updated", summary: data.status === "done" ? `Completed “${updated.title}”.` : `Updated “${updated.title}”.` });
  return c.json({ data: updated, nextOccurrence: nextTask });
});

taskRoutes.delete("/:id", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const db = c.get("db");
  const [existing] = await db.select({ title: tasks.title }).from(tasks).where(and(eq(tasks.id, id.data), eq(tasks.userId, user.id))).limit(1);
  if (!existing) return c.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, 404);
  await db.delete(tasks).where(and(eq(tasks.id, id.data), eq(tasks.userId, user.id)));
  await db.insert(activityLog).values({ userId: user.id, entityType: "task", entityId: id.data, action: "deleted", summary: `Deleted “${existing.title}”.` });
  return c.body(null, 204);
});
