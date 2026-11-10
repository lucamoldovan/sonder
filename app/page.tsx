"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight, Bell, CalendarCheck, CalendarClock, CalendarDays, CalendarRange, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Command, Flag, Folder, Heart, Inbox, Layers, Pencil,
  LayoutDashboard, ListTodo, LogOut, NotebookPen, Plus, RefreshCw, Search, Target, Trash2, X
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";
import type { ApiCalendarEvent, ApiGoal, ApiHabit, ApiHabitEntry, ApiInboxItem, ApiLifeArea, ApiList, ApiProject, ApiTask } from "@/lib/api";

type View = "Today" | "Calendar" | "Organize" | "Inbox" | "Tasks" | "Projects" | "Goals" | "Habits" | "Life Areas";
type Priority = ApiTask["priority"];
type CommandResult = { id: string; title: string; subtitle: string | null; type: string };
type ApiNotification = { id: string; title: string; body: string | null; href: string | null; readAt: string | null; createdAt: string };
type ApiTimeBlock = { id: string; taskId: string; startsAt: string; endsAt: string; note: string | null };
type ApiMilestone = { id: string; goalId: string; title: string; description: string | null; targetDate: string | null; status: "pending" | "completed"; position: number; completedAt: string | null };

const defaultAreas = [
  { name: "School", color: "#F5F5F7", icon: "book-open" },
  { name: "Church", color: "#E6A2B0", icon: "heart" },
  { name: "Projects", color: "#82B8E7", icon: "layers" },
  { name: "Personal", color: "#D5B77D", icon: "compass" },
  { name: "Health", color: "#83C9A1", icon: "activity" }
];

function localDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function calendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftCalendarDate(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function mondayOfWeek(date: Date) {
  const result = new Date(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function formatEventTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function taskDateInputValue(value?: string | null, hasTime = false) {
  if (!value) return "";
  const date = new Date(value);
  const day = calendarDateKey(date);
  if (!hasTime) return day;
  return day + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
}

function taskDateInputToIso(value: string) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? value + "T12:00:00" : value + ":00");
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatTaskDateInput(value: string) {
  if (!value) return "Not set";
  const [day, time] = value.split("T");
  const date = new Date(day + "T12:00:00");
  const formatted = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return time ? formatted + " · " + time : formatted;
}

function taskHasExplicitTime(_value: string, hasTime = false) {
  return hasTime;
}

function TaskDatePicker({ label, value, onChange }: {
  label: "Schedule" | "Due date";
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const selected = value ? new Date(value.slice(0, 10) + "T12:00:00") : new Date();
    return new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
  });
  const selectedDay = value ? value.slice(0, 10) : "";
  const selectedTime = value.includes("T") ? value.slice(11, 16) : "";
  const hasTime = Boolean(selectedTime);
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    const offset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) =>
      new Date(first.getFullYear(), first.getMonth(), 1 - offset + index, 12)
    );
  }, [month]);

  function chooseDate(date: Date) {
    const day = calendarDateKey(date);
    onChange(hasTime ? day + "T" + (selectedTime || "09:00") : day);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  }

  function chooseRelative(offset: number) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    chooseDate(date);
  }

  function toggleTime(enabled: boolean) {
    if (!selectedDay) return;
    onChange(enabled ? selectedDay + "T" + (selectedTime || "09:00") : selectedDay);
  }

  const DateIcon = label === "Schedule" ? CalendarClock : CalendarCheck;

  return (
    <div className="task-date-field">
      <button type="button" className={"task-date-trigger " + (open ? "is-open" : "")} onClick={() => {
        if (!open) {
          const selected = selectedDay ? new Date(selectedDay + "T12:00:00") : new Date();
          setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1, 12));
        }
        setOpen(current => !current);
      }} aria-expanded={open}>
        <span className="task-date-symbol"><DateIcon size={16}/></span>
        <span className="task-date-copy"><strong>{label}</strong><small>{formatTaskDateInput(value)}</small></span>
        <ChevronDown size={15} className={open ? "task-date-chevron is-open" : "task-date-chevron"}/>
      </button>
      {open && <div className="task-date-panel" role="dialog" aria-label={label + " date picker"}>
        <div className="task-date-quick-actions">
          <button type="button" onClick={() => chooseRelative(0)}>Today</button>
          <button type="button" onClick={() => chooseRelative(1)}>Tomorrow</button>
          <button type="button" onClick={() => chooseRelative(7)}>Next week</button>
          {value && <button type="button" className="task-date-clear" onClick={() => onChange("")}>Clear</button>}
        </div>
        <div className="task-date-calendar-heading">
          <strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
          <span>
            <button type="button" onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1, 12))} aria-label="Previous month"><ChevronLeft size={16}/></button>
            <button type="button" onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1, 12))} aria-label="Next month"><ChevronRight size={16}/></button>
          </span>
        </div>
        <div className="task-date-weekdays">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={day + index}>{day}</span>)}</div>
        <div className="task-date-grid">
          {days.map(date => {
            const day = calendarDateKey(date);
            const isSelected = day === selectedDay;
            const isToday = day === calendarDateKey(new Date());
            const isCurrentMonth = date.getMonth() === month.getMonth();
            return <button key={day} type="button" className={[
              isSelected ? "selected" : "",
              isToday ? "today" : "",
              !isCurrentMonth ? "outside-month" : ""
            ].filter(Boolean).join(" ")} onClick={() => chooseDate(date)}>{date.getDate()}</button>;
          })}
        </div>
        <div className="task-date-time-row">
          <label><input type="checkbox" checked={hasTime} disabled={!selectedDay} onChange={event => toggleTime(event.target.checked)}/> Add a time</label>
          {hasTime && <input aria-label={label + " time"} type="time" value={selectedTime} onChange={event => onChange(selectedDay + "T" + event.target.value)}/>}
        </div>
      </div>}
    </div>
  );
}

export default function Home() {
  const { data: session, isPending: sessionPending, refetch } = authClient.useSession();
  const [view, setView] = useState<View>("Today");
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [areas, setAreas] = useState<ApiLifeArea[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [inbox, setInbox] = useState<ApiInboxItem[]>([]);
  const [goals, setGoals] = useState<ApiGoal[]>([]);
  const [habits, setHabits] = useState<ApiHabit[]>([]);
  const [habitEntries, setHabitEntries] = useState<ApiHabitEntry[]>([]);
  const [events, setEvents] = useState<ApiCalendarEvent[]>([]);
  const [calendarRangeEvents, setCalendarRangeEvents] = useState<ApiCalendarEvent[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<ApiTimeBlock[]>([]);
  const [milestones, setMilestones] = useState<Record<string, ApiMilestone[]>>({});
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTask, setScheduleTask] = useState("");
  const [scheduleDate, setScheduleDate] = useState(calendarDateKey(new Date()));
  const [scheduleStart, setScheduleStart] = useState("09:00");
  const [scheduleEnd, setScheduleEnd] = useState("10:00");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [calendarMode, setCalendarMode] = useState<"month" | "week" | "day">("month");
  const [eventEditingId, setEventEditingId] = useState<string | null>(null);
  const [eventDescription, setEventDescription] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventProject, setEventProject] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandResults, setCommandResults] = useState<CommandResult[]>([]);
  const [commandLoading, setCommandLoading] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [filterArea, setFilterArea] = useState("all");
  const [taskFilter, setTaskFilter] = useState<"open" | "completed" | "all">("open");
  const [capture, setCapture] = useState("");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskEditingId, setTaskEditingId] = useState<string | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<"active" | "completed" | "archived" | "all">("active");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskScheduled, setTaskScheduled] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskExpanded, setTaskExpanded] = useState(false);
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskPriority, setTaskPriority] = useState<Priority>("medium");
  const [taskArea, setTaskArea] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [taskGoal, setTaskGoal] = useState("");
  const [taskParent, setTaskParent] = useState("");
  const [taskRepeat, setTaskRepeat] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [taskRepeatInterval, setTaskRepeatInterval] = useState("1");
  const [taskRepeatUntil, setTaskRepeatUntil] = useState("");
  const [taskReminder, setTaskReminder] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDueDate, setProjectDueDate] = useState("");
  const [projectGoal, setProjectGoal] = useState("");
  const [projectArea, setProjectArea] = useState("");
  const [goalOpen, setGoalOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalEditingId, setGoalEditingId] = useState<string | null>(null);
  const [goalDate, setGoalDate] = useState("");
  const [goalArea, setGoalArea] = useState("");
  const [habitName, setHabitName] = useState("");
  const [habitFrequency, setHabitFrequency] = useState<"daily" | "weekdays" | "weekly">("daily");
  const [habitArea, setHabitArea] = useState("");
  const [habitGoal, setHabitGoal] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [eventArea, setEventArea] = useState("");
  const [areaName, setAreaName] = useState("");
  const [areaColor, setAreaColor] = useState("#F5F5F7");

  const loadWorkspace = useCallback(async () => {
    try {
      const [workspace, blockResult] = await Promise.all([apiRequest<ApiList<{
        tasks: ApiTask[];
        lifeAreas: ApiLifeArea[];
        projects: ApiProject[];
        inbox: ApiInboxItem[];
        goals: ApiGoal[];
        habits: ApiHabit[];
        habitEntries: ApiHabitEntry[];
        events: ApiCalendarEvent[];
      }>>("/workspace/dashboard"), apiRequest<ApiList<ApiTimeBlock[]>>("/time-blocks")]);

      let loadedAreas = workspace.data.lifeAreas;
      if (loadedAreas.length === 0) {
        await Promise.all(defaultAreas.map((area, position) =>
          apiRequest("/life-areas", {
            method: "POST",
            body: JSON.stringify({ ...area, position })
          })
        ));
        const seeded = await apiRequest<ApiList<ApiLifeArea[]>>("/life-areas");
        loadedAreas = seeded.data;
      }

      setError("");
      setTasks(workspace.data.tasks);
      setAreas(loadedAreas);
      setProjects(workspace.data.projects);
      setInbox(workspace.data.inbox);
      setGoals(workspace.data.goals);
      setHabits(workspace.data.habits);
      setHabitEntries(workspace.data.habitEntries);
      setEvents(workspace.data.events);
      setTimeBlocks(blockResult.data);
      const milestoneResults = await Promise.all(workspace.data.goals.map(goal =>
        apiRequest<ApiList<ApiMilestone[]>>("/goals/" + goal.id + "/milestones")
      ));
      setMilestones(Object.fromEntries(workspace.data.goals.map((goal, index) => [goal.id, milestoneResults[index].data])));
      const notificationResult = await apiRequest<{ data: ApiNotification[]; unreadCount: number }>("/workspace/notifications");
      setNotifications(notificationResult.data);
      setTaskArea(current => loadedAreas.some(area => area.id === current) ? current : loadedAreas[0]?.id || "");
      setTaskProject("");
      setFilterArea(current => current === "all" || loadedAreas.some(area => area.id === current) ? current : "all");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load your workspace.");
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); }
      if (event.key === "Escape") { setCommandOpen(false); setCaptureOpen(false); if (!taskBusy) setTaskOpen(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [taskBusy]);

  useEffect(() => {
    if (!commandOpen || commandQuery.trim().length < 2) { setCommandResults([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCommandLoading(true);
      try {
        const result = await apiRequest<ApiList<CommandResult[]>>("/workspace/search?q=" + encodeURIComponent(commandQuery.trim()));
        if (!cancelled) setCommandResults(result.data);
      } catch { if (!cancelled) setCommandResults([]); }
      finally { if (!cancelled) setCommandLoading(false); }
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [commandOpen, commandQuery]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (!cancelled) void loadWorkspace();
    });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, loadWorkspace]);

  useEffect(() => {
    if (view !== "Calendar" || !session?.user?.id) return;
    let cancelled = false;
    const monthStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1, 12);
    const visibleStart = calendarMode === "month" ? mondayOfWeek(monthStart)
      : calendarMode === "week" ? mondayOfWeek(calendarDate) : calendarDate;
    const visibleDays = calendarMode === "month" ? 42 : calendarMode === "week" ? 7 : 1;
    const from = new Date(visibleStart);
    from.setHours(0, 0, 0, 0);
    const to = shiftCalendarDate(visibleStart, visibleDays);
    to.setHours(23, 59, 59, 999);
    void apiRequest<ApiList<ApiCalendarEvent[]>>(
      "/calendar?from=" + encodeURIComponent(from.toISOString()) + "&to=" + encodeURIComponent(to.toISOString())
    ).then(result => {
      if (cancelled) return;
      setCalendarRangeEvents(result.data);
    }).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Couldn't load this calendar range.");
    });
    return () => { cancelled = true; };
  }, [view, session?.user?.id, calendarDate, calendarMode]);

  const today = localDate(new Date().toISOString());
  const isOrganizeView = view === "Organize" || ["Inbox", "Tasks", "Projects", "Goals", "Habits", "Life Areas"].includes(view);
  const weekStart = mondayOfWeek(new Date());
  const weekStartKey = calendarDateKey(weekStart);
  const completedThisWeek = tasks.filter(task => task.status === "done" && task.completedAt && localDate(task.completedAt) >= weekStartKey).length;
  const checkinsThisWeek = habitEntries.filter(entry => entry.entryDate >= weekStartKey).length;
  const openTasks = tasks.filter(task => !["done", "cancelled"].includes(task.status));
  const dueToday = openTasks.filter(task => task.dueAt && localDate(task.dueAt) === today);
  const overdue = openTasks.filter(task => task.dueAt && localDate(task.dueAt) < today);
  const todayEvents = events.filter(item => localDate(item.startsAt) === today).sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const todayBlocks = timeBlocks.filter(item => localDate(item.startsAt) === today).sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const todayScheduledTasks = openTasks.filter(task => task.scheduledAt && localDate(task.scheduledAt) === today);
  const todayCommitmentCount = todayEvents.length + todayBlocks.length + todayScheduledTasks.length;
  const todayAgendaItems = [
    ...todayEvents.map(item => ({ id: item.id, kind: "event" as const, startsAt: item.startsAt, endsAt: item.endsAt, title: item.title, subtitle: item.location, allDay: item.allDay, event: item })),
    ...todayBlocks.map(item => ({ id: item.id, kind: "block" as const, startsAt: item.startsAt, endsAt: item.endsAt, title: tasks.find(task => task.id === item.taskId)?.title || "Scheduled work", subtitle: null, allDay: false, block: item })),
    ...todayScheduledTasks.map(item => ({ id: item.id, kind: "task" as const, startsAt: item.scheduledAt!, endsAt: null, title: item.title, subtitle: null, allDay: !item.scheduledHasTime, task: item }))
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const currentWeekStart = calendarDateKey(mondayOfWeek(new Date()));
  const habitsDueToday = habits.filter(habit => {
    if (habit.archivedAt) return false;
    if (habit.frequency === "daily") return true;
    if (habit.frequency === "weekdays") return new Date().getDay() !== 0 && new Date().getDay() !== 6;
    const completedThisWeek = habitEntries.filter(entry => entry.habitId === habit.id && entry.entryDate >= currentWeekStart).length;
    const checkedInToday = habitEntries.some(entry => entry.habitId === habit.id && entry.entryDate === today);
    return checkedInToday || completedThisWeek < habit.targetPerWeek;
  });
  const nextActionTasks = [...openTasks]
    .filter(task => task.status === "in_progress" || (task.dueAt && localDate(task.dueAt) <= today) || (task.scheduledAt && localDate(task.scheduledAt) <= today) || task.priority === "urgent" || task.priority === "high")
    .sort((a,b) => {
      const aOverdue = a.dueAt && localDate(a.dueAt) < today ? 0 : 1;
      const bOverdue = b.dueAt && localDate(b.dueAt) < today ? 0 : 1;
      const dueOrder = (a.dueAt || a.scheduledAt || "9999").localeCompare(b.dueAt || b.scheduledAt || "9999");
      const priorityOrder = ["urgent","high","medium","low"].indexOf(a.priority) - ["urgent","high","medium","low"].indexOf(b.priority);
      return aOverdue - bOverdue || dueOrder || priorityOrder;
    }).slice(0, 5);
  const visibleTasks = useMemo(() => tasks
    .filter(task => taskFilter === "all" || (taskFilter === "completed" ? task.status === "done" : !["done", "cancelled"].includes(task.status)))
    .filter(task => (filterArea === "all" || task.lifeAreaId === filterArea) && (task.title + " " + (task.description || "")).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (taskFilter === "completed") return (b.completedAt || "").localeCompare(a.completedAt || "");
      const aOverdue = a.dueAt && localDate(a.dueAt) < today ? 0 : 1;
      const bOverdue = b.dueAt && localDate(b.dueAt) < today ? 0 : 1;
      const dueOrder = (a.dueAt || a.scheduledAt || "9999").localeCompare(b.dueAt || b.scheduledAt || "9999");
      const priorityOrder = ["urgent", "high", "medium", "low"].indexOf(a.priority) - ["urgent", "high", "medium", "low"].indexOf(b.priority);
      return aOverdue - bOverdue || dueOrder || priorityOrder;
    }),
  [tasks, query, filterArea, taskFilter, today]);

  async function markNotificationRead(item: ApiNotification) {
    if (!item.readAt) {
      try {
        const result = await apiRequest<ApiList<ApiNotification>>("/workspace/notifications/" + item.id + "/read", { method: "PATCH" });
        setNotifications(current => current.map(notification => notification.id === item.id ? result.data : notification));
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update the notification."); }
    }
    if (item.href) window.location.href = item.href;
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = authMode === "signup"
        ? await authClient.signUp.email({ name: authName.trim(), email: authEmail.trim(), password: authPassword })
        : await authClient.signIn.email({ email: authEmail.trim(), password: authPassword });
      if (result.error) throw new Error(result.error.message || "Authentication failed.");
      await refetch();
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : "Couldn't authenticate.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/"
      });
      if (result.error) throw new Error(result.error.message || "Google sign-in failed.");
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : "Google sign-in failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  function openNewTask() {
    if (taskBusy) return;
    setTaskEditingId(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskArea("");
    setTaskPriority("medium");
    setTaskScheduled("");
    setTaskDue("");
    setTaskExpanded(false);
    setTaskProject("");
    setTaskGoal("");
    setTaskParent("");
    setTaskRepeat("none");
    setTaskRepeatInterval("1");
    setTaskRepeatUntil("");
    setTaskReminder("");
    setTaskOpen(true);
  }

  function openEditTask(task: ApiTask) {
    setTaskEditingId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description || "");
    setTaskArea(task.lifeAreaId || "");
    setTaskPriority(task.priority);
    setTaskScheduled(task.scheduledAt ? taskDateInputValue(task.scheduledAt, task.scheduledHasTime) : "");
    setTaskDue(task.dueAt ? taskDateInputValue(task.dueAt, task.dueHasTime) : "");
    setTaskExpanded(true);
    setTaskProject(task.projectId || "");
    setTaskGoal(task.goalId || "");
    setTaskParent(task.parentTaskId || "");
    setTaskRepeat(task.recurrenceFrequency || "none");
    setTaskRepeatInterval(String(task.recurrenceInterval || 1));
    setTaskRepeatUntil(task.recurrenceUntil || "");
    if (task.reminderAt) {
      const reminder = new Date(task.reminderAt);
      setTaskReminder(new Date(reminder.getTime() - reminder.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    } else setTaskReminder("");
    setTaskOpen(true);
  }

  async function createTask(event: FormEvent) {
    event.preventDefault();
    if (!taskTitle.trim() || taskBusy) return;
    if (taskRepeat !== "none" && !taskDue) { setError("Choose a due date for a recurring task."); return; }
    if (taskRepeat !== "none" && (!Number.isInteger(Number(taskRepeatInterval)) || Number(taskRepeatInterval) < 1 || Number(taskRepeatInterval) > 52)) { setError("Repeat interval must be between 1 and 52."); return; }
    setTaskBusy(true);
    try {
      const scheduledAt = taskDateInputToIso(taskScheduled);
      const dueAt = taskDateInputToIso(taskDue);
      const payload = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        scheduledAt,
        scheduledHasTime: Boolean(taskScheduled && taskScheduled.includes("T")),
        dueAt,
        dueHasTime: Boolean(taskDue && taskDue.includes("T")),
        priority: taskPriority,
        lifeAreaId: taskArea || null,
        projectId: taskProject || null,
        goalId: taskGoal || projects.find(project => project.id === taskProject)?.goalId || null,
        parentTaskId: taskParent || null,
        reminderAt: taskReminder ? new Date(taskReminder).toISOString() : null,
        recurrenceFrequency: taskRepeat === "none" ? null : taskRepeat,
        recurrenceInterval: Number(taskRepeatInterval),
        recurrenceUntil: taskRepeatUntil || null
      };
      const result = await apiRequest<ApiList<ApiTask>>(taskEditingId ? "/tasks/" + taskEditingId : "/tasks", {
        method: taskEditingId ? "PATCH" : "POST",
        body: JSON.stringify(taskEditingId ? payload : { ...payload, status: "todo" })
      });
      setTasks(current => taskEditingId
        ? current.map(item => item.id === taskEditingId ? result.data : item)
        : [result.data, ...current]);
      setTaskTitle("");
      setTaskDescription("");
      setTaskScheduled("");
      setTaskDue("");
      setTaskProject("");
      setTaskGoal("");
      setTaskParent("");
      setTaskRepeat("none");
      setTaskRepeatInterval("1");
      setTaskRepeatUntil("");
      setTaskReminder("");
      setTaskOpen(false);
      setTaskExpanded(false);
      setNotice(taskEditingId ? "Task updated." : "Task created.");
      setTaskEditingId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create the task.");
    } finally {
      setTaskBusy(false);
    }
  }
  async function toggleTask(task: ApiTask) {
    const status = task.status === "done" ? "todo" : "done";
    try {
      const result = await apiRequest<{ data: ApiTask; nextOccurrence?: ApiTask | null }>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setTasks(current => [...current.map(item => item.id === task.id ? result.data : item), ...(result.nextOccurrence ? [result.nextOccurrence] : [])]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't update the task.");
    }
  }

  async function deleteTask(id: string) {
    try {
      await apiRequest(`/tasks/${id}`, { method: "DELETE" });
      setTasks(current => current.filter(task => task.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't delete the task.");
    }
  }

  async function quickCapture(event: FormEvent) {
    event.preventDefault();
    if (!capture.trim()) return;
    try {
      const result = await apiRequest<ApiList<ApiInboxItem>>("/inbox", {
        method: "POST",
        body: JSON.stringify({ title: capture.trim(), type: "task" })
      });
      setInbox(current => [result.data, ...current]);
      setCapture("");
      setCaptureOpen(false);
      setNotice("Saved to your inbox.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save that item.");
    }
  }

  async function convertInboxItem(item: ApiInboxItem) {
    try {
      const result = await apiRequest<ApiList<{ inboxItem: ApiInboxItem; task: ApiTask }>>(
        `/inbox/${item.id}/convert-to-task`, { method: "POST" }
      );
      setInbox(current => current.filter(entry => entry.id !== item.id));
      setTasks(current => [result.data.task, ...current]);
      setNotice("Inbox item converted into a task.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't convert the inbox item.");
    }
  }

  async function convertInboxToNote(item: ApiInboxItem) {
    try {
      await apiRequest(`/inbox/${item.id}/convert-to-note`, { method: "POST" });
      setInbox(current => current.filter(entry => entry.id !== item.id));
      setNotice("Inbox item converted into a note.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not convert the inbox item."); }
  }

  async function convertInboxToEvent(item: ApiInboxItem) {
    const value = window.prompt("When should this happen? Enter YYYY-MM-DD HH:MM");
    if (!value) return;
    const parsedDate = new Date(value.trim().replace(" ", "T"));
    if (Number.isNaN(parsedDate.getTime())) { setError("Use a date like 2026-11-12 14:30."); return; }
    try {
      await apiRequest(`/inbox/${item.id}/convert-to-event`, { method: "POST", body: JSON.stringify({ startsAt: parsedDate.toISOString() }) });
      setInbox(current => current.filter(entry => entry.id !== item.id));
      await loadWorkspace();
      setNotice("Inbox item added to your calendar.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not convert the inbox item."); }
  }

  async function archiveInboxItem(item: ApiInboxItem) {
    try {
      await apiRequest(`/inbox/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "archived" })
      });
      setInbox(current => current.filter(entry => entry.id !== item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't archive the item.");
    }
  }

  async function moveTimeBlock(id: string, date: Date, hour: number) {
    const block = timeBlocks.find(item => item.id === id);
    if (!block) return;
    const startsAt = new Date(date);
    startsAt.setHours(hour, 0, 0, 0);
    const duration = new Date(block.endsAt).getTime() - new Date(block.startsAt).getTime();
    const endsAt = new Date(startsAt.getTime() + duration);
    try {
      const result = await apiRequest<ApiList<ApiTimeBlock> & { conflicts?: { id: string }[] }>("/time-blocks/" + id, {
        method: "PATCH", body: JSON.stringify({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() })
      });
      setTimeBlocks(current => current.map(item => item.id === id ? result.data : item).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)));
      setNotice(result.conflicts?.length ? "Work block moved. It overlaps another block." : "Work block moved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not move the work block."); }
  }

  async function createTimeBlock(event: FormEvent) {
    event.preventDefault();
    if (!scheduleTask || !scheduleDate) return;
    try {
      const result = await apiRequest<ApiList<ApiTimeBlock> & { conflicts?: { id: string }[] }>("/time-blocks", {
        method: "POST",
        body: JSON.stringify({
          taskId: scheduleTask,
          startsAt: new Date(scheduleDate + "T" + scheduleStart).toISOString(),
          endsAt: new Date(scheduleDate + "T" + scheduleEnd).toISOString()
        })
      });
      setTimeBlocks(current => [...current, result.data].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setScheduleOpen(false);
      setNotice(result.conflicts?.length ? "Task scheduled. There is an overlap with another work block." : "Task scheduled.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not schedule task."); }
  }

  async function addMilestone(goalId: string) {
    const title = window.prompt("Milestone name");
    if (!title?.trim()) return;
    try {
      const result = await apiRequest<ApiList<ApiMilestone>>("/goals/" + goalId + "/milestones", {
        method: "POST", body: JSON.stringify({ title: title.trim(), position: milestones[goalId]?.length ?? 0 })
      });
      setMilestones(current => ({ ...current, [goalId]: [...(current[goalId] ?? []), result.data] }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add milestone."); }
  }

  async function toggleMilestone(goalId: string, milestone: ApiMilestone) {
    const status = milestone.status === "completed" ? "pending" : "completed";
    try {
      const result = await apiRequest<ApiList<ApiMilestone>>("/milestones/" + milestone.id, { method: "PATCH", body: JSON.stringify({ status }) });
      setMilestones(current => ({ ...current, [goalId]: (current[goalId] ?? []).map(item => item.id === milestone.id ? result.data : item) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update milestone."); }
  }

  function openNewGoal() {
    setGoalEditingId(null);
    setGoalTitle("");
    setGoalDescription("");
    setGoalDate("");
    setGoalArea("");
    setGoalOpen(true);
  }

  function openEditGoal(goal: ApiGoal) {
    setGoalEditingId(goal.id);
    setGoalTitle(goal.title);
    setGoalDescription(goal.description || "");
    setGoalDate(goal.targetDate || "");
    setGoalArea(goal.lifeAreaId || "");
    setGoalOpen(true);
  }

  async function createGoal(event: FormEvent) {
    event.preventDefault();
    if (!goalTitle.trim()) return;
    try {
      const payload = { title: goalTitle.trim(), description: goalDescription.trim() || null, targetDate: goalDate || null, lifeAreaId: goalArea || null };
      const result = await apiRequest<ApiList<ApiGoal>>(goalEditingId ? "/goals/" + goalEditingId : "/goals", { method: goalEditingId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setGoals(current => goalEditingId ? current.map(item => item.id === goalEditingId ? result.data : item) : [...current, result.data]);
      setGoalTitle(""); setGoalDescription(""); setGoalDate(""); setGoalArea(""); setGoalOpen(false);
      setNotice(goalEditingId ? "Goal updated." : "Goal created."); setGoalEditingId(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the goal."); }
  }

  function openNewHabit() {
    setHabitName("");
    setHabitFrequency("daily");
    setHabitArea("");
    setHabitGoal("");
    setHabitOpen(true);
  }

  async function createHabit(event: FormEvent) {
    event.preventDefault();
    if (!habitName.trim()) return;
    try {
      const result = await apiRequest<ApiList<ApiHabit>>("/habits", { method: "POST", body: JSON.stringify({ name: habitName.trim(), frequency: habitFrequency, targetPerWeek: habitFrequency === "daily" ? 7 : habitFrequency === "weekdays" ? 5 : 1, lifeAreaId: habitArea || null, goalId: habitGoal || null }) });
      setHabits(current => [...current, result.data]); setHabitName(""); setHabitArea(""); setHabitGoal(""); setHabitOpen(false); setNotice("Habit created.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the habit."); }
  }

  async function checkInHabit(habit: ApiHabit) {
    const today = localDate(new Date().toISOString());
    const existing = habitEntries.find(entry => entry.habitId === habit.id && entry.entryDate === today);
    try {
      if (existing) {
        await apiRequest("/habits/" + habit.id + "/check-in/" + today, { method: "DELETE" });
        setHabitEntries(current => current.filter(entry => entry.id !== existing.id));
      } else {
        const result = await apiRequest<ApiList<ApiHabitEntry>>("/habits/" + habit.id + "/check-in", { method: "POST", body: JSON.stringify({ date: today }) });
        setHabitEntries(current => [result.data, ...current]);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update the habit."); }
  }

  function openNewEvent(date = calendarDateKey(calendarDate)) {
    setEventEditingId(null);
    setEventTitle("");
    setEventDate(date);
    setEventTime("09:00");
    setEventEndTime("10:00");
    setEventArea("");
    setEventDescription("");
    setEventLocation("");
    setEventProject("");
    setEventAllDay(false);
    setEventOpen(true);
  }

  function openEditEvent(item: ApiCalendarEvent) {
    setEventEditingId(item.id);
    setEventTitle(item.title);
    setEventDate(localDate(item.startsAt));
    setEventTime(item.allDay ? "09:00" : new Date(item.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    setEventEndTime(item.endsAt ? new Date(item.endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "10:00");
    setEventArea(item.lifeAreaId || "");
    setEventDescription(item.description || "");
    setEventLocation(item.location || "");
    setEventProject(item.projectId || "");
    setEventAllDay(item.allDay);
    setEventOpen(true);
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;
    try {
      const startsAt = new Date(eventDate + "T" + (eventAllDay ? "00:00" : eventTime) + ":00").toISOString();
      const endsAt = eventAllDay ? null : new Date(eventDate + "T" + eventEndTime + ":00").toISOString();
      if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
        setError("The end time must be after the start time.");
        return;
      }
      const payload = {
        title: eventTitle.trim(),
        description: eventDescription.trim() || null,
        location: eventLocation.trim() || null,
        startsAt,
        endsAt,
        allDay: eventAllDay,
        lifeAreaId: eventArea || null,
        projectId: eventProject || null
      };
      const result = await apiRequest<ApiList<ApiCalendarEvent>>(
        eventEditingId ? "/calendar/" + eventEditingId : "/calendar",
        { method: eventEditingId ? "PATCH" : "POST", body: JSON.stringify(payload) }
      );
      setEvents(current => [...current.filter(item => item.id !== result.data.id), result.data].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setCalendarRangeEvents(current => [...current.filter(item => item.id !== result.data.id), result.data].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setEventOpen(false);
      setEventEditingId(null);
      setNotice(eventEditingId ? "Event updated." : "Event added to your calendar.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the event."); }
  }

  async function deleteEvent(id: string) {
    try { await apiRequest("/calendar/" + id, { method: "DELETE" }); setEvents(current => current.filter(item => item.id !== id)); setCalendarRangeEvents(current => current.filter(item => item.id !== id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete the event."); }
  }

  async function createArea(event: FormEvent) {
    event.preventDefault();
    if (!areaName.trim()) return;
    try {
      const result = await apiRequest<ApiList<ApiLifeArea>>("/life-areas", { method: "POST", body: JSON.stringify({ name: areaName.trim(), color: areaColor, position: areas.length }) });
      setAreas(current => [...current, result.data]); setAreaName(""); setAreaOpen(false); setNotice("Life area created.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the life area."); }
  }

  async function deleteArea(area: ApiLifeArea) {
    if (!window.confirm("Delete " + area.name + "? Existing tasks and projects will become unassigned.")) return;
    try {
      await apiRequest("/life-areas/" + area.id, { method: "DELETE" });
      setAreas(current => current.filter(item => item.id !== area.id));
      setTasks(current => current.map(task => task.lifeAreaId === area.id ? { ...task, lifeAreaId: null } : task));
      setProjects(current => current.map(project => project.lifeAreaId === area.id ? { ...project, lifeAreaId: null } : project));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete the life area."); }
  }

  function openNewProject() {
    setProjectName("");
    setProjectDescription("");
    setProjectDueDate("");
    setProjectGoal("");
    setProjectArea("");
    setProjectOpen(true);
  }

  async function createProject(event: FormEvent) {
    event.preventDefault();
    if (!projectName.trim()) return;
    try {
      const result = await apiRequest<ApiList<ApiProject>>("/projects", {
        method: "POST",
        body: JSON.stringify({ name: projectName.trim(), description: projectDescription.trim() || null, dueDate: projectDueDate || null, goalId: projectGoal || null, lifeAreaId: projectArea || null })
      });
      setProjects(current => [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      setProjectName("");
      setProjectDescription("");
      setProjectDueDate("");
      setProjectGoal("");
      setProjectArea("");
      setProjectOpen(false);
      setNotice("Project created.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create the project.");
    }
  }

  if (sessionPending) return <main className="auth-screen"><div className="brand-lockup"><span className="brand-wordmark">sonder</span></div><p>Opening your space…</p></main>;

  if (!session?.user) return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="brand-lockup"><span className="brand-wordmark">sonder</span></div>
        <div className="eyebrow">YOUR LIFE, IN PERSPECTIVE</div>
        <h1>{authMode === "signup" ? "Make space for what matters." : "Welcome back."}</h1>
        <p className="subheading">A calm place for everything you&apos;re carrying.</p>
        <form onSubmit={handleAuth} className="auth-form">
          {authMode === "signup" && <label className="form-label">Your name<input required autoComplete="name" value={authName} onChange={event => setAuthName(event.target.value)} placeholder="How should we call you?" /></label>}
          <label className="form-label">Email<input required type="email" autoComplete="email" value={authEmail} onChange={event => setAuthEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label className="form-label">Password<input required type="password" minLength={8} autoComplete={authMode === "signup" ? "new-password" : "current-password"} value={authPassword} onChange={event => setAuthPassword(event.target.value)} placeholder="At least 8 characters" /></label>
          {authError && <p className="inline-error">{authError}</p>}
          <button className="primary-button auth-submit" disabled={authBusy}>{authBusy ? "Please wait…" : authMode === "signup" ? "Create free account" : "Sign in"}<ArrowRight size={16} /></button>
          {process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" && <button type="button" className="google-button" disabled={authBusy} onClick={() => void handleGoogleSignIn()}>Continue with Google</button>}
        </form>
        <p className="auth-switch">{authMode === "signup" ? "Already have an account?" : "New to Sonder?"} <button onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setAuthError(""); }}>{authMode === "signup" ? "Sign in" : "Create an account"}</button></p>
        <p className="auth-footnote">Free to use. Your data belongs to you.</p>
      </div>
    </main>
  );

  return (
    <main className="app-shell">
      <section className="main-area">
        <header className="topbar">
          <div className="topbar-brand">
            <Link className="brand" href="/" aria-label="Sonder home"><span className="brand-name">sonder</span></Link>
            <nav className="workspace-nav" aria-label="Main navigation">
              <button className={`workspace-nav-item ${view === "Today" ? "active" : ""}`} onClick={() => setView("Today")}><LayoutDashboard size={16} strokeWidth={1.8}/><span>Today</span></button>
              <button className={`workspace-nav-item ${view === "Calendar" ? "active" : ""}`} onClick={() => setView("Calendar")}><CalendarRange size={16} strokeWidth={1.8}/><span>Calendar</span></button>
              <button className={`workspace-nav-item ${isOrganizeView ? "active" : ""}`} onClick={() => setView("Organize")}><Layers size={16} strokeWidth={1.8}/><span>Organize</span></button>
              <Link className="workspace-nav-item" href="/notes"><NotebookPen size={16} strokeWidth={1.8}/><span>Notes</span></Link>
            </nav>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setCaptureOpen(true)} aria-label="Quick capture" title="Quick capture"><Plus size={17}/></button>
            <button className="icon-button" onClick={() => setCommandOpen(true)} aria-label="Search everything" title="Search (Ctrl K)"><Search size={16}/></button>
            <button className="icon-button notification-trigger" onClick={() => setNotificationsOpen(value=>!value)} aria-label="Notifications"><Bell size={16}/>{notifications.some(item=>!item.readAt)&&<i/>}</button>
            <button className="icon-button topbar-refresh" onClick={() => void loadWorkspace()} aria-label="Refresh workspace" title="Refresh workspace"><RefreshCw size={15}/></button>
            <span className="topbar-divider"/>
            <div className="date-chip"><CalendarDays size={14} />{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
            <button className="profile-button" onClick={() => void authClient.signOut()} aria-label="Sign out" title={session.user.name + " · Sign out"}><span className="avatar top-avatar">{session.user.name?.slice(0, 1).toUpperCase() || "S"}</span><LogOut size={13}/></button>
          </div>
        </header>
        {captureOpen && <div className="capture-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setCaptureOpen(false); }}>
          <form className="capture-modal" onSubmit={quickCapture}>
            <div className="capture-modal-heading"><div><div className="section-kicker">QUICK CAPTURE</div><h2>Get it out of your head.</h2></div><button type="button" className="icon-button" onClick={() => setCaptureOpen(false)} aria-label="Close"><X size={16}/></button></div>
            <input autoFocus value={capture} onChange={event => setCapture(event.target.value)} placeholder="A task, thought, idea, or reminder…" aria-label="Capture item"/>
            <div className="capture-modal-actions"><span>Saved to your inbox. Sort it whenever you&apos;re ready.</span><button className="primary-button" disabled={!capture.trim()}>Capture</button></div>
          </form>
        </div>}
        {notificationsOpen && <div className="notification-popover"><div className="notification-popover-heading"><strong>Notifications</strong><button onClick={()=>setNotificationsOpen(false)}><X size={14}/></button></div>{notifications.length?notifications.map(item=><button className={"notification-row "+(!item.readAt?"unread":"")} key={item.id} onClick={()=>void markNotificationRead(item)}><span/><div><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></button>):<p className="notification-empty">You&apos;re all caught up.</p>}</div>}
        <div className="page-content">
          {(error || notice) && <div className={`workspace-message ${error ? "message-error" : ""}`}>{error || notice}<button onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss"><X size={14} /></button></div>}
          {view === "Today" && <>
            <div className="today-intro">
              <div>
                <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
                <h1>{greeting()}, {session.user.name?.split(" ")[0] || "there"}.</h1>
                <p className="subheading">Here’s what matters today. You don’t need to do everything at once.</p>
              </div>
              <button className="primary-button" onClick={openNewTask}><Plus size={17} />Add a task</button>
            </div>

            <form className="today-capture" onSubmit={quickCapture}>
              <Plus size={16}/><input value={capture} onChange={event => setCapture(event.target.value)} placeholder="Get it out of your head…"/>
              <button disabled={!capture.trim()}>Capture</button>
            </form>

            <div className="today-context-line">
              <span>{todayEvents.length + todayBlocks.length} scheduled {todayEvents.length + todayBlocks.length === 1 ? "commitment" : "commitments"}</span>
              <span className="context-separator">·</span>
              <span>{dueToday.length} {dueToday.length === 1 ? "task" : "tasks"} due today</span>
              {overdue.length > 0 && <><span className="context-separator">·</span><span className="today-overdue-count">{overdue.length} overdue</span></>}
            </div>

            <div className="today-layout">
              <div className="today-primary-column">
                <section className="today-section">
                  <div className="today-section-heading">
                    <div><div className="section-kicker">YOUR TIME</div><h2>Today&apos;s agenda</h2></div>
                    <button className="text-button" onClick={() => setView("Calendar")}>Open calendar <ArrowRight size={14}/></button>
                  </div>
                  {todayAgendaItems.length === 0
                    ? <div className="today-quiet-state"><CalendarDays size={18}/><div><strong>Nothing scheduled today.</strong><span>That’s room you can use—or leave free.</span></div></div>
                    : <div className="today-agenda-list">
                      {todayAgendaItems.map(item => <div className="today-agenda-row" key={item.kind + ":" + item.id}>
                        <span className="today-agenda-time">{item.allDay ? "All day" : formatEventTime(item.startsAt)}</span>
                        <span className={"today-agenda-marker " + (item.kind === "event" ? "event-marker" : item.kind === "task" ? "task-marker" : "block-marker")}/>
                        <div className="today-agenda-copy"><strong>{item.title}</strong><span>{item.kind === "block" ? formatEventTime(item.endsAt) + " · Work block" : item.kind === "task" ? "Planned task" : item.subtitle || (item.endsAt ? formatEventTime(item.endsAt) : "Calendar event")}</span></div>
                        {item.kind === "event"
                          ? <button className="text-button" onClick={() => openEditEvent(item.event)}>Edit</button>
                          : item.kind === "task"
                            ? <button className="text-button" onClick={() => openEditTask(item.task)}>Edit</button>
                            : <button className="text-button" onClick={() => setView("Calendar")}>View</button>}
                      </div>)}
                    </div>}
                </section>

                <section className="today-section">
                  <div className="today-section-heading">
                    <div><div className="section-kicker">WHAT NEEDS YOUR ATTENTION</div><h2>Next actions</h2></div>
                    <button className="text-button" onClick={() => setView("Tasks")}>All tasks <ArrowRight size={14}/></button>
                  </div>
                  {nextActionTasks.length > 0
                    ? <div className="today-task-list">{nextActionTasks.map(task => <TaskRow key={task.id} task={task} areas={areas} onToggle={toggleTask} onDelete={deleteTask} onEdit={openEditTask}/>)}</div>
                    : <div className="today-quiet-state"><Check size={18}/><div><strong>No urgent tasks asking for attention.</strong><span>You can choose something meaningful to work on, or enjoy the breathing room.</span></div></div>}
                  <button className="add-task-row" onClick={openNewTask}><Plus size={15}/>Add a task</button>
                </section>

                {habitsDueToday.length > 0 && <section className="today-section">
                  <div className="today-section-heading">
                    <div><div className="section-kicker">OPTIONAL CHECK-IN</div><h2>Small things, repeated</h2></div>
                    <button className="text-button" onClick={() => setView("Habits")}>Habits <ArrowRight size={14}/></button>
                  </div>
                  <div className="today-habits-list">{habitsDueToday.slice(0, 5).map(habit => {
                    const checked = habitEntries.some(entry => entry.habitId === habit.id && entry.entryDate === today);
                    return <div className="today-habit-row" key={habit.id}>
                      <button className={"task-check " + (checked ? "checked" : "")} onClick={() => void checkInHabit(habit)} aria-label={(checked ? "Undo check-in for " : "Check in ") + habit.name}>{checked && <Check size={12}/>}</button>
                      <span className={checked ? "is-checked" : ""}>{habit.name}</span>
                    </div>;
                  })}</div>
                </section>}
              </div>

              <aside className="today-secondary-column">
                {todayCommitmentCount > 0 && <section className="today-context-panel">
                  <div className="section-kicker">A NOTE FOR TODAY</div>
                  <h3>{todayCommitmentCount >= 5 || dueToday.length >= 4 ? "A full day ahead." : "Keep a little room."}</h3>
                  <p>{todayCommitmentCount >= 5 || dueToday.length >= 4
                    ? "You have several commitments today. Leave some space between them where you can."
                    : "Your schedule has some structure, but it doesn’t need to fill every minute."}</p>
                </section>}

                <section className="today-side-section">
                  <div className="today-section-heading compact">
                    <div><div className="section-kicker">IN THE NEAR FUTURE</div><h2>Coming up</h2></div>
                  </div>
                  {events.filter(item => new Date(item.startsAt) > new Date() && localDate(item.startsAt) !== today).sort((a,b) => a.startsAt.localeCompare(b.startsAt)).slice(0,4).map(item =>
                    <div className="today-upcoming-row" key={item.id}><span className="upcoming-dot"/><div><strong>{item.title}</strong><span>{new Date(item.startsAt).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})} · {item.allDay ? "All day" : formatEventTime(item.startsAt)}</span></div></div>
                  )}
                  {events.filter(item => new Date(item.startsAt) > new Date() && localDate(item.startsAt) !== today).length === 0 && <p className="today-muted-note">Nothing else on the calendar yet.</p>}
                </section>

                <section className="today-side-section">
                  <div className="today-section-heading compact">
                    <div><div className="section-kicker">LONGER-TERM DIRECTION</div><h2>Goals in progress</h2></div>
                    <button className="text-button" onClick={() => setView("Goals")}>View <ArrowRight size={13}/></button>
                  </div>
                  {goals.filter(goal => goal.status === "active").slice(0,3).map(goal => <div className="today-goal-row" key={goal.id}><span className="today-goal-dot"/><div><strong>{goal.title}</strong><span>{goal.targetDate ? "Target · " + new Date(goal.targetDate + "T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"}) : "Active goal"}</span></div></div>)}
                  {goals.filter(goal => goal.status === "active").length === 0 && <p className="today-muted-note">Your longer-term goals will appear here when you add them.</p>}
                </section>

                <button className="today-inbox-link" onClick={() => setView("Inbox")}><Inbox size={16}/><span><strong>{inbox.length} items to sort</strong><small>Capture now. Organize when you’re ready.</small></span><ArrowRight size={15}/></button>
              </aside>
            </div>
          </>}
          {view === "Organize" && <div className="section-page organize-page">
            <div className="welcome-row"><div><div className="eyebrow">ONE CONNECTED WORKSPACE</div><h1>Organize.</h1><p className="subheading">Everything has a place. Nothing needs to live in isolation.</p></div></div>
            <div className="organize-intro"><span className="section-kicker">YOUR PERSONAL SYSTEMS</span><p>Choose the part of your life you want to work on. Your tasks, projects, goals, habits and notes stay connected wherever they appear.</p></div>
            <div className="organize-list">
              <button className="organize-item" onClick={() => setView("Inbox")}><span className="organize-item-icon"><Inbox size={18}/></span><span><strong>Inbox</strong><small>Capture and sort things later</small></span><span className="organize-count">{inbox.length}</span><ArrowRight size={15}/></button>
              <button className="organize-item" onClick={() => setView("Tasks")}><span className="organize-item-icon"><ListTodo size={18}/></span><span><strong>Tasks</strong><small>Next actions and commitments</small></span><span className="organize-count">{openTasks.length}</span><ArrowRight size={15}/></button>
              <button className="organize-item" onClick={() => setView("Projects")}><span className="organize-item-icon"><Command size={18}/></span><span><strong>Projects</strong><small>Work that takes more than one step</small></span><span className="organize-count">{projects.filter(project => project.status === "active").length}</span><ArrowRight size={15}/></button>
              <button className="organize-item" onClick={() => setView("Goals")}><span className="organize-item-icon"><Flag size={18}/></span><span><strong>Goals</strong><small>Longer-term direction and milestones</small></span><span className="organize-count">{goals.filter(goal => goal.status === "active").length}</span><ArrowRight size={15}/></button>
              <button className="organize-item" onClick={() => setView("Habits")}><span className="organize-item-icon"><Heart size={18}/></span><span><strong>Habits</strong><small>Small practices you choose to repeat</small></span><span className="organize-count">{habits.filter(habit => !habit.archivedAt).length}</span><ArrowRight size={15}/></button>
              <button className="organize-item" onClick={() => setView("Life Areas")}><span className="organize-item-icon"><Target size={18}/></span><span><strong>Life areas</strong><small>Contexts that help organize your life</small></span><span className="organize-count">{areas.length}</span><ArrowRight size={15}/></button>
            </div>
          </div>}
          {view === "Inbox" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">CAPTURE NOW · ORGANIZE LATER</div><h1>Your inbox.</h1><p className="subheading">Get it out of your head. Decide what it means later.</p></div></div><form className="capture-form" onSubmit={quickCapture}><Plus size={18} /><input value={capture} onChange={event => setCapture(event.target.value)} placeholder="Capture a task, thought, idea…" /><button className="primary-button" disabled={!capture.trim()}>Add to inbox</button></form><section className="panel full-task-panel">{inbox.length ? inbox.map(item => <div className="inbox-row" key={item.id}><div className="inbox-item-copy"><strong>{item.title}</strong><span>{item.type} · {new Date(item.createdAt).toLocaleDateString()}</span>{item.content && <p>{item.content}</p>}</div><div className="inbox-actions"><button className="secondary-button" onClick={() => void convertInboxItem(item)}>Make task</button><button className="secondary-button" onClick={() => void convertInboxToNote(item)}>Make note</button><button className="secondary-button" onClick={() => void convertInboxToEvent(item)}>Make event</button><button className="icon-button" onClick={() => void archiveInboxItem(item)} aria-label="Archive"><Check size={16} /></button></div></div>) : <div className="empty-state"><Inbox size={20} /><strong>Your inbox is clear</strong><span>Capture anything you don&apos;t want to forget.</span></div>}</section></div>}
          {view === "Tasks" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">MAKE SPACE FOR WHAT MATTERS</div><h1>Your tasks.</h1><p className="subheading">Everything you&apos;re carrying, in one place.</p></div><button className="primary-button" onClick={openNewTask}><Plus size={17} />New task</button></div><div className="task-list-filters" role="group" aria-label="Task status">{([["open","Open"],["completed","Completed"],["all","All"]] as const).map(([value,label])=><button key={value} className={taskFilter===value?"selected":""} aria-pressed={taskFilter===value} onClick={()=>setTaskFilter(value)}>{label}<span>{value==="all"?tasks.length:value==="completed"?tasks.filter(task=>task.status==="done").length:openTasks.length}</span></button>)}</div><div className="task-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tasks…" /></div><select className="area-filter" value={filterArea} onChange={event => setFilterArea(event.target.value)}><option value="all">All life areas</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div><section className="panel full-task-panel">{visibleTasks.length ? visibleTasks.map(task => <TaskRow key={task.id} task={task} areas={areas} onToggle={toggleTask} onDelete={deleteTask} onEdit={openEditTask} />) : <div className="empty-state"><ListTodo size={20} /><strong>{taskFilter==="open"?"Nothing open right now":taskFilter==="completed"?"No completed tasks yet":"No tasks found"}</strong><span>{taskFilter==="open"?"You have room to choose what matters next.":taskFilter==="completed"?"Completed work will collect here.":"Try changing your search or filters."}</span></div>}</section></div>}
          {view === "Calendar" && (() => {
            const todayKey = calendarDateKey(new Date());
            const monthStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1, 12);
            const monthGridStart = mondayOfWeek(monthStart);
            const visibleDays = calendarMode === "month"
              ? Array.from({ length: 42 }, (_, index) => shiftCalendarDate(monthGridStart, index))
              : calendarMode === "week"
                ? Array.from({ length: 7 }, (_, index) => shiftCalendarDate(mondayOfWeek(calendarDate), index))
                : [calendarDate];
            const title = calendarMode === "day"
              ? calendarDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
              : calendarMode === "week"
                ? `${visibleDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${visibleDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                : calendarDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
            const moveCalendar = (direction: number) => setCalendarDate(current => {
              if (calendarMode === "month") {
                // Anchor to the first so moving from the 29th–31st never skips a month.
                return new Date(current.getFullYear(), current.getMonth() + direction, 1, 12);
              }
              return shiftCalendarDate(current, direction * (calendarMode === "week" ? 7 : 1));
            });
            const eventsFor = (date: Date) => calendarRangeEvents.filter(item => localDate(item.startsAt) === calendarDateKey(date));
            const tasksFor = (date: Date) => openTasks.filter(item => item.dueAt && localDate(item.dueAt) === calendarDateKey(date));
            const scheduledTasksFor = (date: Date) => openTasks.filter(item => item.scheduledAt && localDate(item.scheduledAt) === calendarDateKey(date));
            const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            return <div className="section-page calendar-workspace">
              <div className="calendar-heading">
                <div><div className="eyebrow">YOUR TIME, IN ONE PLACE</div><h1>Calendar</h1><p className="subheading">A clear view of what’s ahead.</p></div>
                <div className="calendar-heading-actions"><button className="secondary-button" onClick={() => { setScheduleDate(calendarDateKey(calendarDate)); setScheduleOpen(true); }}>Plan work session</button><button className="primary-button" onClick={() => openNewEvent()}><Plus size={16}/>Create event</button></div>
              </div>
              <section className="panel calendar-main-panel">
                <div className="calendar-toolbar">
                  <div className="calendar-navigation">
                    <button className="icon-button" onClick={() => moveCalendar(-1)} aria-label="Previous period"><ChevronLeft size={18}/></button>
                    <button className="icon-button" onClick={() => moveCalendar(1)} aria-label="Next period"><ChevronRight size={18}/></button>
                    <button className="secondary-button calendar-today-button" onClick={() => setCalendarDate(new Date())}>Today</button>
                    <h2>{title}</h2>
                  </div>
                  <div className="calendar-view-switch" role="group" aria-label="Calendar view">
                    {(["month", "week", "day"] as const).map(mode => <button key={mode} className={calendarMode === mode ? "selected" : ""} onClick={() => setCalendarMode(mode)}>{mode[0].toUpperCase()+mode.slice(1)}</button>)}
                  </div>
                </div>
                {calendarMode === "month" ? <div className="month-calendar">
                  <div className="month-weekdays">{dayNames.map(day => <div key={day}>{day}</div>)}</div>
                  <div className="month-grid">{visibleDays.map(date => {
                    const key = calendarDateKey(date);
                    const dayEvents = eventsFor(date);
                    const dayTasks = tasksFor(date);
                    const dayScheduledTasks = scheduledTasksFor(date);
                    const dayTaskEntries = [
                      ...dayScheduledTasks.map(item => ({ ...item, calendarKind: "scheduled" as const, hasSameDayDeadline: Boolean(item.dueAt && localDate(item.dueAt) === key) })),
                      ...dayTasks.filter(item => !item.scheduledAt || localDate(item.scheduledAt) !== key).map(item => ({ ...item, calendarKind: "deadline" as const, hasSameDayDeadline: false }))
                    ];
                    const dayBlocks = timeBlocks.filter(block => localDate(block.startsAt) === key);
                    const isCurrentMonth = date.getMonth() === calendarDate.getMonth();
                    return <button key={key} className={`month-day ${isCurrentMonth ? "" : "outside-month"} ${key === todayKey ? "is-today" : ""} ${key === calendarDateKey(calendarDate) ? "is-selected" : ""}`} onClick={() => { setCalendarDate(date); setCalendarMode("day"); }}>
                      <span className="month-day-number">{date.getDate()}</span>
                      <span className="month-day-items">
                        {dayEvents.slice(0, 3).map(item => <span key={item.id} className="month-event" style={{ "--event-color": areas.find(area => area.id === item.lifeAreaId)?.color || "#F5F5F7" } as CSSProperties} onClick={event => { event.stopPropagation(); openEditEvent(item); }}>{item.title}</span>)}
                        {dayTaskEntries.slice(0, Math.max(0, 3 - Math.min(dayEvents.length, 3))).map(item => <span key={item.id} role="button" tabIndex={0} onClick={event => { event.stopPropagation(); openEditTask(item); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); openEditTask(item); } }} title="Edit task" className={"month-event " + (item.calendarKind === "scheduled" ? "task-calendar-scheduled" : "task-calendar-event")}>{item.title}{item.hasSameDayDeadline ? " · planned + due" : ""}</span>)
                        {dayBlocks.slice(0, Math.max(0, 3 - Math.min(dayEvents.length + dayTaskEntries.length, 3))).map(block => <span key={block.id} className="month-event time-block-month-event">{tasks.find(task => task.id === block.taskId)?.title || "Work block"}</span>)}
                        {dayEvents.length + dayTaskEntries.length + dayBlocks.length > 3 && <span className="month-more">+{dayEvents.length + dayTaskEntries.length + dayBlocks.length - 3} more</span>}
                      </span>
                    </button>;
                  })}</div>
                </div> : <div className={`agenda-calendar ${calendarMode === "day" ? "single-day" : ""}`}>
                  <div className="agenda-header"><div className="agenda-time-spacer"/>{visibleDays.map(date => <button key={calendarDateKey(date)} className={`agenda-day-heading ${calendarDateKey(date) === todayKey ? "is-today" : ""}`} onClick={() => { setCalendarDate(date); setCalendarMode("day"); }}><span>{date.toLocaleDateString(undefined, { weekday: "short" })}</span><strong>{date.getDate()}</strong></button>)}</div>
                  <div className="agenda-all-day"><div className="agenda-time-label">all-day</div>{visibleDays.map(date => <div className="agenda-all-day-cell" key={calendarDateKey(date)}>{eventsFor(date).filter(item => item.allDay).map(item => <button key={item.id} className="agenda-event all-day-event" onClick={() => openEditEvent(item)}>{item.title}</button>)}{scheduledTasksFor(date).filter(item => !taskHasExplicitTime(item.scheduledAt!, item.scheduledHasTime)).map(item => <button type="button" key={item.id} className="agenda-event all-day-event agenda-task-scheduled" onClick={() => openEditTask(item)}>{item.title}{item.dueAt && localDate(item.dueAt) === calendarDateKey(date) ? " · planned + due" : " · planned"}</button>)}</div>)}</div>
                  <div className="agenda-scroll"><div className="agenda-time-column">{Array.from({length:17},(_,index)=>index+6).map(hour=><div key={hour} className="agenda-hour-label">{String(hour).padStart(2,"0")}:00</div>)}</div>
                    <div className="agenda-days">{visibleDays.map(date => <div className="agenda-day-column" key={calendarDateKey(date)}>
                      {Array.from({length:17},(_,index)=><button key={index} className="agenda-hour-cell" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const id=event.dataTransfer.getData("text/time-block-id");if(id)void moveTimeBlock(id,date,index+6);}} onClick={() => { setCalendarDate(date); setEventDate(calendarDateKey(date)); setEventTime(String(index+6).padStart(2,"0")+":00"); setEventEndTime(String(index+7).padStart(2,"0")+":00"); setEventAllDay(false); setEventEditingId(null); setEventTitle(""); setEventDescription(""); setEventLocation(""); setEventArea(""); setEventProject(""); setEventOpen(true); }} aria-label={`Create event at ${index+6}:00`}/>)}
                      {eventsFor(date).filter(item => !item.allDay).map(item => {
                        const start = new Date(item.startsAt);
                        const end = item.endsAt ? new Date(item.endsAt) : new Date(start.getTime()+60*60*1000);
                        const top = Math.max(0, (start.getHours()-6)*56 + start.getMinutes()/60*56);
                        const height = Math.max(30, Math.min(952-top, (end.getTime()-start.getTime())/60000/60*56));
                        return <button key={item.id} className="agenda-event timed-agenda-event" style={{ top, height, "--event-color": areas.find(area => area.id === item.lifeAreaId)?.color || "#F5F5F7" } as React.CSSProperties} onClick={() => openEditEvent(item)}><strong>{item.title}</strong><span>{formatEventTime(item.startsAt)}{item.endsAt ? " – "+formatEventTime(item.endsAt) : ""}</span></button>;
                      })}
                      
                      {scheduledTasksFor(date).filter(item => taskHasExplicitTime(item.scheduledAt!, item.scheduledHasTime)).map(item => {
                        const start = new Date(item.scheduledAt!);
                        const top = Math.max(0, (start.getHours() - 6) * 56 + start.getMinutes() / 60 * 56);
                        return <button key={item.id} className="agenda-event timed-agenda-event agenda-task-scheduled-time" style={{ top, height: 34 }} onClick={() => openEditTask(item)}><strong>{item.title}</strong><span>{formatEventTime(item.scheduledAt!) + " · planned" + (item.dueAt && localDate(item.dueAt) === calendarDateKey(date) ? " + due" : "")}</span></button>;
                      })}
                      {tasksFor(date).filter(item => !item.scheduledAt || localDate(item.scheduledAt) !== calendarDateKey(date)).map(item => <div key={item.id} role="button" tabIndex={0} className="agenda-task-deadline" onClick={() => openEditTask(item)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openEditTask(item); } }}><CalendarCheck size={11}/>{item.title} · deadline</div>)}
                      {timeBlocks.filter(block => localDate(block.startsAt) === calendarDateKey(date)).map(block => {
                        const task = tasks.find(item => item.id === block.taskId);
                        const start = new Date(block.startsAt), end = new Date(block.endsAt);
                        const top = Math.max(0, (start.getHours()-6)*56 + start.getMinutes()/60*56);
                        const height = Math.max(28, Math.min(952-top, (end.getTime()-start.getTime())/60000/60*56));
                        return <button key={block.id} draggable onDragStart={event=>event.dataTransfer.setData("text/time-block-id",block.id)} className="agenda-event timed-agenda-event time-block-event" style={{top,height}} title="Drag to another hour to reschedule · click to remove" onClick={async()=>{if(window.confirm("Remove this scheduled block?")){try{await apiRequest("/time-blocks/"+block.id,{method:"DELETE"});setTimeBlocks(current=>current.filter(item=>item.id!==block.id));}catch(cause){setError(cause instanceof Error?cause.message:"Could not remove time block.");}}}}><strong>{task?.title || "Scheduled task"}</strong><span>{formatEventTime(block.startsAt)} – {formatEventTime(block.endsAt)} · work block</span></button>;
                      })}
                    </div>)}</div>
                  </div>
                </div>}
                <div className="calendar-legend"><span><i className="legend-event"/>Events</span><span><i className="legend-scheduled"/>Scheduled tasks</span><span><i className="legend-task"/>Deadlines</span><span>Work blocks</span><span className="calendar-hint">Select a day or event to see more</span></div>
              </section>
            </div>;
          })()}

          {view === "Goals" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">THE BIGGER PICTURE</div><h1>Your goals.</h1><p className="subheading">Give your longer-term intentions a place to live.</p></div><button className="primary-button" onClick={openNewGoal}><Plus size={17}/>New goal</button></div><section className="project-grid">{goals.map(goal=>{const linkedTasks=tasks.filter(task=>task.goalId===goal.id);const doneTasks=linkedTasks.filter(task=>task.status==="done").length;const linkedHabits=habits.filter(habit=>habit.goalId===goal.id);const goalSteps=milestones[goal.id]||[];const doneSteps=goalSteps.filter(item=>item.status==="completed").length;const progress=(goalSteps.length+linkedTasks.length)?Math.round((doneSteps+doneTasks)/(goalSteps.length+linkedTasks.length)*100):0;return <article className="panel project-card" key={goal.id}><div className="section-kicker">{goal.status.toUpperCase()}</div><h2>{goal.title}</h2><p>{goal.description||"A direction worth making time for."}</p><div className="goal-progress"><span>{goalSteps.length+linkedTasks.length>0?progress+"% complete · "+doneTasks+"/"+linkedTasks.length+" tasks · "+doneSteps+"/"+goalSteps.length+" milestones":"No measurable progress yet · "+linkedHabits.length+" linked habits"}</span>{goalSteps.length+linkedTasks.length>0&&<i><b style={{width:progress+"%"}}/></i>}</div><span>{goal.targetDate?"Target · "+new Date(goal.targetDate+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"No target date"}</span><div className="goal-milestones"><div className="goal-milestones-heading"><strong>Milestones</strong><button className="text-button" onClick={()=>void addMilestone(goal.id)}>+ Add</button></div>{(milestones[goal.id]||[]).map(milestone=><label className="goal-milestone-row" key={milestone.id}><input type="checkbox" checked={milestone.status==="completed"} onChange={()=>void toggleMilestone(goal.id,milestone)}/><span className={milestone.status==="completed"?"milestone-done":""}>{milestone.title}</span>{milestone.targetDate&&<small>{milestone.targetDate}</small>}</label>)}<small>{(milestones[goal.id]||[]).filter(item=>item.status==="completed").length}/{(milestones[goal.id]||[]).length} milestones complete</small></div><div className="goal-actions"><button className="secondary-button" onClick={()=>openEditGoal(goal)}><Pencil size={13}/> Edit</button><button className="secondary-button" onClick={async()=>{const status=goal.status==="completed"?"active":"completed";try{const result=await apiRequest<ApiList<ApiGoal>>("/goals/"+goal.id,{method:"PATCH",body:JSON.stringify({status})});setGoals(current=>current.map(item=>item.id===goal.id?result.data:item));}catch(cause){setError(cause instanceof Error?cause.message:"Could not update goal.");}}}>{goal.status==="completed"?"Reopen":"Mark complete"}</button><button className="icon-button" onClick={async()=>{try{await apiRequest("/goals/"+goal.id,{method:"DELETE"});setGoals(current=>current.filter(item=>item.id!==goal.id));}catch(cause){setError(cause instanceof Error?cause.message:"Could not delete goal.");}}} aria-label="Delete goal"><Trash2 size={14}/></button></div></article>;})}{goals.length===0&&<div className="empty-state"><Flag size={20}/><strong>No goals yet</strong><span>Start with something you want to move towards.</span></div>}</section></div>}
          {view === "Habits" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">SMALL THINGS, REPEATED</div><h1>Your habits.</h1><p className="subheading">Build consistency without the pressure of perfect streaks.</p></div><button className="primary-button" onClick={openNewHabit}><Plus size={17}/>New habit</button></div><section className="panel full-task-panel">{habits.filter(habit=>!habit.archivedAt).map(habit=>{const today=localDate(new Date().toISOString());const checked=habitEntries.some(entry=>entry.habitId===habit.id&&entry.entryDate===today);const area=areas.find(item=>item.id===habit.lifeAreaId);const recent=habitEntries.filter(entry=>entry.habitId===habit.id).length;return <div className="habit-row" key={habit.id}><button className={"task-check "+(checked?"checked":"")} onClick={()=>void checkInHabit(habit)} aria-label="Toggle today's check-in">{checked&&<Check size={13}/>}</button><div className="task-copy"><strong className="task-title">{habit.name}</strong><div className="habit-history-grid" aria-label="Last 28 days">{Array.from({length:28},(_,index)=>{const day=new Date();day.setDate(day.getDate()-(27-index));const key=calendarDateKey(day);const done=habitEntries.some(entry=>entry.habitId===habit.id&&entry.entryDate===key);return <span key={key} className={done?"habit-history-day is-done":"habit-history-day"} title={key+(done?" · completed":" · not completed")}/>})}</div><div className="task-meta"><span className="area-tag">{area?.name||"Personal"}</span><span className="repeat-tag">{habit.frequency==="weekdays"?"Weekdays":habit.frequency==="weekly"?(habit.targetPerWeek>1?habit.targetPerWeek+"× per week":"Weekly"):"Daily"}</span><span className="due-tag">{recent} check-ins</span></div></div><button className="icon-button" onClick={async()=>{try{await apiRequest("/habits/"+habit.id,{method:"PATCH",body:JSON.stringify({archived:true})});setHabits(current=>current.map(item=>item.id===habit.id?{...item,archivedAt:new Date().toISOString()}:item));}catch(cause){setError(cause instanceof Error?cause.message:"Could not archive habit.");}}} aria-label="Archive habit"><CheckCheck size={15}/></button></div>;})}{habits.filter(habit=>!habit.archivedAt).length===0&&<div className="empty-state"><Heart size={20}/><strong>No habits yet</strong><span>Choose one small practice you want to repeat.</span></div>}</section></div>}
          {view === "Life Areas" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">THE CONTEXT BEHIND YOUR WORK</div><h1>Your life areas.</h1><p className="subheading">Organize responsibilities without splitting your life into silos.</p></div><button className="primary-button" onClick={()=>setAreaOpen(true)}><Plus size={17}/>New area</button></div><section className="project-grid">{areas.map(area=><article className="panel project-card" key={area.id}><div className="section-kicker">LIFE AREA</div><h2><span className="area-mini-icon" style={{display:"inline-grid",background:area.color+"22",color:area.color,marginRight:8}}>●</span>{area.name}</h2><p>{tasks.filter(task=>task.lifeAreaId===area.id).length} tasks · {projects.filter(project=>project.lifeAreaId===area.id).length} projects</p><div className="goal-actions"><button className="secondary-button" onClick={()=>{setFilterArea(area.id);setView("Tasks");}}>View tasks</button><button className="icon-button" onClick={()=>void deleteArea(area)} aria-label="Delete life area"><Trash2 size={14}/></button></div></article>)}</section></div>}
          {view === "Projects" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">THINGS YOU&apos;RE BUILDING</div><h1>Your projects.</h1><p className="subheading">Keep the bigger picture connected to the next step.</p></div><button className="primary-button" onClick={openNewProject}><Plus size={17} />New project</button></div><div className="project-filter-row" role="group" aria-label="Filter projects">{([["active","Active"],["completed","Completed"],["archived","Archived"],["all","All"]] as const).map(([value,label])=><button key={value} className={projectFilter===value?"selected":""} aria-pressed={projectFilter===value} onClick={()=>setProjectFilter(value)}>{label}<span>{value==="all"?projects.length:projects.filter(project=>value==="active"?["active","on_hold"].includes(project.status):project.status===value).length}</span></button>)}</div><section className="project-grid">{projects.filter(project=>projectFilter==="all"||(projectFilter==="active"?["active","on_hold"].includes(project.status):project.status===projectFilter)).map(project => <Link className="project-card-link" href={"/projects/" + project.id} key={project.id}><article className="panel project-card"><div className="section-kicker">{project.status.replace("_", " ").toUpperCase()}</div><h2>{project.name}</h2><p>{project.description || "No description yet."}</p><span>{tasks.filter(task => task.projectId === project.id).length} linked tasks · {events.filter(event => event.projectId === project.id).length} events</span><small>Open project workspace →</small></article></Link>)}{projects.filter(project=>projectFilter==="all"||(projectFilter==="active"?["active","on_hold"].includes(project.status):project.status===projectFilter)).length===0 && <div className="empty-state"><Command size={20} /><strong>{projectFilter==="active"?"No active projects":projectFilter==="completed"?"No completed projects":projectFilter==="archived"?"No archived projects":"No projects yet"}</strong><span>{projectFilter==="active"?"Start with one meaningful piece of work.":projectFilter==="all"?"Create a project when something needs more than one step.":"Projects will appear here when their status changes."}</span></div>}</section></div>}
        </div>
      </section>

      <button className="quick-task-fab" type="button" onClick={openNewTask} disabled={taskBusy || taskOpen} aria-label="Create task" title="New task"><Plus size={24} strokeWidth={2}/></button>

      {reviewOpen && <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setReviewOpen(false);}}><section className="task-modal weekly-review-modal"><div className="modal-heading"><div><div className="section-kicker">PAUSE AND TAKE STOCK</div><h2>Your weekly review.</h2></div><button className="icon-button" onClick={()=>setReviewOpen(false)} aria-label="Close review"><X size={18}/></button></div><div className="weekly-review-metrics"><div><strong>{completedThisWeek}</strong><span>Tasks completed</span></div><div><strong>{checkinsThisWeek}</strong><span>Habit check-ins</span></div><div><strong>{overdue.length}</strong><span>Still overdue</span></div><div><strong>{dueToday.length}</strong><span>Due today</span></div></div><div className="weekly-review-detail"><h3>Things to bring forward</h3>{overdue.slice(0,5).map(task=><p key={task.id}>{task.title}<small>Overdue</small></p>)}{overdue.length===0&&<p className="muted-note">No overdue tasks. Nice.</p>}</div><div className="weekly-review-detail"><h3>Coming up</h3>{events.filter(item=>new Date(item.startsAt)>=new Date()).slice(0,5).map(item=><p key={item.id}>{item.title}<small>{new Date(item.startsAt).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</small></p>)}{events.filter(item=>new Date(item.startsAt)>=new Date()).length===0&&<p className="muted-note">Nothing scheduled yet.</p>}</div><div className="modal-footer"><button className="primary-button" onClick={()=>setReviewOpen(false)}>Done</button></div></section></div>}
      {commandOpen && <div className="command-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setCommandOpen(false);}}><section className="command-palette"><div className="command-search-row"><Search size={18}/><input autoFocus value={commandQuery} onChange={event=>setCommandQuery(event.target.value)} placeholder="Search tasks, projects, notes, goals…"/><kbd>ESC</kbd></div><div className="command-results">{commandLoading?<p>Searching…</p>:commandQuery.trim().length<2?<p>Type at least two characters to search across Sonder.</p>:commandResults.length?commandResults.map(result=><button key={result.type+result.id} onClick={()=>{setCommandOpen(false);if(result.type==="project"){window.location.href="/projects/"+result.id;return;}if(result.type==="note"){window.location.href="/notes";return;}setView(result.type==="task"?"Tasks":result.type==="goal"?"Goals":result.type==="habit"?"Habits":"Calendar");setQuery(result.title);}}><span className="command-result-type">{result.type}</span><strong>{result.title}</strong><small>{result.subtitle||" "}</small></button>):<p>No matching items found.</p>}</div><div className="command-footer"><span>Search everything in your workspace</span><span>CTRL K</span></div></section></div>}
      {taskOpen && <div className="quick-task-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !taskBusy) { setTaskOpen(false); setTaskEditingId(null); } }}>
        <form role="dialog" aria-modal="true" aria-labelledby="quick-task-title" className={"quick-task-popover " + (taskExpanded ? "is-expanded" : "")} onSubmit={createTask}>
          <div className="quick-task-heading">
            <div><div className="section-kicker">{taskEditingId ? "TASK DETAILS" : "QUICK ADD"}</div><h2 id="quick-task-title">{taskEditingId ? "Edit task" : "New task"}</h2></div>
            <button type="button" className="icon-button" onClick={() => { if (!taskBusy) { setTaskOpen(false); setTaskEditingId(null); } }} aria-label="Close task editor"><X size={17}/></button>
          </div>
          <input className="quick-task-title-input" required autoFocus maxLength={160} value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="What needs to get done?"/>
          <div className="quick-task-date-stack">
            <TaskDatePicker label="Schedule" value={taskScheduled} onChange={setTaskScheduled}/>
            <TaskDatePicker label="Due date" value={taskDue} onChange={setTaskDue}/>
          </div>
          <div className="quick-task-meta-row">
            <label className="quick-task-choice"><Folder size={15}/><span>Project</span><select value={taskProject} onChange={event => { setTaskProject(event.target.value); setTaskGoal(projects.find(project => project.id === event.target.value)?.goalId || ""); }}><option value="">No project</option>{projects.filter(project => ["active", "on_hold"].includes(project.status) || project.id === taskProject).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <label className="quick-task-choice"><Flag size={15}/><span>Priority</span><select value={taskPriority} onChange={event => setTaskPriority(event.target.value as Priority)}><option value="low">Low</option><option value="medium">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
          </div>
          {taskExpanded && <div className="quick-task-advanced">
            <label className="form-label">Notes<textarea rows={3} value={taskDescription} onChange={event => setTaskDescription(event.target.value)} placeholder="Add a little context…"/></label>
            <div className="form-grid">
              <label className="form-label">Life area<select value={taskArea} onChange={event => setTaskArea(event.target.value)}><option value="">None</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
              <label className="form-label">Goal<select value={taskGoal} onChange={event => setTaskGoal(event.target.value)}><option value="">None</option>{goals.filter(goal => goal.status === "active").map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
              <label className="form-label">Parent task<select value={taskParent} onChange={event => setTaskParent(event.target.value)}><option value="">No parent</option>{tasks.filter(task => !task.parentTaskId && task.status !== "done").map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
              <label className="form-label">Repeat<select value={taskRepeat} onChange={event => setTaskRepeat(event.target.value as typeof taskRepeat)}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
              {taskRepeat !== "none" && <><label className="form-label">Every<input type="number" min="1" max="52" value={taskRepeatInterval} onChange={event => setTaskRepeatInterval(event.target.value)}/></label><label className="form-label">Repeat until<input type="date" value={taskRepeatUntil} onChange={event => setTaskRepeatUntil(event.target.value)}/></label></>}
              <label className="form-label">Reminder<input type="datetime-local" value={taskReminder} onChange={event => setTaskReminder(event.target.value)}/></label>
            </div>
          </div>}
          <div className="quick-task-footer">
            <button type="button" className="quick-task-more" onClick={() => setTaskExpanded(current => !current)}>{taskExpanded ? "Fewer options" : "More options"}<ChevronDown size={14} className={taskExpanded ? "is-rotated" : ""}/></button>
            <div className="quick-task-actions">
              <button type="button" className="secondary-button" disabled={taskBusy} onClick={() => { setTaskOpen(false); setTaskEditingId(null); }}>Cancel</button>
              <button className="primary-button" type="submit" disabled={!taskTitle.trim() || taskBusy}>{taskBusy ? "Saving…" : taskEditingId ? "Save changes" : "Create task"}{!taskBusy && <ArrowRight size={14}/>}</button>
            </div>
          </div>
        </form>
      </div>}
      {goalOpen && <div className="modal-backdrop"><form className="task-modal" onSubmit={createGoal}><div className="modal-heading"><div><div className="section-kicker">THINK LONG TERM</div><h2>{goalEditingId?"Edit goal":"New goal"}</h2></div><button type="button" className="icon-button" onClick={()=>{setGoalOpen(false);setGoalEditingId(null);}}><X size={18}/></button></div><label className="form-label">Goal<input required autoFocus value={goalTitle} onChange={event=>setGoalTitle(event.target.value)} placeholder="What do you want to work towards?"/></label><label className="form-label">Description<textarea rows={3} value={goalDescription} onChange={event=>setGoalDescription(event.target.value)} placeholder="Why does this matter to you?"/></label><div className="form-grid"><label className="form-label">Life area<select value={goalArea} onChange={event=>setGoalArea(event.target.value)}><option value="">None</option>{areas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label className="form-label">Target date<input type="date" value={goalDate} onChange={event=>setGoalDate(event.target.value)}/></label></div><div className="modal-footer"><button type="button" className="secondary-button" onClick={()=>{setGoalOpen(false);setGoalEditingId(null);}}>Cancel</button><button className="primary-button" type="submit">{goalEditingId?"Save changes":"Create goal"}</button></div></form></div>}
      {habitOpen && <div className="modal-backdrop"><form className="task-modal" onSubmit={createHabit}><div className="modal-heading"><div><div className="section-kicker">BUILD A PRACTICE</div><h2>New habit</h2></div><button type="button" className="icon-button" onClick={()=>setHabitOpen(false)}><X size={18}/></button></div><label className="form-label">Habit name<input required autoFocus value={habitName} onChange={event=>setHabitName(event.target.value)} placeholder="e.g. Read for 15 minutes"/></label><div className="form-grid"><label className="form-label">Life area<select value={habitArea} onChange={event=>setHabitArea(event.target.value)}><option value="">Personal</option>{areas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label className="form-label">Frequency<select value={habitFrequency} onChange={event=>setHabitFrequency(event.target.value as typeof habitFrequency)}><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select></label><label className="form-label">Supports goal<select value={habitGoal} onChange={event=>setHabitGoal(event.target.value)}><option value="">None</option>{goals.filter(goal=>goal.status==="active").map(goal=><option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label></div><div className="modal-footer"><button type="button" className="secondary-button" onClick={()=>setHabitOpen(false)}>Cancel</button><button className="primary-button" type="submit">Create habit</button></div></form></div>}
      {eventOpen && <div className="modal-backdrop"><form className="task-modal calendar-event-modal" onSubmit={createEvent}>
        <div className="modal-heading"><div><div className="section-kicker">{eventEditingId ? "UPDATE YOUR PLANS" : "MAKE TIME FOR IT"}</div><h2>{eventEditingId ? "Edit event" : "New event"}</h2></div><button type="button" className="icon-button" onClick={() => setEventOpen(false)}><X size={18}/></button></div>
        <label className="form-label">Event title<input required autoFocus value={eventTitle} onChange={event=>setEventTitle(event.target.value)} placeholder="What’s happening?"/></label>
        <label className="calendar-all-day-toggle"><input type="checkbox" checked={eventAllDay} onChange={event=>setEventAllDay(event.target.checked)}/>All-day event</label>
        <div className="form-grid"><label className="form-label">Date<input required type="date" value={eventDate} onChange={event=>setEventDate(event.target.value)}/></label>{!eventAllDay && <><label className="form-label">Starts<input required type="time" value={eventTime} onChange={event=>setEventTime(event.target.value)}/></label><label className="form-label">Ends<input required type="time" value={eventEndTime} onChange={event=>setEventEndTime(event.target.value)}/></label></>}</div>
        <label className="form-label">Description <span className="optional-label">OPTIONAL</span><textarea rows={2} value={eventDescription} onChange={event=>setEventDescription(event.target.value)} placeholder="Add details or a note…"/></label>
        <label className="form-label">Location <span className="optional-label">OPTIONAL</span><input value={eventLocation} onChange={event=>setEventLocation(event.target.value)} placeholder="Add a location"/></label>
        <div className="form-grid"><label className="form-label">Life area<select value={eventArea} onChange={event=>setEventArea(event.target.value)}><option value="">None</option>{areas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label className="form-label">Project<select value={eventProject} onChange={event=>setEventProject(event.target.value)}><option value="">None</option>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label></div>
        <div className="modal-footer">{eventEditingId && <button type="button" className="calendar-delete-button" onClick={() => { void deleteEvent(eventEditingId); setEventOpen(false); }}>Delete event</button>}<button type="button" className="secondary-button" onClick={()=>setEventOpen(false)}>Cancel</button><button className="primary-button" type="submit">{eventEditingId ? "Save changes" : "Create event"}</button></div>
      </form></div>}
      {scheduleOpen && <div className="modal-backdrop"><form className="task-modal" onSubmit={createTimeBlock}><div className="modal-heading"><div><div className="section-kicker">MAKE ROOM FOR DEEP WORK</div><h2>Plan a work session</h2></div><button type="button" className="icon-button" onClick={()=>setScheduleOpen(false)}><X size={18}/></button></div><label className="form-label">Task<select required value={scheduleTask} onChange={event=>setScheduleTask(event.target.value)}><option value="">Choose a task</option>{openTasks.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</select></label><div className="form-grid"><label className="form-label">Date<input required type="date" value={scheduleDate} onChange={event=>setScheduleDate(event.target.value)}/></label><label className="form-label">Starts<input required type="time" value={scheduleStart} onChange={event=>setScheduleStart(event.target.value)}/></label><label className="form-label">Ends<input required type="time" value={scheduleEnd} onChange={event=>setScheduleEnd(event.target.value)}/></label></div><p className="muted-note">This creates a work block. It does not change the task deadline.</p><div className="modal-footer"><button type="button" className="secondary-button" onClick={()=>setScheduleOpen(false)}>Cancel</button><button className="primary-button" type="submit">Create work block</button></div></form></div>}
      {areaOpen && <div className="modal-backdrop"><form className="task-modal" onSubmit={createArea}><div className="modal-heading"><div><div className="section-kicker">MAKE IT YOURS</div><h2>New life area</h2></div><button type="button" className="icon-button" onClick={()=>setAreaOpen(false)}><X size={18}/></button></div><label className="form-label">Area name<input required autoFocus value={areaName} onChange={event=>setAreaName(event.target.value)} placeholder="e.g. Learning"/></label><label className="form-label">Color<input type="color" value={areaColor} onChange={event=>setAreaColor(event.target.value)}/></label><div className="modal-footer"><button type="button" className="secondary-button" onClick={()=>setAreaOpen(false)}>Cancel</button><button className="primary-button" type="submit">Create area</button></div></form></div>}
      {projectOpen && <div className="modal-backdrop"><form className="task-modal" onSubmit={createProject}><div className="modal-heading"><div><div className="section-kicker">START SOMETHING</div><h2>New project</h2></div><button type="button" className="icon-button" onClick={() => setProjectOpen(false)}><X size={18} /></button></div><label className="form-label">Project name<input required autoFocus value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="What are you working on?" /></label><label className="form-label">Description<textarea rows={3} value={projectDescription} onChange={event => setProjectDescription(event.target.value)} placeholder="What does this project involve?" /></label><div className="form-grid"><label className="form-label">Target date<input type="date" value={projectDueDate} onChange={event => setProjectDueDate(event.target.value)} /></label><label className="form-label">Life area<select value={projectArea} onChange={event=>setProjectArea(event.target.value)}><option value="">None</option>{areas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label className="form-label">Supports goal<select value={projectGoal} onChange={event=>setProjectGoal(event.target.value)}><option value="">None</option>{goals.filter(goal=>goal.status==="active").map(goal=><option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label></div><div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setProjectOpen(false)}>Cancel</button><button className="primary-button" type="submit">Create project</button></div></form></div>}
    </main>
  );
}

function TaskRow({ task, areas, onToggle, onDelete, onEdit }: {
  task: ApiTask;
  areas: ApiLifeArea[];
  onToggle: (task: ApiTask) => void;
  onDelete: (id: string) => void;
  onEdit: (task: ApiTask) => void;
}) {
  const area = areas.find(item => item.id === task.lifeAreaId);
  const scheduled = task.scheduledAt ? localDate(task.scheduledAt) : "";
  const due = task.dueAt ? localDate(task.dueAt) : "";
  const today = localDate(new Date().toISOString());
  const formatDate = (value: string, timestamp: string, hasTime: boolean) => {
    const label = value === today ? "Today" : new Date(value + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return label + (taskHasExplicitTime(timestamp, hasTime) ? " · " + formatEventTime(timestamp) : "");
  };
  return <div className={`task-row ${task.status === "done" ? "task-completed" : ""}`}>
    <button className={`task-check ${task.status === "done" ? "checked" : ""}`} onClick={() => onToggle(task)} aria-label="Toggle completion">{task.status === "done" && <Check size={13} />}</button>
    <div className="task-copy"><strong className="task-title">{task.title}</strong>{task.description && <span className="task-notes">{task.description}</span>}<div className="task-meta">{area && <span className="area-tag">{area.name}</span>}<span className={`priority-tag priority-${task.priority}`}><i />{task.priority}</span>{scheduled && <span className="scheduled-tag"><CalendarClock size={12}/>{formatDate(scheduled, task.scheduledAt!, task.scheduledHasTime)}</span>}{due && <span className={`due-tag ${due < today && task.status !== "done" ? "overdue-tag" : ""}`}><CalendarCheck size={12}/>{formatDate(due, task.dueAt!, task.dueHasTime)}</span>}</div></div>
    <button className="icon-button task-more" onClick={() => onEdit(task)} aria-label="Edit task"><Pencil size={14}/></button><button className="icon-button task-more" onClick={() => onDelete(task.id)} aria-label="Delete task"><Trash2 size={15} /></button>
  </div>;
}
