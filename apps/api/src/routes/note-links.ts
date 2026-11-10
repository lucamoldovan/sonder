import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { notes } from "../db/schema";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const noteLinkRoutes = new Hono<AppEnv>();
noteLinkRoutes.get("/:id/backlinks", async c => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const id = z.string().uuid().safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: { code: "INVALID_ID", message: "Invalid note ID." } }, 400);
  const db = c.get("db");
  const [target] = await db.select({ id: notes.id }).from(notes).where(and(eq(notes.id, id.data), eq(notes.userId, user.id), isNull(notes.archivedAt))).limit(1);
  if (!target) return c.json({ error: { code: "NOT_FOUND", message: "Note not found." } }, 404);
  const rows = await db.select({ id: notes.id, title: notes.title, content: notes.content, updatedAt: notes.updatedAt }).from(notes)
    .where(and(eq(notes.userId, user.id), isNull(notes.archivedAt)));
  const marker = new RegExp("\\[\\[note:" + id.data + "\\]\\]", "i");
  return c.json({ data: rows.filter(row => row.id !== id.data && JSON.stringify(row.content).match(marker)).map(row => ({ id: row.id, title: row.title, updatedAt: row.updatedAt })) });
});
