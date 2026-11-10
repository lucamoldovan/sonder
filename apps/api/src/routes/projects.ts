import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { CreateProjectSchema, UpdateProjectSchema, UuidSchema } from "@sonder/contracts";
import type { Database } from "../db";
import { activityLog, goals, lifeAreas, projects } from "../db/schema";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const projectRoutes = new Hono<AppEnv>();

async function validateLifeArea(
  database: Database,
  userId: string,
  lifeAreaId?: string | null
) {
  if (!lifeAreaId) return null;

  const [area] = await database.select({ id: lifeAreas.id })
    .from(lifeAreas)
    .where(and(eq(lifeAreas.id, lifeAreaId), eq(lifeAreas.userId, userId)))
    .limit(1);

  if (!area) return "The selected life area does not exist.";
  return null;
}

async function validateGoal(database: Database, userId: string, goalId?: string | null) {
  if (!goalId) return null;
  const [goal] = await database.select({ id: goals.id }).from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId))).limit(1);
  return goal ? null : "The selected goal does not exist.";
}

projectRoutes.get("/", async (context) => {
  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const db = context.get("db");
  const rows = await db.select().from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(asc(projects.name));

  return context.json({ data: rows });
});

projectRoutes.post("/", async (context) => {
  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const body: unknown = await context.req.json().catch(() => null);
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return context.json({
      error: { code: "VALIDATION_ERROR", message: "Check the project details.", issues: parsed.error.issues }
    }, 400);
  }

  const db = context.get("db");
  const relationError = await validateLifeArea(db, user.id, parsed.data.lifeAreaId) ?? await validateGoal(db, user.id, parsed.data.goalId);
  if (relationError) {
    return context.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  }

  const [created] = await db.insert(projects).values({
    userId: user.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    lifeAreaId: parsed.data.lifeAreaId ?? null,
    goalId: parsed.data.goalId ?? null,
    status: parsed.data.status,
    startDate: parsed.data.startDate ?? null,
    dueDate: parsed.data.dueDate ?? null,
    archivedAt: parsed.data.status === "archived" ? new Date() : null
  }).returning();

  await db.insert(activityLog).values({ userId: user.id, entityType: "project", entityId: created.id, action: "created", summary: `Created project “${created.name}”.` });
  return context.json({ data: created }, 201);
});

projectRoutes.patch("/:id", async (context) => {
  const parsedId = UuidSchema.safeParse(context.req.param("id"));
  if (!parsedId.success) {
    return context.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  }

  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const body: unknown = await context.req.json().catch(() => null);
  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return context.json({ error: { code: "VALIDATION_ERROR", message: "Provide valid project changes." } }, 400);
  }

  const db = context.get("db");
  const relationError = await validateLifeArea(db, user.id, parsed.data.lifeAreaId) ?? await validateGoal(db, user.id, parsed.data.goalId);
  if (relationError) {
    return context.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  }

  const updates: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
  const data = parsed.data;
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.lifeAreaId !== undefined) updates.lifeAreaId = data.lifeAreaId;
  if (data.goalId !== undefined) updates.goalId = data.goalId;
  if (data.status !== undefined) {
    updates.status = data.status;
    updates.archivedAt = data.status === "archived" ? new Date() : null;
  }
  if (data.startDate !== undefined) updates.startDate = data.startDate;
  if (data.dueDate !== undefined) updates.dueDate = data.dueDate;

  const [updated] = await db.update(projects).set(updates)
    .where(and(eq(projects.id, context.req.param("id")), eq(projects.userId, user.id)))
    .returning();

  if (!updated) {
    return context.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, 404);
  }
  await db.insert(activityLog).values({ userId: user.id, entityType: "project", entityId: updated.id, action: "updated", summary: `Updated project “${updated.name}”.` });
  return context.json({ data: updated });
});

projectRoutes.delete("/:id", async (context) => {
  const parsedId = UuidSchema.safeParse(context.req.param("id"));
  if (!parsedId.success) {
    return context.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  }

  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const db = context.get("db");
  const [deleted] = await db.delete(projects)
    .where(and(eq(projects.id, context.req.param("id")), eq(projects.userId, user.id)))
    .returning({ id: projects.id });

  if (!deleted) {
    return context.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, 404);
  }

  return context.body(null, 204);
});
