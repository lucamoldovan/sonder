import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { CreateLifeAreaSchema, UpdateLifeAreaSchema, UuidSchema } from "@sonder/contracts";
import { createDatabase } from "../db";
import { lifeAreas } from "../db/schema";
import type { Bindings } from "../env";
import { getSessionUser } from "../lib/session";

export const lifeAreaRoutes = new Hono<{ Bindings: Bindings }>();

lifeAreaRoutes.get("/", async (context) => {
  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const db = createDatabase(context.env.DATABASE_URL);
  const rows = await db
    .select()
    .from(lifeAreas)
    .where(eq(lifeAreas.userId, user.id))
    .orderBy(asc(lifeAreas.position), asc(lifeAreas.name));

  return context.json({ data: rows });
});

lifeAreaRoutes.post("/", async (context) => {
  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const body: unknown = await context.req.json().catch(() => null);
  const parsed = CreateLifeAreaSchema.safeParse(body);
  if (!parsed.success) {
    return context.json({
      error: { code: "VALIDATION_ERROR", message: "Check the life area details.", issues: parsed.error.issues }
    }, 400);
  }

  const slug = parsed.data.name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `area-${crypto.randomUUID().slice(0, 8)}`;

  const db = createDatabase(context.env.DATABASE_URL);
  const [created] = await db.insert(lifeAreas).values({
    userId: user.id,
    name: parsed.data.name,
    slug,
    color: parsed.data.color,
    icon: parsed.data.icon ?? null,
    position: parsed.data.position
  }).onConflictDoNothing().returning();

  if (created) return context.json({ data: created }, 201);

  const [existing] = await db.select().from(lifeAreas)
    .where(and(eq(lifeAreas.userId, user.id), eq(lifeAreas.slug, slug)))
    .limit(1);
  return context.json({ data: existing }, 200);
});

lifeAreaRoutes.patch("/:id", async (context) => {
  const parsedId = UuidSchema.safeParse(context.req.param("id"));
  if (!parsedId.success) {
    return context.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  }

  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const body: unknown = await context.req.json().catch(() => null);
  const parsed = UpdateLifeAreaSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return context.json({ error: { code: "VALIDATION_ERROR", message: "Provide valid changes." } }, 400);
  }

  const db = createDatabase(context.env.DATABASE_URL);
  const updates: Partial<typeof lifeAreas.$inferInsert> = {
    ...parsed.data,
    updatedAt: new Date()
  };
  if (parsed.data.name) {
    updates.slug = parsed.data.name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `area-${crypto.randomUUID().slice(0, 8)}`;
  }

  const [updated] = await db.update(lifeAreas)
    .set(updates)
    .where(and(eq(lifeAreas.id, context.req.param("id")), eq(lifeAreas.userId, user.id)))
    .returning();

  if (!updated) {
    return context.json({ error: { code: "NOT_FOUND", message: "Life area not found." } }, 404);
  }

  return context.json({ data: updated });
});

lifeAreaRoutes.delete("/:id", async (context) => {
  const parsedId = UuidSchema.safeParse(context.req.param("id"));
  if (!parsedId.success) {
    return context.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  }

  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const db = createDatabase(context.env.DATABASE_URL);
  const [deleted] = await db.delete(lifeAreas)
    .where(and(eq(lifeAreas.id, context.req.param("id")), eq(lifeAreas.userId, user.id)))
    .returning({ id: lifeAreas.id });

  if (!deleted) {
    return context.json({ error: { code: "NOT_FOUND", message: "Life area not found." } }, 404);
  }

  return context.body(null, 204);
});
