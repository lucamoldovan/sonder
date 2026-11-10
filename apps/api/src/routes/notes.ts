import { and, desc, eq, ilike, or, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { CreateNoteSchema, UpdateNoteSchema, UuidSchema } from "@sonder/contracts";
import { lifeAreas, notes, projects } from "../db/schema";
import type { Database } from "../db";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const noteRoutes = new Hono<AppEnv>();

async function validateRelations(db: Database, userId: string, data: { parentId?: string | null; lifeAreaId?: string | null; projectId?: string | null }, noteId?: string) {
  if (data.parentId) {
    if (data.parentId === noteId) return "A page cannot be its own parent.";
    const [parent] = await db.select({ id: notes.id }).from(notes)
      .where(and(eq(notes.id, data.parentId), eq(notes.userId, userId), isNull(notes.archivedAt))).limit(1);
    if (!parent) return "The parent page does not exist.";
  }
  if (data.lifeAreaId) {
    const [area] = await db.select({ id: lifeAreas.id }).from(lifeAreas)
      .where(and(eq(lifeAreas.id, data.lifeAreaId), eq(lifeAreas.userId, userId))).limit(1);
    if (!area) return "The selected life area does not exist.";
  }
  if (data.projectId) {
    const [project] = await db.select({ id: projects.id }).from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId))).limit(1);
    if (!project) return "The selected project does not exist.";
  }
  return null;
}

noteRoutes.get("/", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const query = c.req.query("q")?.trim();
  const archived = c.req.query("archived") === "true";
  const conditions = [eq(notes.userId, user.id), ...(archived ? [] : [isNull(notes.archivedAt)])];
  const where = query
    ? and(...conditions, or(ilike(notes.title, `%${query}%`), sql`${notes.content}::text ILIKE ${`%${query}%`}`))
    : and(...conditions);
  const rows = await c.get("db").select().from(notes).where(where).orderBy(desc(notes.favorite), desc(notes.updatedAt));
  return c.json({ data: rows });
});

noteRoutes.post("/", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = CreateNoteSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "VALIDATION_ERROR", message: "Check the page details.", issues: parsed.error.issues } }, 400);
  const db = c.get("db");
  const relationError = await validateRelations(db, user.id, parsed.data);
  if (relationError) return c.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  const [created] = await db.insert(notes).values({
    userId: user.id,
    title: parsed.data.title,
    content: parsed.data.content ?? [],
    parentId: parsed.data.parentId ?? null,
    lifeAreaId: parsed.data.lifeAreaId ?? null,
    projectId: parsed.data.projectId ?? null,
    icon: parsed.data.icon ?? "📝",
    tags: parsed.data.tags ?? []
  }).returning();
  return c.json({ data: created }, 201);
});

noteRoutes.patch("/:id", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The page ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = UpdateNoteSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return c.json({ error: { code: "VALIDATION_ERROR", message: "Provide valid page changes." } }, 400);
  const db = c.get("db");
  const data = parsed.data;
  const relationError = await validateRelations(db, user.id, data, id.data);
  if (relationError) return c.json({ error: { code: "INVALID_RELATION", message: relationError } }, 400);
  const updates: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() };
  if (data.title !== undefined) updates.title = data.title;
  if (data.content !== undefined) updates.content = data.content;
  if (data.parentId !== undefined) updates.parentId = data.parentId;
  if (data.lifeAreaId !== undefined) updates.lifeAreaId = data.lifeAreaId;
  if (data.projectId !== undefined) updates.projectId = data.projectId;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.tags !== undefined) updates.tags = data.tags;
  if (data.favorite !== undefined) updates.favorite = data.favorite;
  if (data.archived !== undefined) updates.archivedAt = data.archived ? new Date() : null;
  const [updated] = await db.update(notes).set(updates)
    .where(and(eq(notes.id, id.data), eq(notes.userId, user.id))).returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Page not found." } }, 404);
  return c.json({ data: updated });
});

noteRoutes.delete("/:id", async (c) => {
  const id = UuidSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "The page ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const [deleted] = await c.get("db").delete(notes)
    .where(and(eq(notes.id, id.data), eq(notes.userId, user.id))).returning({ id: notes.id });
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Page not found." } }, 404);
  return c.body(null, 204);
});
