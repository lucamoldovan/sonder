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
  UpdateCalendarEventSchema
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
    expect(CreateGoalSchema.safeParse({ title: "Invalid date", targetDate: "2026-02-30" }).success).toBe(false);
  });

  test("validates habit frequency and check-in configuration", () => {
    expect(CreateHabitSchema.parse({ name: "Read", frequency: "weekdays" })).toMatchObject({ frequency: "weekdays", targetPerWeek: 7 });
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
});
