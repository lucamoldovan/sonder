import { describe, expect, test } from "bun:test";
import {
  CreateLifeAreaSchema,
  CreateProjectSchema,
  CreateTaskSchema,
  UpdateTaskSchema
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

  test("validates life area colors", () => {
    expect(CreateLifeAreaSchema.safeParse({ name: "School", color: "#A78BFA" }).success).toBe(true);
    expect(CreateLifeAreaSchema.safeParse({ name: "School", color: "lavender" }).success).toBe(false);
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
