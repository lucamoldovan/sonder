import type {
  InboxItemRecord,
  LifeAreaRecord,
  ProjectRecord,
  TaskRecord
} from "@sonder/contracts";

type ApiError = {
  error?: {
    code?: string;
    message?: string;
    issues?: unknown;
  };
};

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: "include",
    headers
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null) as T | ApiError | null;
  if (!response.ok) {
    const error = payload as ApiError | null;
    throw new ApiRequestError(
      error?.error?.message || "Something went wrong. Please try again.",
      response.status,
      error?.error?.code
    );
  }

  return payload as T;
}

export type ApiTask = TaskRecord;
export type ApiLifeArea = LifeAreaRecord;
export type ApiProject = ProjectRecord;
export type ApiInboxItem = InboxItemRecord;\nexport type ApiGoal = GoalRecord;\nexport type ApiHabit = HabitRecord;\nexport type ApiHabitEntry = HabitEntryRecord;\nexport type ApiCalendarEvent = CalendarEventRecord;
export type ApiList<T> = { data: T };
