import { describe, expect, test } from "bun:test";
import {
  CreateLifeAreaSchema,
  CreateInboxItemSchema,
  CreateProjectSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  UpdateLifeAreaSchema,
  UpdateProjectSchema,
  UpdateInboxItemSchema,
  CreateGoalSchema,
  UpdateGoalSchema,
  CreateHabitSchema,
  UpdateHabitSchema,
  CreateCalendarEventSchema,
  UpdateCalendarEventSchema,
  CreateNoteSchema,
  UpdateNoteSchema
} from "./index";

describe("shared request contracts", () => {
  test("trims task titles and applies safe defaults", () => {
    expect(CreateTaskSchema.parse({ title: "  Finish homework  " })).toMatchObject({
      title: "Finish homework",
      status: "todo",
      priority: "medium"
    });
  });

  test("rejects empty task titles", () => {
    expect(CreateTaskSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  test("preserves explicit time intent for scheduled dates and deadlines", () => {
    expect(CreateTaskSchema.parse({
      title: "Meet at noon",
      scheduledAt: "2026-11-12T12:00:00.000Z",
      scheduledHasTime: true,
      dueAt: "2026-11-12T12:00:00.000Z",
      dueHasTime: false
    })).toMatchObject({ scheduledHasTime: true, dueHasTime: false });
    expect(UpdateTaskSchema.parse({ scheduledHasTime: true, dueHasTime: false })).toEqual({
      scheduledHasTime: true,
      dueHasTime: false
    });
  });

  test("allows explicitly clearing nullable task relationships", () => {
    expect(UpdateTaskSchema.parse({ projectId: null, lifeAreaId: null })).toEqual({
      projectId: null,
      lifeAreaId: null
    });
  });

  test("PATCH schemas do not apply create-time defaults to omitted fields", () => {
    expect(UpdateLifeAreaSchema.parse({ name: "Church" })).toEqual({ name: "Church" });
    expect(UpdateProjectSchema.parse({ description: "A project" })).toEqual({ description: "A project" });
    expect(UpdateInboxItemSchema.parse({ status: "archived" })).toEqual({ status: "archived" });
    expect(UpdateTaskSchema.parse({ priority: "high" })).toEqual({ priority: "high" });
  });

  test("validates connected goals, subtasks, reminders and recurring tasks", () => {
    const goalId = "00000000-0000-4000-8000-000000000001";
    const parentTaskId = "00000000-0000-4000-8000-000000000002";
    expect(CreateTaskSchema.parse({
      title: "Weekly review",
      goalId,
      parentTaskId,
      reminderAt: "2026-11-12T08:00:00.000Z",
      dueAt: "2026-11-12T12:00:00.000Z",
      dueHasTime: false,
      recurrenceFrequency: "weekly",
      recurrenceInterval: 2,
      recurrenceUntil: "2026-12-31"
    })).toMatchObject({
      goalId,
      parentTaskId,
      recurrenceFrequency: "weekly",
      recurrenceInterval: 2,
      recurrenceUntil: "2026-12-31"
    });
    expect(CreateTaskSchema.safeParse({ title: "Bad recurrence", recurrenceFrequency: "yearly" }).success).toBe(false);
    expect(CreateTaskSchema.safeParse({ title: "Bad interval", recurrenceInterval: 0 }).success).toBe(false);
    expect(CreateTaskSchema.safeParse({ title: "Missing recurrence date", recurrenceFrequency: "weekly" }).success).toBe(false);
    expect(CreateTaskSchema.safeParse({ title: "Time without date", scheduledHasTime: true }).success).toBe(false);
    expect(CreateProjectSchema.safeParse({ name: "Goal project", goalId }).success).toBe(true);
    expect(CreateHabitSchema.safeParse({ name: "Read", goalId }).success).toBe(true);
  });

  test("validates life area colors", () => {
    expect(CreateLifeAreaSchema.safeParse({ name: "School", color: "#A78BFA" }).success).toBe(true);
    expect(CreateLifeAreaSchema.safeParse({ name: "School", color: "lavender" }).success).toBe(false);
  });

  test("validates universal inbox items and safe links", () => {
    expect(CreateInboxItemSchema.safeParse({ title: "Read this", type: "link", url: "https://example.com" }).success).toBe(true);
    expect(CreateInboxItemSchema.safeParse({ title: "Unsafe", type: "link", url: "javascript:alert(1)" }).success).toBe(false);
    expect(CreateInboxItemSchema.safeParse({ title: "Malformed", url: "not a URL" }).success).toBe(false);
  });

  test("validates goals and preserves PATCH omission semantics", () => {
    expect(CreateGoalSchema.parse({ title: "Finish school year" })).toMatchObject({ title: "Finish school year", status: "active" });
    expect(UpdateGoalSchema.parse({ status: "completed" })).toEqual({ status: "completed" });
    expect(UpdateGoalSchema.parse({ title: "Renamed goal" })).toEqual({ title: "Renamed goal" });
    expect(CreateGoalSchema.safeParse({ title: "Invalid date", targetDate: "2026-02-30" }).success).toBe(false);
  });

  test("validates habit frequency and check-in configuration", () => {
    expect(CreateHabitSchema.parse({ name: "Read", frequency: "weekdays" })).toMatchObject({ frequency: "weekdays", targetPerWeek: 5 });
    expect(UpdateHabitSchema.parse({ archived: true })).toEqual({ archived: true });
    expect(CreateHabitSchema.safeParse({ name: "Read", frequency: "monthly" }).success).toBe(false);
  });

  test("validates calendar event time ranges", () => {
    expect(CreateCalendarEventSchema.safeParse({
      title: "Study session",
      startsAt: "2026-11-10T09:00:00.000Z",
      endsAt: "2026-11-10T10:00:00.000Z"
    }).success).toBe(true);
    expect(CreateCalendarEventSchema.safeParse({
      title: "Invalid event",
      startsAt: "2026-11-10T10:00:00.000Z",
      endsAt: "2026-11-10T09:00:00.000Z"
    }).success).toBe(false);
    expect(UpdateCalendarEventSchema.parse({ title: "Renamed event" })).toEqual({ title: "Renamed event" });
  });

  test("validates project names, status, and date-only fields", () => {
    expect(CreateProjectSchema.safeParse({
      name: "Sonder MVP",
      status: "active",
      startDate: "2026-11-09",
      dueDate: "2026-12-01"
    }).success).toBe(true);

    expect(CreateProjectSchema.safeParse({
      name: "Sonder MVP",
      startDate: "09/11/2026"
    }).success).toBe(false);

    expect(CreateProjectSchema.safeParse({
      name: "Sonder MVP",
      startDate: "2026-02-30"
    }).success).toBe(false);
  });

  test("validates note pages and block content", () => {
    const note = CreateNoteSchema.parse({
      title: "  Project research  ",
      content: [{ id: "block-1", type: "heading1", text: "Research" }],
      tags: ["work", "ideas"]
    });
    expect(note.title).toBe("Project research");
    expect(note.content?.[0]?.type).toBe("heading1");
    expect(UpdateNoteSchema.parse({ favorite: true })).toEqual({ favorite: true });
    expect(UpdateNoteSchema.parse({ archived: false })).toEqual({ archived: false });
    expect(CreateNoteSchema.safeParse({ title: "Invalid block", content: [{ id: "x", type: "unsupported", text: "Nope" }] }).success).toBe(false);
  });

});
