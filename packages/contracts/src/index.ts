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
