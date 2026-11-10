import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import {
  CreateInboxItemSchema,
  CreateTaskSchema,
  UpdateInboxItemSchema,
  UuidSchema
} from "@sonder/contracts";
import { activityLog, calendarEvents, inboxItems, notes, tasks } from "../db/schema";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const inboxRoutes = new Hono<AppEnv>();

inboxRoutes.get("/", async (context) => {
  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const status = context.req.query("status");
  if (status && !["inbox", "processed", "archived"].includes(status)) {
    return context.json({ error: { code: "INVALID_STATUS", message: "Unknown inbox status." } }, 400);
  }

  const db = context.get("db");
  const rows = await db.select().from(inboxItems)
    .where(status
      ? and(eq(inboxItems.userId, user.id), eq(inboxItems.status, status))
      : eq(inboxItems.userId, user.id))
    .orderBy(desc(inboxItems.createdAt));

  return context.json({ data: rows });
});

inboxRoutes.post("/", async (context) => {
  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const body: unknown = await context.req.json().catch(() => null);
  const parsed = CreateInboxItemSchema.safeParse(body);
  if (!parsed.success) {
    return context.json({
      error: { code: "VALIDATION_ERROR", message: "Check the inbox item.", issues: parsed.error.issues }
    }, 400);
  }

  const db = context.get("db");
  const [created] = await db.insert(inboxItems).values({
    userId: user.id,
    type: parsed.data.type,
    title: parsed.data.title,
    content: parsed.data.content ?? null,
    url: parsed.data.url ?? null
  }).returning();

  return context.json({ data: created }, 201);
});

inboxRoutes.patch("/:id", async (context) => {
  const id = UuidSchema.safeParse(context.req.param("id"));
  if (!id.success) {
    return context.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  }

  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const body: unknown = await context.req.json().catch(() => null);
  const parsed = UpdateInboxItemSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return context.json({ error: { code: "VALIDATION_ERROR", message: "Provide valid inbox changes." } }, 400);
  }

  const updates: Partial<typeof inboxItems.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.content !== undefined) updates.content = parsed.data.content;
  if (parsed.data.url !== undefined) updates.url = parsed.data.url;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  const db = context.get("db");
  const [updated] = await db.update(inboxItems).set(updates)
    .where(and(eq(inboxItems.id, id.data), eq(inboxItems.userId, user.id)))
    .returning();

  if (!updated) {
    return context.json({ error: { code: "NOT_FOUND", message: "Inbox item not found." } }, 404);
  }

  return context.json({ data: updated });
});

inboxRoutes.post("/:id/convert-to-task", async (context) => {
  const id = UuidSchema.safeParse(context.req.param("id"));
  if (!id.success) {
    return context.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  }

  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const db = context.get("db");
  const [item] = await db.select().from(inboxItems)
    .where(and(eq(inboxItems.id, id.data), eq(inboxItems.userId, user.id)))
    .limit(1);

  if (!item) {
    return context.json({ error: { code: "NOT_FOUND", message: "Inbox item not found." } }, 404);
  }
  if (item.convertedTaskId) {
    return context.json({ error: { code: "ALREADY_CONVERTED", message: "This item has already been converted." } }, 409);
  }

  const taskInput = CreateTaskSchema.safeParse({
    title: item.title,
    description: item.content,
    status: "todo",
    priority: "medium"
  });
  if (!taskInput.success) {
    return context.json({ error: { code: "INVALID_TASK", message: "This item cannot be converted into a task." } }, 400);
  }

  const [task] = await db.insert(tasks).values({
    userId: user.id,
    title: taskInput.data.title,
    description: taskInput.data.description ?? null,
    status: "todo",
    priority: "medium"
  }).returning();

  // Claim the inbox item only if it is still unprocessed. This guards against
  // double taps/racing requests creating multiple tasks with Neon HTTP (no transaction).
  const [updated] = await db.update(inboxItems).set({
    status: "processed",
    convertedTaskId: task.id,
    updatedAt: new Date()
  }).where(and(
    eq(inboxItems.id, item.id),
    eq(inboxItems.userId, user.id),
    eq(inboxItems.status, "inbox"),
    isNull(inboxItems.convertedTaskId)
  )).returning();

  if (!updated) {
    // Another request won the conversion race; remove this request's orphan task.
    await db.delete(tasks).where(and(eq(tasks.id, task.id), eq(tasks.userId, user.id)));
    return context.json({
      error: { code: "ALREADY_CONVERTED", message: "This item has already been processed." }
    }, 409);
  }

  return context.json({ data: { inboxItem: updated, task } }, 201);
});


inboxRoutes.post("/:id/convert-to-note", async (context) => {
  const id = UuidSchema.safeParse(context.req.param("id"));
  if (!id.success) return context.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(context);
  if (!user) return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const db = context.get("db");
  const [item] = await db.select().from(inboxItems).where(and(eq(inboxItems.id, id.data), eq(inboxItems.userId, user.id))).limit(1);
  if (!item) return context.json({ error: { code: "NOT_FOUND", message: "Inbox item not found." } }, 404);
  if (item.status !== "inbox") return context.json({ error: { code: "ALREADY_PROCESSED", message: "This item has already been processed." } }, 409);
  const [note] = await db.insert(notes).values({
    userId: user.id,
    title: item.title,
    content: item.content ? [{ id: crypto.randomUUID(), type: "paragraph", text: item.content }] : [],
    tags: item.type === "idea" ? ["idea"] : []
  }).returning();
  const [updated] = await db.update(inboxItems).set({ status: "processed", updatedAt: new Date() })
    .where(and(eq(inboxItems.id, id.data), eq(inboxItems.userId, user.id), eq(inboxItems.status, "inbox"))).returning();
  if (!updated) {
    await db.delete(notes).where(and(eq(notes.id, note.id), eq(notes.userId, user.id)));
    return context.json({ error: { code: "ALREADY_PROCESSED", message: "This item has already been processed." } }, 409);
  }
  await db.insert(activityLog).values({ userId: user.id, entityType: "note", entityId: note.id, action: "created", summary: `Created note “${note.title}” from Inbox.` });
  return context.json({ data: { inboxItem: updated, note } }, 201);
});


inboxRoutes.post("/:id/convert-to-event", async (context) => {
  const id = UuidSchema.safeParse(context.req.param("id"));
  if (!id.success) return context.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  const user = await getSessionUser(context);
  if (!user) return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const body = await context.req.json().catch(() => null) as { startsAt?: string; endsAt?: string | null; allDay?: boolean; location?: string | null } | null;
  const startsAt = body?.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body?.endsAt ? new Date(body.endsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt < startsAt))) {
    return context.json({ error: { code: "INVALID_EVENT_TIME", message: "Provide a valid start time and an end time after it." } }, 400);
  }
  const db = context.get("db");
  const [item] = await db.select().from(inboxItems).where(and(eq(inboxItems.id, id.data), eq(inboxItems.userId, user.id))).limit(1);
  if (!item) return context.json({ error: { code: "NOT_FOUND", message: "Inbox item not found." } }, 404);
  if (item.status !== "inbox") return context.json({ error: { code: "ALREADY_PROCESSED", message: "This item has already been processed." } }, 409);
  const [event] = await db.insert(calendarEvents).values({
    userId: user.id,
    title: item.title,
    description: item.content,
    startsAt,
    endsAt,
    allDay: Boolean(body?.allDay),
    location: body?.location ?? null
  }).returning();
  const [updated] = await db.update(inboxItems).set({ status: "processed", updatedAt: new Date() })
    .where(and(eq(inboxItems.id, id.data), eq(inboxItems.userId, user.id), eq(inboxItems.status, "inbox"))).returning();
  if (!updated) {
    await db.delete(calendarEvents).where(and(eq(calendarEvents.id, event.id), eq(calendarEvents.userId, user.id)));
    return context.json({ error: { code: "ALREADY_PROCESSED", message: "This item has already been processed." } }, 409);
  }
  await db.insert(activityLog).values({ userId: user.id, entityType: "event", entityId: event.id, action: "created", summary: `Created calendar event “${event.title}” from Inbox.` });
  return context.json({ data: { inboxItem: updated, event } }, 201);
});

inboxRoutes.delete("/:id", async (context) => {
  const id = UuidSchema.safeParse(context.req.param("id"));
  if (!id.success) {
    return context.json({ error: { code: "INVALID_ID", message: "The record ID must be a valid UUID." } }, 400);
  }

  const user = await getSessionUser(context);
  if (!user) {
    return context.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  }

  const db = context.get("db");
  const [deleted] = await db.delete(inboxItems)
    .where(and(eq(inboxItems.id, id.data), eq(inboxItems.userId, user.id)))
    .returning({ id: inboxItems.id });

  if (!deleted) {
    return context.json({ error: { code: "NOT_FOUND", message: "Inbox item not found." } }, 404);
  }

  return context.body(null, 204);
});
