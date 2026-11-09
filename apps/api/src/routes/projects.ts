import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { CreateProjectSchema, UpdateProjectSchema, UuidSchema } from "@sonder/contracts";
import { createDatabase } from "../db";
import { lifeAreas, projects } from "../db/schema";
import type { Bindings } from "../env";
import { getSessionUser } from "../lib/session";

export const projectRoutes = new Hono<{ Bindings: Bindings }>();

async function validateLifeArea(
  database: ReturnType<typeof createDatabase>,
  userId: string,
  lifeAreaId?: string | null
) {
  if (!lifeAreaId) return null;

  const [area] = await database.select({ id: lifeAreas.id })
    .from(lifeAreas)
    .where(and(eq(lifeAreas.id, lifeAreaId), eq(lifeAreas.userId, userId)))
    .limit(1);

  return area ? null : "The selected life area does not exist.";
}

projectRoutes.get("/", async (context) => {
  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const db = createDatabase(context.env.DATABASE_URL);
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

  const db = createDatabase(context.env.DATABASE_URL);
  const relationError = await validateLifeArea(db, user.id, parsed.data.lifeAreaId);
  if (relationError) {
    return context.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  }

  const [created] = await db.insert(projects).values({
    userId: user.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    lifeAreaId: parsed.data.lifeAreaId ?? null,
    status: parsed.data.status,
    startDate: parsed.data.startDate ?? null,
    dueDate: parsed.data.dueDate ?? null,
    archivedAt: parsed.data.status === "archived" ? new Date() : null
  }).returning();

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

  const db = createDatabase(context.env.DATABASE_URL);
  const relationError = await validateLifeArea(db, user.id, parsed.data.lifeAreaId);
  if (relationError) {
    return context.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  }

  const updates: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
  const data = parsed.data;
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.lifeAreaId !== undefined) updates.lifeAreaId = data.lifeAreaId;
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

  const db = createDatabase(context.env.DATABASE_URL);
  const [deleted] = await db.delete(projects)
    .where(and(eq(projects.id, context.req.param("id")), eq(projects.userId, user.id)))
    .returning({ id: projects.id });

  if (!deleted) {
    return context.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, 404);
  }

  return context.body(null, 204);
});
