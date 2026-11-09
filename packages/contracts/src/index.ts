import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "inbox",
  "todo",
  "in_progress",
  "done",
  "cancelled"
]);

export const TaskPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent"
]);

export const CreateTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(10_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  status: TaskStatusSchema.default("todo"),
  priority: TaskPrioritySchema.default("medium"),
  dueAt: z.string().datetime().nullable().optional(),
  estimateMinutes: z.number().int().positive().max(1440).nullable().optional()
});

// PATCH schemas must not inherit create-time defaults: omitted fields must stay omitted.
export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(10_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  dueAt: z.string().datetime().nullable().optional(),
  estimateMinutes: z.number().int().positive().max(1440).nullable().optional()
});

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;


export const CreateLifeAreaSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#A78BFA"),
  icon: z.string().max(48).nullable().optional(),
  position: z.number().int().min(0).max(10_000).default(0)
});

export const UpdateLifeAreaSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(48).nullable().optional(),
  position: z.number().int().min(0).max(10_000).optional()
});

export type CreateLifeAreaInput = z.infer<typeof CreateLifeAreaSchema>;
export type UpdateLifeAreaInput = z.infer<typeof UpdateLifeAreaSchema>;

export const UuidSchema = z.string().uuid();


export const ProjectStatusSchema = z.enum([
  "active",
  "on_hold",
  "completed",
  "archived"
]);

const SafeHttpUrlSchema = z.string().url().max(2_048).refine(
  value => value.toLowerCase().startsWith("http://") || value.toLowerCase().startsWith("https://"),
  "Only HTTP and HTTPS links are allowed"
);

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date in YYYY-MM-DD format").refine((value) => {
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Expected a real calendar date");

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(10_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  status: ProjectStatusSchema.default("active"),
  startDate: DateOnlySchema.nullable().optional(),
  dueDate: DateOnlySchema.nullable().optional()
});

export const UpdateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(10_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  status: ProjectStatusSchema.optional(),
  startDate: DateOnlySchema.nullable().optional(),
  dueDate: DateOnlySchema.nullable().optional()
});

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;


export const InboxItemTypeSchema = z.enum([
  "task",
  "idea",
  "note",
  "link",
  "event",
  "reminder"
]);

export const CreateInboxItemSchema = z.object({
  type: InboxItemTypeSchema.default("task"),
  title: z.string().trim().min(1).max(200),
  content: z.string().max(20_000).nullable().optional(),
  url: SafeHttpUrlSchema.nullable().optional()
});

export const UpdateInboxItemSchema = z.object({
  type: InboxItemTypeSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().max(20_000).nullable().optional(),
  url: SafeHttpUrlSchema.nullable().optional(),
  status: z.enum(["inbox", "processed", "archived"]).optional()
});

export type InboxItemType = z.infer<typeof InboxItemTypeSchema>;
export type CreateInboxItemInput = z.infer<typeof CreateInboxItemSchema>;
export type UpdateInboxItemInput = z.infer<typeof UpdateInboxItemSchema>;


export type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  lifeAreaId: string | null;
  projectId: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type LifeAreaRecord = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  position: number;
};

export type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  lifeAreaId: string | null;
  startDate: string | null;
  dueDate: string | null;
};

export type InboxItemRecord = {
  id: string;
  type: InboxItemType;
  title: string;
  content: string | null;
  url: string | null;
  status: "inbox" | "processed" | "archived";
  convertedTaskId: string | null;
  createdAt: string;
};


const OptionalDateSchema = DateOnlySchema.nullable().optional();

export const CreateGoalSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(10_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  targetDate: OptionalDateSchema,
  status: z.enum(["active", "completed", "paused"]).default("active")
});
export const UpdateGoalSchema = CreateGoalSchema.partial();
export type GoalRecord = { id: string; title: string; description: string | null; lifeAreaId: string | null; targetDate: string | null; status: "active" | "completed" | "paused"; createdAt: string };

export const CreateHabitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  frequency: z.enum(["daily", "weekdays", "weekly"]).default("daily"),
  targetPerWeek: z.number().int().min(1).max(7).default(7)
});
export const UpdateHabitSchema = CreateHabitSchema.partial().extend({ archived: z.boolean().optional() });
export type HabitRecord = { id: string; name: string; description: string | null; lifeAreaId: string | null; frequency: "daily" | "weekdays" | "weekly"; targetPerWeek: number; archivedAt: string | null; createdAt: string };
export type HabitEntryRecord = { id: string; habitId: string; entryDate: string; note: string | null };

const CalendarEventFieldsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(10_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  allDay: z.boolean().default(false),
  location: z.string().max(240).nullable().optional()
});
export const CreateCalendarEventSchema = CalendarEventFieldsSchema.refine(value => !value.endsAt || new Date(value.endsAt) >= new Date(value.startsAt), { message: "End time must be after start time", path: ["endsAt"] });
export const UpdateCalendarEventSchema = CalendarEventFieldsSchema.partial().refine(value => !value.endsAt || !value.startsAt || new Date(value.endsAt) >= new Date(value.startsAt), { message: "End time must be after start time", path: ["endsAt"] });
export type CalendarEventRecord = { id: string; title: string; description: string | null; lifeAreaId: string | null; projectId: string | null; startsAt: string; endsAt: string | null; allDay: boolean; location: string | null };
