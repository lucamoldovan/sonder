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

export const UpdateTaskSchema = CreateTaskSchema.partial();

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

export const UpdateLifeAreaSchema = CreateLifeAreaSchema.partial();

export type CreateLifeAreaInput = z.infer<typeof CreateLifeAreaSchema>;
export type UpdateLifeAreaInput = z.infer<typeof UpdateLifeAreaSchema>;

export const UuidSchema = z.string().uuid();


export const ProjectStatusSchema = z.enum([
  "active",
  "on_hold",
  "completed",
  "archived"
]);

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

export const UpdateProjectSchema = CreateProjectSchema.partial();

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
  url: z.string().url().max(2_048).refine(value => {\n    const protocol = new URL(value).protocol;\n    return protocol === "http:" || protocol === "https:";\n  }, "Only HTTP and HTTPS links are allowed").nullable().optional()
});

export const UpdateInboxItemSchema = CreateInboxItemSchema.partial().extend({
  status: z.enum(["inbox", "processed", "archived"]).optional()
});

export type InboxItemType = z.infer<typeof InboxItemTypeSchema>;
export type CreateInboxItemInput = z.infer<typeof CreateInboxItemSchema>;
export type UpdateInboxItemInput = z.infer<typeof UpdateInboxItemSchema>;
