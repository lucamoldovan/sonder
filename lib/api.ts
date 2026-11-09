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

export type ApiTask = {
  id: string;
  title: string;
  description: string | null;
  status: "inbox" | "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueAt: string | null;
  lifeAreaId: string | null;
  projectId: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type ApiLifeArea = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  position: number;
};

export type ApiProject = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "on_hold" | "completed" | "archived";
  lifeAreaId: string | null;
  startDate: string | null;
  dueDate: string | null;
};

export type ApiInboxItem = {
  id: string;
  type: "task" | "idea" | "note" | "link" | "event" | "reminder";
  title: string;
  content: string | null;
  url: string | null;
  status: "inbox" | "processed" | "archived";
  convertedTaskId: string | null;
  createdAt: string;
};

export type ApiList<T> = { data: T };
