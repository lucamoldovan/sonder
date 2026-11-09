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
