import { and, desc, eq, gte } from "drizzle-orm";
import { Hono } from "hono";
import { focusSessions, habitEntries, habits, goals, goalMilestones, inboxItems, lifeAreas, moodEntries, notes, noteTemplates, projects, tasks, calendarEvents, timeBlocks } from "../db/schema";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const personalRoutes = new Hono<AppEnv>();

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

personalRoutes.get("/wellbeing", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const rows = await c.get("db").select().from(moodEntries).where(eq(moodEntries.userId, user.id)).orderBy(desc(moodEntries.entryDate)).limit(180);
  return c.json({ data: rows });
});

personalRoutes.post("/wellbeing", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const body = await c.req.json().catch(() => null) as null | {
    entryDate?: string; mood?: number; energy?: number; stress?: number; sleepMinutes?: number | null; journal?: string | null;
  };
  const date = body?.entryDate ?? new Date().toISOString().slice(0, 10);
  if (!body || !validDate(date) || !Number.isInteger(body.mood) || body.mood! < 1 || body.mood! > 5 ||
      !Number.isInteger(body.energy) || body.energy! < 1 || body.energy! > 5 ||
      !Number.isInteger(body.stress) || body.stress! < 1 || body.stress! > 5 ||
      (body.sleepMinutes != null && (!Number.isInteger(body.sleepMinutes) || body.sleepMinutes < 0 || body.sleepMinutes > 1440)) ||
      (body.journal != null && (typeof body.journal !== "string" || body.journal.length > 10000))) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Add a valid date and ratings from 1 to 5." } }, 400);
  }
  const values = { userId: user.id, entryDate: date, mood: body.mood!, energy: body.energy!, stress: body.stress!, sleepMinutes: body.sleepMinutes ?? null, journal: body.journal?.trim() || null, updatedAt: new Date() };
  const [saved] = await c.get("db").insert(moodEntries).values(values)
    .onConflictDoUpdate({ target: [moodEntries.userId, moodEntries.entryDate], set: { mood: values.mood, energy: values.energy, stress: values.stress, sleepMinutes: values.sleepMinutes, journal: values.journal, updatedAt: values.updatedAt } })
    .returning();
  return c.json({ data: saved });
});

personalRoutes.delete("/wellbeing/:date", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const date = c.req.param("date");
  if (!validDate(date)) return c.json({ error: { code: "INVALID_DATE", message: "Use YYYY-MM-DD." } }, 400);
  await c.get("db").delete(moodEntries).where(and(eq(moodEntries.userId, user.id), eq(moodEntries.entryDate, date)));
  return c.body(null, 204);
});

personalRoutes.get("/focus", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const rows = await c.get("db").select().from(focusSessions).where(eq(focusSessions.userId, user.id)).orderBy(desc(focusSessions.startedAt)).limit(100);
  return c.json({ data: rows });
});

personalRoutes.post("/focus", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const body = await c.req.json().catch(() => null) as null | { taskId?: string | null; plannedMinutes?: number };
  if (!body || !Number.isInteger(body.plannedMinutes) || body.plannedMinutes! < 1 || body.plannedMinutes! > 240) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Choose a focus duration between 1 and 240 minutes." } }, 400);
  }
  const db = c.get("db");
  if (body.taskId) {
    const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, body.taskId), eq(tasks.userId, user.id))).limit(1);
    if (!task) return c.json({ error: { code: "INVALID_RELATION", message: "That task does not belong to your account." } }, 400);
  }
  const [active] = await db.select({ id: focusSessions.id }).from(focusSessions).where(and(eq(focusSessions.userId, user.id), eq(focusSessions.status, "active"))).limit(1);
  if (active) return c.json({ error: { code: "SESSION_ACTIVE", message: "Finish your current focus session first." } }, 409);
  const [created] = await db.insert(focusSessions).values({ userId: user.id, taskId: body.taskId ?? null, plannedMinutes: body.plannedMinutes! }).returning();
  return c.json({ data: created }, 201);
});

personalRoutes.patch("/focus/:id", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const body = await c.req.json().catch(() => null) as null | { status?: "completed" | "abandoned"; note?: string | null };
  if (!body || !["completed", "abandoned"].includes(body.status ?? "") || (body.note != null && (typeof body.note !== "string" || body.note.length > 2000))) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Choose completed or abandoned." } }, 400);
  }
  const db = c.get("db");
  const [session] = await db.select().from(focusSessions).where(and(eq(focusSessions.id, c.req.param("id")), eq(focusSessions.userId, user.id))).limit(1);
  if (!session) return c.json({ error: { code: "NOT_FOUND", message: "Focus session not found." } }, 404);
  if (session.status !== "active") return c.json({ error: { code: "SESSION_FINISHED", message: "This session has already ended." } }, 409);
  const endedAt = new Date();
  const actualMinutes = Math.max(0, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000));
  const [updated] = await db.update(focusSessions).set({ status: body.status, endedAt, actualMinutes, note: body.note?.trim() || null }).where(and(eq(focusSessions.id, session.id), eq(focusSessions.userId, user.id))).returning();
  return c.json({ data: updated });
});

personalRoutes.get("/insights", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const requestedDays = Number(c.req.query("days") ?? 30);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  const fromDate = from.toISOString().slice(0, 10);
  const db = c.get("db");
  const [taskRows, habitRows, focusRows, moodRows, goalRows, areaRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.userId, user.id)),
    db.select().from(habitEntries).where(and(eq(habitEntries.userId, user.id), gte(habitEntries.entryDate, fromDate))),
    db.select().from(focusSessions).where(and(eq(focusSessions.userId, user.id), gte(focusSessions.startedAt, from))),
    db.select().from(moodEntries).where(and(eq(moodEntries.userId, user.id), gte(moodEntries.entryDate, fromDate))).orderBy(desc(moodEntries.entryDate)),
    db.select().from(goals).where(eq(goals.userId, user.id)),
    db.select().from(lifeAreas).where(eq(lifeAreas.userId, user.id))
  ]);
  const completedTasks = taskRows.filter(task => task.status === "done" && task.completedAt && task.completedAt >= from);
  const completedFocus = focusRows.filter(session => session.status === "completed");
  const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null;
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(from); date.setDate(from.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      tasksCompleted: completedTasks.filter(task => task.completedAt?.toISOString().slice(0, 10) === key).length,
      focusMinutes: completedFocus.filter(session => session.endedAt?.toISOString().slice(0, 10) === key).reduce((sum, session) => sum + (session.actualMinutes ?? 0), 0),
      habitCheckins: habitRows.filter(entry => entry.entryDate === key).length
    };
  });
  return c.json({ data: {
    days,
    tasksCompleted: completedTasks.length,
    openTasks: taskRows.filter(task => !["done", "cancelled"].includes(task.status)).length,
    habitCheckins: habitRows.length,
    focusSessions: completedFocus.length,
    focusMinutes: completedFocus.reduce((sum, session) => sum + (session.actualMinutes ?? 0), 0),
    averageMood: average(moodRows.map(row => row.mood)),
    averageEnergy: average(moodRows.map(row => row.energy)),
    averageStress: average(moodRows.map(row => row.stress)),
    averageSleepMinutes: average(moodRows.flatMap(row => row.sleepMinutes == null ? [] : [row.sleepMinutes])),
    activeGoals: goalRows.filter(goal => goal.status === "active").length,
    areas: areaRows.map(area => ({ id: area.id, name: area.name, color: area.color, completedTasks: completedTasks.filter(task => task.lifeAreaId === area.id).length })),
    moodHistory: moodRows,
    daily
  } });
});

personalRoutes.get("/export/data", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const db = c.get("db");
  const [areaRows, projectRows, taskRows, inboxRows, goalRows, habitRows, habitEntryRows, eventRows, noteRows, blockRows, templateRows, milestoneRows, moodRows, focusRows] = await Promise.all([
    db.select().from(lifeAreas).where(eq(lifeAreas.userId, user.id)),
    db.select().from(projects).where(eq(projects.userId, user.id)),
    db.select().from(tasks).where(eq(tasks.userId, user.id)),
    db.select().from(inboxItems).where(eq(inboxItems.userId, user.id)),
    db.select().from(goals).where(eq(goals.userId, user.id)),
    db.select().from(habits).where(eq(habits.userId, user.id)),
    db.select().from(habitEntries).where(eq(habitEntries.userId, user.id)),
    db.select().from(calendarEvents).where(eq(calendarEvents.userId, user.id)),
    db.select().from(notes).where(eq(notes.userId, user.id)),
    db.select().from(timeBlocks).where(eq(timeBlocks.userId, user.id)),
    db.select().from(noteTemplates).where(eq(noteTemplates.userId, user.id)),
    db.select().from(goalMilestones).where(eq(goalMilestones.userId, user.id)),
    db.select().from(moodEntries).where(eq(moodEntries.userId, user.id)),
    db.select().from(focusSessions).where(eq(focusSessions.userId, user.id))
  ]);
  const payload = { exportedAt: new Date().toISOString(), formatVersion: 1, data: { lifeAreas: areaRows, projects: projectRows, tasks: taskRows, inbox: inboxRows, goals: goalRows, habits: habitRows, habitEntries: habitEntryRows, calendarEvents: eventRows, notes: noteRows, timeBlocks: blockRows, noteTemplates: templateRows, goalMilestones: milestoneRows, wellbeing: moodRows, focusSessions: focusRows } };
  c.header("Content-Type", "application/json; charset=utf-8");
  c.header("Content-Disposition", 'attachment; filename="sonder-backup.json"');
  return c.body(JSON.stringify(payload, null, 2));
});

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function icsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function unescapeIcs(value: string) {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}
function parseIcsDate(value: string) {
  const raw = value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
  if (dateOnly) return { date: new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))), allDay: true };
  const timed = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(raw);
  if (!timed) return null;
  const parts = timed.slice(1, 7).map((part, index) => Number(part ?? (index === 5 ? "0" : "0")));
  const date = timed[7]
    ? new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]))
    : new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  return Number.isNaN(date.getTime()) ? null : { date, allDay: false };
}

personalRoutes.post("/import/calendar.ics", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const body = await c.req.json().catch(() => null) as null | { content?: string };
  if (!body?.content || typeof body.content !== "string" || body.content.length > 1_000_000) {
    return c.json({ error: { code: "INVALID_IMPORT", message: "Upload an iCalendar file smaller than 1 MB." } }, 400);
  }
  const unfolded = body.content.replace(/\r?\n[ \t]/g, "");
  const events: Record<string, string>[][] = [];
  let current: Record<string, string> | null = null;
  for (const line of unfolded.split(/\r?\n/)) {
    if (line === "BEGIN:VEVENT") { current = {}; continue; }
    if (line === "END:VEVENT") { if (current) events.push([current]); current = null; continue; }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 1) continue;
    const header = line.slice(0, colon);
    const property = header.split(";")[0].toUpperCase();
    if (/;TZID=/i.test(header)) current["TZID_" + property] = header;
    current[property] = unescapeIcs(line.slice(colon + 1));
  }
  const parsed = events.slice(0, 200).flatMap(group => {
    const item = group[0];
    if (item.TZID_DTSTART) return [];
    const start = item.DTSTART ? parseIcsDate(item.DTSTART) : null;
    if (!start || !item.SUMMARY?.trim()) return [];
    const end = item.DTEND ? parseIcsDate(item.DTEND) : null;
    if (end && end.date <= start.date) return [];
    return [{
      userId: user.id,
      title: item.SUMMARY.trim().slice(0, 240),
      description: item.DESCRIPTION?.slice(0, 4000) ?? null,
      location: item.LOCATION?.slice(0, 500) ?? null,
      startsAt: start.date,
      endsAt: start.allDay ? null : end?.date ?? null,
      allDay: start.allDay
    }];
  });
  if (!parsed.length) return c.json({ error: { code: "NO_EVENTS", message: "No valid calendar events were found in that file." } }, 400);
  const db = c.get("db");
  const existing = await db.select({ title: calendarEvents.title, startsAt: calendarEvents.startsAt }).from(calendarEvents).where(eq(calendarEvents.userId, user.id));
  const keys = new Set(existing.map(event => event.title + "|" + event.startsAt.getTime()));
  const fresh = parsed.filter(event => {
    const key = event.title + "|" + event.startsAt.getTime();
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
  const created = fresh.length ? await db.insert(calendarEvents).values(fresh).returning() : [];
  return c.json({ data: created, imported: created.length, skippedDuplicates: parsed.length - created.length }, 201);
});

personalRoutes.get("/export/calendar.ics", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const db = c.get("db");
  const [events, blocks] = await Promise.all([
    db.select().from(calendarEvents).where(eq(calendarEvents.userId, user.id)),
    db.select({ block: timeBlocks, taskTitle: tasks.title }).from(timeBlocks).innerJoin(tasks, eq(timeBlocks.taskId, tasks.id)).where(eq(timeBlocks.userId, user.id))
  ]);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sonder//Personal Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const event of events) {
    const start = event.startsAt;
    const end = event.endsAt ?? new Date(start.getTime() + 60 * 60 * 1000);
    lines.push("BEGIN:VEVENT", "UID:" + event.id + "@sonder", "DTSTAMP:" + icsDate(new Date()), "DTSTART:" + (event.allDay ? start.toISOString().slice(0, 10).replace(/-/g, "") : icsDate(start)), "DTEND:" + (event.allDay ? new Date(end.getTime() + 86400000).toISOString().slice(0, 10).replace(/-/g, "") : icsDate(end)), "SUMMARY:" + icsEscape(event.title));
    if (event.description) lines.push("DESCRIPTION:" + icsEscape(event.description));
    if (event.location) lines.push("LOCATION:" + icsEscape(event.location));
    lines.push("END:VEVENT");
  }
  for (const row of blocks) {
    lines.push("BEGIN:VEVENT", "UID:" + row.block.id + "@sonder", "DTSTAMP:" + icsDate(new Date()), "DTSTART:" + icsDate(row.block.startsAt), "DTEND:" + icsDate(row.block.endsAt), "SUMMARY:" + icsEscape("Focus: " + row.taskTitle), "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  c.header("Content-Type", "text/calendar; charset=utf-8");
  c.header("Content-Disposition", 'attachment; filename="sonder-calendar.ics"');
  return c.body(lines.join("\r\n") + "\r\n");
});
