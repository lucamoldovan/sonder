import { z } from "zod";

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date in YYYY-MM-DD format").refine((value) => {
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Expected a real calendar date");

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
  goalId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  reminderAt: z.string().datetime().nullable().optional(),
  recurrenceFrequency: z.enum(["daily", "weekly", "monthly"]).nullable().optional(),
  recurrenceInterval: z.number().int().min(1).max(52).optional(),
  recurrenceUntil: DateOnlySchema.nullable().optional(),
  status: TaskStatusSchema.default("todo"),
  priority: TaskPrioritySchema.default("medium"),
  scheduledAt: z.string().datetime().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  estimateMinutes: z.number().int().positive().max(1440).nullable().optional()
});

// PATCH schemas must not inherit create-time defaults: omitted fields must stay omitted.
export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(10_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  reminderAt: z.string().datetime().nullable().optional(),
  recurrenceFrequency: z.enum(["daily", "weekly", "monthly"]).nullable().optional(),
  recurrenceInterval: z.number().int().min(1).max(52).optional(),
  recurrenceUntil: DateOnlySchema.nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
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

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(10_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  status: ProjectStatusSchema.default("active"),
  startDate: DateOnlySchema.nullable().optional(),
  dueDate: DateOnlySchema.nullable().optional()
});

export const UpdateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(10_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
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
  scheduledAt: string | null;
  dueAt: string | null;
  lifeAreaId: string | null;
  projectId: string | null;
  goalId?: string | null;
  parentTaskId?: string | null;
  reminderAt?: string | null;
  recurrenceFrequency?: "daily" | "weekly" | "monthly" | null;
  recurrenceInterval?: number;
  recurrenceUntil?: string | null;
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
  goalId?: string | null;
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

const GoalFieldsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(10_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  targetDate: OptionalDateSchema,
  status: z.enum(["active", "completed", "paused"]).optional()
});
export const CreateGoalSchema = GoalFieldsSchema.transform(data => ({ ...data, status: data.status ?? "active" }));
export const UpdateGoalSchema = GoalFieldsSchema.partial();
export type GoalRecord = { id: string; title: string; description: string | null; lifeAreaId: string | null; targetDate: string | null; status: "active" | "completed" | "paused"; createdAt: string };

const HabitFieldsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  frequency: z.enum(["daily", "weekdays", "weekly"]).optional(),
  targetPerWeek: z.number().int().min(1).max(7).optional()
});
export const CreateHabitSchema = HabitFieldsSchema.transform(data => {
  const frequency = data.frequency ?? "daily";
  return {
    ...data,
    frequency,
    targetPerWeek: data.targetPerWeek ?? (frequency === "weekdays" ? 5 : frequency === "weekly" ? 1 : 7)
  };
});
export const UpdateHabitSchema = HabitFieldsSchema.partial().extend({ archived: z.boolean().optional() });
export type HabitRecord = { id: string; name: string; description: string | null; lifeAreaId: string | null; goalId?: string | null; frequency: "daily" | "weekdays" | "weekly"; targetPerWeek: number; archivedAt: string | null; createdAt: string };
export type HabitEntryRecord = { id: string; habitId: string; entryDate: string; note: string | null };

const CalendarEventFieldsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(10_000).nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  allDay: z.boolean().optional(),
  location: z.string().max(240).nullable().optional()
});
export const CreateCalendarEventSchema = CalendarEventFieldsSchema.extend({ allDay: z.boolean().default(false) }).refine(value => !value.endsAt || new Date(value.endsAt) >= new Date(value.startsAt), { message: "End time must be after start time", path: ["endsAt"] });
export const UpdateCalendarEventSchema = CalendarEventFieldsSchema.partial().refine(value => !value.endsAt || !value.startsAt || new Date(value.endsAt) >= new Date(value.startsAt), { message: "End time must be after start time", path: ["endsAt"] });
export type CalendarEventRecord = { id: string; title: string; description: string | null; lifeAreaId: string | null; projectId: string | null; startsAt: string; endsAt: string | null; allDay: boolean; location: string | null };


export const NoteBlockTypeSchema = z.enum([
  "paragraph", "heading1", "heading2", "bullet", "numbered", "todo", "quote", "code", "divider"
]);
export const NoteBlockSchema = z.object({
  id: z.string().min(1).max(64),
  type: NoteBlockTypeSchema,
  text: z.string().max(20_000),
  checked: z.boolean().optional()
});
export const NoteContentSchema = z.array(NoteBlockSchema).max(500);
const NoteFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: NoteContentSchema.optional(),
  parentId: z.string().uuid().nullable().optional(),
  lifeAreaId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  icon: z.string().max(16).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(20).optional()
});
export const CreateNoteSchema = NoteFieldsSchema;
export const UpdateNoteSchema = NoteFieldsSchema.partial().extend({
  favorite: z.boolean().optional(),
  archived: z.boolean().optional()
});
export type NoteBlock = z.infer<typeof NoteBlockSchema>;
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
export type NoteRecord = {
  id: string;
  title: string;
  content: NoteBlock[];
  parentId: string | null;
  lifeAreaId: string | null;
  projectId: string | null;
  icon: string | null;
  tags: string[];
  favorite: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};


export const CreateTimeBlockSchema = z.object({
  taskId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  note: z.string().max(1000).nullable().optional()
}).refine(value => new Date(value.endsAt) > new Date(value.startsAt), {
  message: "End time must be after start time", path: ["endsAt"]
});
export type CreateTimeBlockInput = z.infer<typeof CreateTimeBlockSchema>;
export type TimeBlockRecord = { id: string; taskId: string; startsAt: string; endsAt: string; note: string | null };

export const GoalMilestoneSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  targetDate: DateOnlySchema.nullable().optional(),
  position: z.number().int().min(0).max(10000).optional()
});
export type GoalMilestoneInput = z.infer<typeof GoalMilestoneSchema>;
export type GoalMilestoneRecord = { id: string; goalId: string; title: string; description: string | null; targetDate: string | null; status: "pending" | "completed"; position: number; completedAt: string | null };

export const NoteTemplateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(300).nullable().optional(),
  content: NoteContentSchema.default([])
});
export type NoteTemplateInput = z.infer<typeof NoteTemplateSchema>;
