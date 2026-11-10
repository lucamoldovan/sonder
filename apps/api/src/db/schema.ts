import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { NoteBlock } from "@sonder/contracts";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

// Better Auth tables. Keep these fields aligned with the Better Auth Drizzle adapter.
// RLS is enabled with no client-facing policies: only the trusted server-side
// PostgreSQL connection should be able to access these records.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}).enableRLS();

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" })
}, (table) => [
  index("session_user_id_idx").on(table.userId)
]).enableRLS();

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [
  index("account_user_id_idx").on(table.userId),
  uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId)
]).enableRLS();

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow()
}, (table) => [
  index("verification_identifier_idx").on(table.identifier)
]).enableRLS();

export const taskStatus = pgEnum("task_status", [
  "inbox",
  "todo",
  "in_progress",
  "done",
  "cancelled"
]);

export const taskPriority = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent"
]);

export const lifeAreas = pgTable("life_areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  color: text("color").notNull().default("#A78BFA"),
  icon: text("icon"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex("life_areas_user_slug_unique").on(table.userId, table.slug),
  index("life_areas_user_id_idx").on(table.userId)
]).enableRLS();

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  lifeAreaId: uuid("life_area_id").references(() => lifeAreas.id, { onDelete: "set null" }),
  goalId: uuid("goal_id"),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("projects_user_id_idx").on(table.userId),
  index("projects_life_area_id_idx").on(table.lifeAreaId),
  index("projects_goal_id_idx").on(table.goalId)
]).enableRLS();

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  lifeAreaId: uuid("life_area_id").references(() => lifeAreas.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  goalId: uuid("goal_id"),
  parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => tasks.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatus("status").notNull().default("todo"),
  priority: taskPriority("priority").notNull().default("medium"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  scheduledHasTime: boolean("scheduled_has_time").notNull().default(false),
  dueAt: timestamp("due_at", { withTimezone: true }),
  dueHasTime: boolean("due_has_time").notNull().default(false),
  reminderAt: timestamp("reminder_at", { withTimezone: true }),
  recurrenceFrequency: text("recurrence_frequency"),
  recurrenceInterval: integer("recurrence_interval").notNull().default(1),
  recurrenceUntil: date("recurrence_until"),
  estimateMinutes: integer("estimate_minutes"),
  position: integer("position").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("tasks_user_id_idx").on(table.userId),
  index("tasks_user_status_idx").on(table.userId, table.status),
  index("tasks_project_id_idx").on(table.projectId),
  index("tasks_goal_id_idx").on(table.goalId),
  index("tasks_parent_task_id_idx").on(table.parentTaskId),
  index("tasks_life_area_id_idx").on(table.lifeAreaId),
  index("tasks_due_at_idx").on(table.userId, table.dueAt),
  index("tasks_scheduled_at_idx").on(table.userId, table.scheduledAt)
]).enableRLS();

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  lifeAreaId: uuid("life_area_id").references(() => lifeAreas.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  targetDate: date("target_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("goals_user_id_idx").on(table.userId),
  index("goals_life_area_id_idx").on(table.lifeAreaId)
]).enableRLS();

export const habits = pgTable("habits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  lifeAreaId: uuid("life_area_id").references(() => lifeAreas.id, { onDelete: "set null" }),
  goalId: uuid("goal_id"),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull().default("daily"),
  targetPerWeek: integer("target_per_week").notNull().default(7),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("habits_user_id_idx").on(table.userId),
  index("habits_goal_id_idx").on(table.goalId)
]).enableRLS();

export const habitEntries = pgTable("habit_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  habitId: uuid("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  entryDate: date("entry_date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex("habit_entries_habit_date_unique").on(table.habitId, table.entryDate),
  index("habit_entries_user_date_idx").on(table.userId, table.entryDate)
]).enableRLS();

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  lifeAreaId: uuid("life_area_id").references(() => lifeAreas.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  allDay: boolean("all_day").notNull().default(false),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("calendar_events_user_start_idx").on(table.userId, table.startsAt),
  index("calendar_events_project_id_idx").on(table.projectId)
]).enableRLS();

export const inboxItemType = pgEnum("inbox_item_type", [
  "task",
  "idea",
  "note",
  "link",
  "event",
  "reminder"
]);

export const inboxItems = pgTable("inbox_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: inboxItemType("type").notNull().default("task"),
  title: text("title").notNull(),
  content: text("content"),
  url: text("url"),
  status: text("status").notNull().default("inbox"),
  convertedTaskId: uuid("converted_task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("inbox_items_user_status_idx").on(table.userId, table.status),
  index("inbox_items_created_at_idx").on(table.userId, table.createdAt)
]).enableRLS();


export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => notes.id, { onDelete: "cascade" }),
  lifeAreaId: uuid("life_area_id").references(() => lifeAreas.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull().default("Untitled"),
  content: jsonb("content").$type<NoteBlock[]>().notNull().default([]),
  icon: text("icon").default("📝"),
  tags: text("tags").array().notNull().default([]),
  favorite: boolean("favorite").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("notes_user_updated_idx").on(table.userId, table.updatedAt),
  index("notes_parent_id_idx").on(table.parentId),
  index("notes_project_id_idx").on(table.projectId),
  index("notes_life_area_id_idx").on(table.lifeAreaId)
]).enableRLS();


export const taskDependencies = pgTable("task_dependencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: uuid("depends_on_task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex("task_dependencies_unique").on(table.taskId, table.dependsOnTaskId),
  index("task_dependencies_user_idx").on(table.userId, table.taskId)
]).enableRLS();

export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("activity_log_user_created_idx").on(table.userId, table.createdAt),
  index("activity_log_entity_idx").on(table.entityType, table.entityId)
]).enableRLS();

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  sourceKey: text("source_key"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("notifications_user_created_idx").on(table.userId, table.createdAt),
  index("notifications_user_unread_idx").on(table.userId, table.readAt),
  uniqueIndex("notifications_user_source_unique").on(table.userId, table.sourceKey)
]).enableRLS();


export const timeBlocks = pgTable("time_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("time_blocks_user_start_idx").on(table.userId, table.startsAt),
  index("time_blocks_task_idx").on(table.taskId)
]).enableRLS();

export const noteTemplates = pgTable("note_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  content: jsonb("content").$type<NoteBlock[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex("note_templates_user_name_unique").on(table.userId, table.name),
  index("note_templates_user_idx").on(table.userId)
]).enableRLS();

export const goalMilestones = pgTable("goal_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: date("target_date"),
  status: text("status").notNull().default("pending"),
  position: integer("position").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("goal_milestones_goal_position_idx").on(table.goalId, table.position),
  index("goal_milestones_user_idx").on(table.userId, table.goalId)
]).enableRLS();
