import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { NoteContentSchema } from "@sonder/contracts";
import { noteTemplates } from "../db/schema";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const noteTemplateRoutes = new Hono<AppEnv>();
const Payload = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(300).nullable().optional(),
  content: NoteContentSchema.default([])
});

noteTemplateRoutes.get("/", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const rows = await c.get("db").select().from(noteTemplates).where(eq(noteTemplates.userId, user.id)).orderBy(asc(noteTemplates.name));
  return c.json({ data: rows });
});

noteTemplateRoutes.post("/", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const parsed = Payload.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "VALIDATION_ERROR", message: "Check the template details.", issues: parsed.error.issues } }, 400);
  const [created] = await c.get("db").insert(noteTemplates).values({ userId: user.id, ...parsed.data }).returning();
  return c.json({ data: created }, 201);
});

noteTemplateRoutes.delete("/:id", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const id = z.string().uuid().safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "Invalid template ID." } }, 400);
  const [deleted] = await c.get("db").delete(noteTemplates).where(and(eq(noteTemplates.id, id.data), eq(noteTemplates.userId, user.id))).returning({ id: noteTemplates.id });
  if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Template not found." } }, 404);
  return c.body(null, 204);
});
