import { and, asc, desc, eq, gte, ilike } from "drizzle-orm";
import { Hono } from "hono";
import { activityLog, calendarEvents, goals, habitEntries, habits, inboxItems, lifeAreas, notes, notifications, projects, taskDependencies, tasks } from "../db/schema";
import type { AppEnv } from "../env";
import { getSessionUser } from "../lib/session";

export const workspaceRoutes = new Hono<AppEnv>();

workspaceRoutes.get("/dashboard", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const db = c.get("db");
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const [taskRows, eventRows, goalRows, habitRows, entryRows, projectRows, inboxRows, areaRows, reminderRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.userId, user.id)).orderBy(asc(tasks.dueAt), desc(tasks.createdAt)),
    db.select().from(calendarEvents).where(and(eq(calendarEvents.userId, user.id), gte(calendarEvents.startsAt, now))).orderBy(asc(calendarEvents.startsAt)).limit(12),
    db.select().from(goals).where(eq(goals.userId, user.id)).orderBy(asc(goals.targetDate)),
    db.select().from(habits).where(eq(habits.userId, user.id)).orderBy(asc(habits.createdAt)),
    db.select().from(habitEntries).where(and(eq(habitEntries.userId, user.id), gte(habitEntries.entryDate, weekStart.toISOString().slice(0, 10)))),
    db.select().from(projects).where(eq(projects.userId, user.id)).orderBy(asc(projects.name)),
    db.select().from(inboxItems).where(and(eq(inboxItems.userId, user.id), eq(inboxItems.status, "inbox"))).orderBy(desc(inboxItems.createdAt)),
    db.select().from(lifeAreas).where(eq(lifeAreas.userId, user.id)).orderBy(asc(lifeAreas.position)),
    db.select().from(tasks).where(and(eq(tasks.userId, user.id), gte(tasks.reminderAt, new Date(now.getTime() - 24 * 60 * 60 * 1000))))
  ]);
  const dueReminders = taskRows.filter(task => task.reminderAt && task.reminderAt <= now && !["done", "cancelled"].includes(task.status));
  await Promise.all(dueReminders.map(task => db.insert(notifications).values({
    userId: user.id,
    title: "Task reminder",
    body: task.title,
    href: task.projectId ? "/projects/" + task.projectId : "/",
    sourceKey: "task-reminder:" + task.id + ":" + task.reminderAt!.toISOString()
  }).onConflictDoNothing()));
  const openTasks = taskRows.filter(task => task.status !== "done" && task.status !== "cancelled");
  const completedTasks = taskRows.filter(task => task.status === "done");
  const dueToday = openTasks.filter(task => task.dueAt?.toDateString() === now.toDateString());
  const overdue = openTasks.filter(task => task.dueAt && task.dueAt < new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  return c.json({
    data: {
      tasks: taskRows,
      events: eventRows,
      goals: goalRows,
      habits: habitRows,
      habitEntries: entryRows,
      projects: projectRows,
      inbox: inboxRows,
      lifeAreas: areaRows,
      reminders: reminderRows,
      summary: { openTasks: openTasks.length, completedTasks: completedTasks.length, dueToday: dueToday.length, overdue: overdue.length, inbox: inboxRows.length }
    }
  });
});

workspaceRoutes.get("/search", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const query = (c.req.query("q") ?? "").trim().slice(0, 100);
  if (query.length < 2) return c.json({ data: [] });
  const pattern = "%" + query.replace(/[\\%_]/g, "\\$&") + "%";
  const db = c.get("db");
  const [taskRows, projectRows, goalRows, habitRows, eventRows, noteRows] = await Promise.all([
    db.select({ id: tasks.id, title: tasks.title, subtitle: tasks.description }).from(tasks).where(and(eq(tasks.userId, user.id), ilike(tasks.title, pattern))).limit(8),
    db.select({ id: projects.id, title: projects.name, subtitle: projects.description }).from(projects).where(and(eq(projects.userId, user.id), ilike(projects.name, pattern))).limit(8),
    db.select({ id: goals.id, title: goals.title, subtitle: goals.description }).from(goals).where(and(eq(goals.userId, user.id), ilike(goals.title, pattern))).limit(8),
    db.select({ id: habits.id, title: habits.name, subtitle: habits.description }).from(habits).where(and(eq(habits.userId, user.id), ilike(habits.name, pattern))).limit(8),
    db.select({ id: calendarEvents.id, title: calendarEvents.title, subtitle: calendarEvents.description }).from(calendarEvents).where(and(eq(calendarEvents.userId, user.id), ilike(calendarEvents.title, pattern))).limit(8),
    db.select({ id: notes.id, title: notes.title, subtitle: notes.tags }).from(notes).where(and(eq(notes.userId, user.id), ilike(notes.title, pattern))).limit(8)
  ]);
  const data = [
    ...taskRows.map(item => ({ ...item, type: "task", href: "/?view=Tasks" })),
    ...projectRows.map(item => ({ ...item, type: "project", href: "/?view=Projects" })),
    ...goalRows.map(item => ({ ...item, type: "goal", href: "/?view=Goals" })),
    ...habitRows.map(item => ({ ...item, type: "habit", href: "/?view=Habits" })),
    ...eventRows.map(item => ({ ...item, type: "event", href: "/?view=Calendar" })),
    ...noteRows.map(item => ({ ...item, type: "note", href: "/notes" }))
  ].slice(0, 30);
  return c.json({ data });
});

workspaceRoutes.get("/projects/:id", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const id = c.req.param("id");
  const db = c.get("db");
  const [project] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, user.id))).limit(1);
  if (!project) return c.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, 404);
  const [taskRows, eventRows, noteRows, activityRows, goalRows, areaRows, dependencyRows] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.userId, user.id), eq(tasks.projectId, id))).orderBy(asc(tasks.dueAt), desc(tasks.createdAt)),
    db.select().from(calendarEvents).where(and(eq(calendarEvents.userId, user.id), eq(calendarEvents.projectId, id))).orderBy(asc(calendarEvents.startsAt)),
    db.select().from(notes).where(and(eq(notes.userId, user.id), eq(notes.projectId, id))).orderBy(desc(notes.updatedAt)),
    db.select().from(activityLog).where(and(eq(activityLog.userId, user.id), eq(activityLog.entityId, id))).orderBy(desc(activityLog.createdAt)).limit(30),
    project.goalId ? db.select().from(goals).where(and(eq(goals.id, project.goalId), eq(goals.userId, user.id))).limit(1) : Promise.resolve([]),
    project.lifeAreaId ? db.select().from(lifeAreas).where(and(eq(lifeAreas.id, project.lifeAreaId), eq(lifeAreas.userId, user.id))).limit(1) : Promise.resolve([]),
    db.select().from(taskDependencies).where(eq(taskDependencies.userId, user.id))
  ]);
  const completed = taskRows.filter(task => task.status === "done").length;
  return c.json({ data: { project, tasks: taskRows, events: eventRows, notes: noteRows, activity: activityRows, dependencies: dependencyRows.filter(row => taskRows.some(task => task.id === row.taskId)), goal: goalRows[0] ?? null, lifeArea: areaRows[0] ?? null, progress: { completed, total: taskRows.length, percentage: taskRows.length ? Math.round(completed / taskRows.length * 100) : 0 } } });
});

workspaceRoutes.get("/activity", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? 30), 1), 100);
  const rows = await c.get("db").select().from(activityLog).where(eq(activityLog.userId, user.id)).orderBy(desc(activityLog.createdAt)).limit(limit);
  return c.json({ data: rows });
});

workspaceRoutes.get("/notifications", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const rows = await c.get("db").select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(50);
  return c.json({ data: rows, unreadCount: rows.filter(row => !row.readAt).length });
});

workspaceRoutes.patch("/notifications/:id/read", async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, 401);
  const [updated] = await c.get("db").update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, c.req.param("id")), eq(notifications.userId, user.id))).returning();
  if (!updated) return c.json({ error: { code: "NOT_FOUND", message: "Notification not found." } }, 404);
  return c.json({ data: updated });
});
