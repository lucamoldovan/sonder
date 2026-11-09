export type Area = "School" | "Church" | "Projects" | "Personal" | "Health";
export type Priority = "Low" | "Medium" | "High";
export type Repeat = "Never" | "Daily" | "Weekly" | "Monthly";

export type Task = {
  id: string;
  title: string;
  notes: string;
  area: Area;
  priority: Priority;
  dueDate: string;
  repeat: Repeat;
  completed: boolean;
  createdAt: string;
};

const STORAGE_KEY = "sonder.tasks.v1";

export const initialTasks: Task[] = [
  { id: "sample-1", title: "Finish economics assignment", notes: "Review the final section and prepare the slides.", area: "School", priority: "High", dueDate: today(), repeat: "Never", completed: false, createdAt: new Date().toISOString() },
  { id: "sample-2", title: "Review C++ subprograms", notes: "A focused 30-minute revision session.", area: "School", priority: "Medium", dueDate: today(), repeat: "Never", completed: false, createdAt: new Date().toISOString() },
  { id: "sample-3", title: "Check Sunday service setup", notes: "Confirm the media and audio checklist.", area: "Church", priority: "Medium", dueDate: today(), repeat: "Weekly", completed: false, createdAt: new Date().toISOString() },
  { id: "sample-4", title: "Go for a workout", notes: "Keep it simple. Showing up is enough.", area: "Health", priority: "Low", dueDate: tomorrow(), repeat: "Never", completed: false, createdAt: new Date().toISOString() }
];

function today() {
  const d = new Date();
  return localDate(d);
}
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDate(d);
}
export function localDate(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
export function readTasks(): Task[] {
  if (typeof window === "undefined") return initialTasks;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialTasks;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as Task[] : initialTasks;
  } catch {
    return initialTasks;
  }
}
export function writeTasks(tasks: Task[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }
}
export function formatDueDate(value: string) {
  if (!value) return "No date";
  const date = new Date(value + "T12:00:00");
  const now = new Date();
  const isToday = localDate(now) === value;
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  if (isToday) return "Today";
  if (localDate(tomorrowDate) === value) return "Tomorrow";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}