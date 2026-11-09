import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { CreateTaskSchema, UpdateTaskSchema, UuidSchema } from "@sonder/contracts";
import { createDatabase } from "../db";
import { lifeAreas, projects, tasks } from "../db/schema";
import type { Bindings } from "../env";
import { getSessionUser } from "../lib/session";

export const taskRoutes = new Hono<{ Bindings: Bindings }>();

async function validateRelations(
  database: ReturnType<typeof createDatabase>,
  userId: string,
  lifeAreaId?: string | null,
  projectId?: string | null
) {
  if (lifeAreaId) {
    const [area] = await database.select({ id: lifeAreas.id })
      .from(lifeAreas)
      .where(and(eq(lifeAreas.id, lifeAreaId), eq(lifeAreas.userId, userId)))
      .limit(1);
    if (!area) return "The selected life area does not exist.";
  }

  if (projectId) {
    const [project] = await database.select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);
    if (!project) return "The selected project does not exist.";
  }

  return null;
}

taskRoutes.get("/", async (context) => {
  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const db = createDatabase(context.env.DATABASE_URL);
  const rows = await db.select().from(tasks)
    .where(eq(tasks.userId, user.id))
    .orderBy(desc(tasks.createdAt));

  return context.json({ data: rows });
});

taskRoutes.post("/", async (context) => {
  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const body: unknown = await context.req.json().catch(() => null);
  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return context.json({
      error: { code: "VALIDATION_ERROR", message: "Check the task details.", issues: parsed.error.issues }
    }, 400);
  }

  const db = createDatabase(context.env.DATABASE_URL);
  const relationError = await validateRelations(
    db, user.id, parsed.data.lifeAreaId, parsed.data.projectId
  );
  if (relationError) {
    return context.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  }

  const [created] = await db.insert(tasks).values({
    userId: user.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    lifeAreaId: parsed.data.lifeAreaId ?? null,
    projectId: parsed.data.projectId ?? null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    estimateMinutes: parsed.data.estimateMinutes ?? null
  }).returning();

  return context.json({ data: created }, 201);
});

taskRoutes.patch("/:id", async (context) => {
  const parsedId = UuidSchema.safeParse(context.req.param("id"));
  if (!parsedId.success) {
    return context.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  }

  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const body: unknown = await context.req.json().catch(() => null);
  const parsed = UpdateTaskSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return context.json({ error: { code: "VALIDATION_ERROR", message: "Provide valid task changes." } }, 400);
  }

  const db = createDatabase(context.env.DATABASE_URL);
  const relationError = await validateRelations(
    db, user.id, parsed.data.lifeAreaId, parsed.data.projectId
  );
  if (relationError) {
    return context.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  }

  const updates: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
  const data = parsed.data;
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.lifeAreaId !== undefined) updates.lifeAreaId = data.lifeAreaId;
  if (data.projectId !== undefined) updates.projectId = data.projectId;
  if (data.status !== undefined) updates.status = data.status;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.dueAt !== undefined) updates.dueAt = data.dueAt ? new Date(data.dueAt) : null;
  if (data.estimateMinutes !== undefined) updates.estimateMinutes = data.estimateMinutes;

  if (data.status === "done") updates.completedAt = new Date();
  if (data.status && data.status !== "done") updates.completedAt = null;

  const [updated] = await db.update(tasks).set(updates)
    .where(and(eq(tasks.id, context.req.param("id")), eq(tasks.userId, user.id)))
    .returning();

  if (!updated) {
    return context.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, 404);
  }

  return context.json({ data: updated });
});

taskRoutes.delete("/:id", async (context) => {
  const parsedId = UuidSchema.safeParse(context.req.param("id"));
  if (!parsedId.success) {
    return context.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  }

  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const db = createDatabase(context.env.DATABASE_URL);
  const [deleted] = await db.delete(tasks)
    .where(and(eq(tasks.id, context.req.param("id")), eq(tasks.userId, user.id)))
    .returning({ id: tasks.id });

  if (!deleted) {
    return context.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, 404);
  }

  return context.body(null, 204);
});
