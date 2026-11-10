"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, CalendarRange, Check, CheckCheck, ChevronLeft, ChevronRight, Command, Flag, Heart, Inbox,
  LayoutDashboard, ListTodo, LogOut, NotebookPen, Plus, RefreshCw, Search, Target, Trash2, X
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";
import type { ApiCalendarEvent, ApiGoal, ApiHabit, ApiHabitEntry, ApiInboxItem, ApiLifeArea, ApiList, ApiProject, ApiTask } from "@/lib/api";

type View = "Today" | "Inbox" | "Tasks" | "Projects" | "Calendar" | "Goals" | "Habits" | "Life Areas";
type Priority = ApiTask["priority"];
type CommandResult = { id: string; title: string; subtitle: string | null; type: string };

const defaultAreas = [
  { name: "School", color: "#A78BFA", icon: "book-open" },
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
  const [filterArea, setFilterArea] = useState("all");
  const [capture, setCapture] = useState("");
  const [taskOpen, setTaskOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("medium");
  const [taskArea, setTaskArea] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [taskGoal, setTaskGoal] = useState("");
  const [taskRepeat, setTaskRepeat] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [taskRepeatInterval, setTaskRepeatInterval] = useState("1");
  const [taskRepeatUntil, setTaskRepeatUntil] = useState("");
  const [taskReminder, setTaskReminder] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectGoal, setProjectGoal] = useState("");
  const [projectArea, setProjectArea] = useState("");
  const [goalOpen, setGoalOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
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
  const [areaColor, setAreaColor] = useState("#A78BFA");

  const loadWorkspace = useCallback(async () => {
    try {
      const workspace = await apiRequest<ApiList<{
        tasks: ApiTask[];
        lifeAreas: ApiLifeArea[];
        projects: ApiProject[];
        inbox: ApiInboxItem[];
        goals: ApiGoal[];
        habits: ApiHabit[];
        habitEntries: ApiHabitEntry[];
        events: ApiCalendarEvent[];
      }>>("/workspace/dashboard");

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
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const today = localDate(new Date().toISOString());
  const openTasks = tasks.filter(task => !["done", "cancelled"].includes(task.status));
  const dueToday = openTasks.filter(task => task.dueAt && localDate(task.dueAt) === today);
  const overdue = openTasks.filter(task => task.dueAt && localDate(task.dueAt) < today);
  const completed = tasks.filter(task => task.status === "done");
  const visibleTasks = useMemo(() => tasks
    .filter(task => (filterArea === "all" || task.lifeAreaId === filterArea) && (task.title + " " + (task.description || "")).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done") ||
      (a.dueAt || "9999").localeCompare(b.dueAt || "9999")),
  [tasks, query, filterArea]);

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

  async function createTask(event: FormEvent) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      const dueAt = taskDue ? new Date(taskDue + "T12:00:00").toISOString() : null;
      const result = await apiRequest<ApiList<ApiTask>>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim() || null,
          dueAt,
          priority: taskPriority,
          lifeAreaId: taskArea || null,
          projectId: taskProject || null,
          goalId: taskGoal || projects.find(project => project.id === taskProject)?.goalId || null,
          reminderAt: taskReminder ? new Date(taskReminder).toISOString() : null,
          recurrenceFrequency: taskRepeat === "none" ? null : taskRepeat,
          recurrenceInterval: Number(taskRepeatInterval),
          recurrenceUntil: taskRepeatUntil || null,
          status: "todo"
        })
      });
      setTasks(current => [result.data, ...current]);
      setTaskTitle("");
      setTaskDescription("");
      setTaskDue("");
      setTaskProject("");
      setTaskGoal("");
      setTaskRepeat("none");
      setTaskRepeatInterval("1");
      setTaskRepeatUntil("");
      setTaskReminder("");
      setTaskOpen(false);
      setNotice("Task created.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create the task.");
    }
  }

  async function toggleTask(task: ApiTask) {
    const status = task.status === "done" ? "todo" : "done";
    try {
      const result = await apiRequest<ApiList<ApiTask>>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setTasks(current => current.map(item => item.id === task.id ? result.data : item));
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

  async function createGoal(event: FormEvent) {
    event.preventDefault();
    if (!goalTitle.trim()) return;
    try {
      const result = await apiRequest<ApiList<ApiGoal>>("/goals", { method: "POST", body: JSON.stringify({ title: goalTitle.trim(), targetDate: goalDate || null, lifeAreaId: goalArea || null }) });
      setGoals(current => [...current, result.data]); setGoalTitle(""); setGoalDate(""); setGoalOpen(false); setNotice("Goal created.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the goal."); }
  }

  async function createHabit(event: FormEvent) {
    event.preventDefault();
    if (!habitName.trim()) return;
    try {
      const result = await apiRequest<ApiList<ApiHabit>>("/habits", { method: "POST", body: JSON.stringify({ name: habitName.trim(), frequency: habitFrequency, targetPerWeek: habitFrequency === "daily" ? 7 : habitFrequency === "weekdays" ? 5 : 1, lifeAreaId: habitArea || null, goalId: habitGoal || null }) });
      setHabits(current => [...current, result.data]); setHabitName(""); setHabitOpen(false); setNotice("Habit created.");
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
      setEventOpen(false);
      setEventEditingId(null);
      setNotice(eventEditingId ? "Event updated." : "Event added to your calendar.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the event."); }
  }

  async function deleteEvent(id: string) {
    try { await apiRequest("/calendar/" + id, { method: "DELETE" }); setEvents(current => current.filter(item => item.id !== id)); }
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

  async function createProject(event: FormEvent) {
    event.preventDefault();
    if (!projectName.trim()) return;
    try {
      const result = await apiRequest<ApiList<ApiProject>>("/projects", {
        method: "POST",
        body: JSON.stringify({ name: projectName.trim(), goalId: projectGoal || null, lifeAreaId: projectArea || null })
      });
      setProjects(current => [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      setProjectName("");
      setProjectGoal("");
      setProjectArea("");
      setProjectOpen(false);
      setNotice("Project created.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create the project.");
    }
  }

  if (sessionPending) return <main className="auth-screen"><div className="brand-lockup"><span className="brand-mark"><span /></span><span>sonder</span></div><p>Opening your space…</p></main>;

  if (!session?.user) return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="brand-lockup"><span className="brand-mark"><span /></span><span>sonder</span></div>
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
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark"><span /></span><span className="brand-name">sonder</span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          {([
            ["Today", LayoutDashboard],
            ["Inbox", Inbox],
            ["Tasks", ListTodo],
            ["Projects", Command],
            ["Calendar", CalendarRange],
            ["Goals", Flag],
            ["Habits", Heart],
            ["Life Areas", Target]
          ] as const).map(([name, Icon]) =>
            <button key={name} className={`nav-item ${view === name ? "active" : ""}`} onClick={() => setView(name)}>
              <Icon size={17} strokeWidth={1.8} /><span>{name}</span>
              {name === "Inbox" && <span className="nav-count">{inbox.length}</span>}
              {name === "Tasks" && <span className="nav-count">{openTasks.length}</span>}
              {name === "Goals" && <span className="nav-count">{goals.filter(goal => goal.status === "active").length}</span>}
            </button>
          )}
          <Link className="nav-item" href="/notes"><NotebookPen size={17} strokeWidth={1.8}/><span>Notes</span></Link>
        </nav>
        <div className="workspace-label areas-label">YOUR LIFE</div>
        <div className="area-nav">
          {areas.map(area => <button key={area.id} className="area-item" onClick={() => { setTaskArea(area.id); setFilterArea(area.id); setView("Tasks"); }}>
            <span className="area-dot" style={{ color: area.color, background: area.color + "20" }}><span>•</span></span><span>{area.name}</span>
          </button>)}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-quote">“You don&apos;t have to do it all. Just the next thing.”</div>
          <button className="nav-item settings-link" onClick={() => void authClient.signOut()}><LogOut size={17} /><span>Sign out</span></button>
          <div className="profile-row"><div className="avatar">{session.user.name?.slice(0, 1).toUpperCase() || "S"}</div><div className="profile-copy"><strong>{session.user.name}</strong><span>{session.user.email}</span></div></div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span>›</span><strong>{view}</strong></div>
          <div className="topbar-actions"><button className="icon-button" onClick={() => void loadWorkspace()} aria-label="Refresh workspace"><RefreshCw size={15} /></button><div className="date-chip"><CalendarDays size={14} />{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div><div className="avatar top-avatar">{session.user.name?.slice(0, 1).toUpperCase() || "S"}</div></div>
        </header>
        <div className="page-content">
          {(error || notice) && <div className={`workspace-message ${error ? "message-error" : ""}`}>{error || notice}<button onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss"><X size={14} /></button></div>}
          {view === "Today" && <>
            <div className="welcome-row"><div><div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div><h1>{greeting()}, {session.user.name?.split(" ")[0] || "there"}.</h1><p className="subheading">A little clarity goes a long way. Here&apos;s your day at a glance.</p></div><button className="primary-button" onClick={() => setTaskOpen(true)}><Plus size={17} />New task</button></div>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-top"><span>Open tasks</span><ListTodo size={16} /></div><div className="stat-value">{openTasks.length}</div><div className="stat-foot">Across your life areas</div></div>
              <div className="stat-card"><div className="stat-top"><span>Due today</span><Target size={16} /></div><div className="stat-value">{dueToday.length}</div><div className="stat-foot">{overdue.length} overdue</div></div>
              <div className="stat-card"><div className="stat-top"><span>Completed</span><CheckCheck size={16} /></div><div className="stat-value">{completed.length}</div><div className="stat-foot">A little progress counts</div></div>
            </div>
            <div className="content-grid">
              <section className="panel tasks-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR FOCUS</div><h2>Today&apos;s priorities</h2></div><button className="text-button" onClick={() => setView("Tasks")}>View all <ArrowRight size={14} /></button></div>
                {dueToday.length || openTasks.length ? (dueToday.length ? dueToday : openTasks).slice(0, 7).map(task => <TaskRow key={task.id} task={task} areas={areas} onToggle={toggleTask} onDelete={deleteTask} />) : <div className="empty-state"><Check size={20} /><strong>All clear for now</strong><span>Enjoy the breathing room. You&apos;ve earned it.</span></div>}
                <button className="add-task-row" onClick={() => setTaskOpen(true)}><Plus size={15} />Add a task</button>
              </section>
              <div className="right-column">
                <section className="panel"><div className="panel-heading compact-heading"><div><div className="section-kicker">COMING UP</div><h2>Next on your calendar</h2></div><button className="text-button" onClick={() => setView("Calendar")}>Calendar <ArrowRight size={14}/></button></div>{events.filter(item => new Date(item.startsAt) >= new Date()).sort((a,b) => a.startsAt.localeCompare(b.startsAt)).slice(0,4).map(item => <div className="upcoming-row" key={item.id}><span className="upcoming-dot"/><div><strong>{item.title}</strong><span>{new Date(item.startsAt).toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span></div></div>)}{events.filter(item => new Date(item.startsAt) >= new Date()).length === 0 && <p className="muted-note">Nothing scheduled yet. Add an event when something is coming up.</p>}</section>
                <section className="panel areas-panel"><div className="panel-heading compact-heading"><div><div className="section-kicker">THE BIG PICTURE</div><h2>Your life areas</h2></div></div><div className="area-progress-list">{areas.map(area => { const related = tasks.filter(task => task.lifeAreaId === area.id); const done = related.filter(task => task.status === "done").length; return <div className="area-progress" key={area.id}><span className="area-mini-icon" style={{ color: area.color }}>●</span><span className="progress-name">{area.name}</span><span className="progress-track"><i style={{ width: related.length ? `${done / related.length * 100}%` : "0%" }} /></span><span className="progress-number">{done}/{related.length}</span></div>; })}</div></section>
              </div>
            </div>
          </>}
          {view === "Inbox" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">CAPTURE NOW · ORGANIZE LATER</div><h1>Your inbox.</h1><p className="subheading">Get it out of your head. Decide what it means later.</p></div></div><form className="capture-form" onSubmit={quickCapture}><Plus size={18} /><input value={capture} onChange={event => setCapture(event.target.value)} placeholder="Capture a task, thought, idea…" /><button className="primary-button" disabled={!capture.trim()}>Add to inbox</button></form><section className="panel full-task-panel">{inbox.length ? inbox.map(item => <div className="inbox-row" key={item.id}><div className="inbox-item-copy"><strong>{item.title}</strong><span>{item.type} · {new Date(item.createdAt).toLocaleDateString()}</span>{item.content && <p>{item.content}</p>}</div><div className="inbox-actions"><button className="secondary-button" onClick={() => void convertInboxItem(item)}>Make task</button><button className="icon-button" onClick={() => void archiveInboxItem(item)} aria-label="Archive"><Check size={16} /></button></div></div>) : <div className="empty-state"><Inbox size={20} /><strong>Your inbox is clear</strong><span>Capture anything you don&apos;t want to forget.</span></div>}</section></div>}
          {view === "Tasks" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">MAKE SPACE FOR WHAT MATTERS</div><h1>Your tasks.</h1><p className="subheading">Everything you&apos;re carrying, in one place.</p></div><button className="primary-button" onClick={() => setTaskOpen(true)}><Plus size={17} />New task</button></div><div className="task-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tasks…" /></div><select className="area-filter" value={filterArea} onChange={event => setFilterArea(event.target.value)}><option value="all">All life areas</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div><section className="panel full-task-panel">{visibleTasks.length ? visibleTasks.map(task => <TaskRow key={task.id} task={task} areas={areas} onToggle={toggleTask} onDelete={deleteTask} />) : <div className="empty-state"><ListTodo size={20} /><strong>No tasks yet</strong><span>Start with one small thing.</span></div>}</section></div>}
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
            const eventsFor = (date: Date) => events.filter(item => localDate(item.startsAt) === calendarDateKey(date));
            const tasksFor = (date: Date) => openTasks.filter(item => item.dueAt && localDate(item.dueAt) === calendarDateKey(date));
            const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            return <div className="section-page calendar-workspace">
              <div className="calendar-heading">
                <div><div className="eyebrow">YOUR TIME, IN ONE PLACE</div><h1>Calendar</h1><p className="subheading">A clear view of what’s ahead.</p></div>
                <button className="primary-button" onClick={() => openNewEvent()}><Plus size={16}/>Create event</button>
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
                    const isCurrentMonth = date.getMonth() === calendarDate.getMonth();
                    return <button key={key} className={`month-day ${isCurrentMonth ? "" : "outside-month"} ${key === todayKey ? "is-today" : ""} ${key === calendarDateKey(calendarDate) ? "is-selected" : ""}`} onClick={() => { setCalendarDate(date); setCalendarMode("day"); }}>
                      <span className="month-day-number">{date.getDate()}</span>
                      <span className="month-day-items">
                        {dayEvents.slice(0, 3).map(item => <span key={item.id} className="month-event" style={{ "--event-color": areas.find(area => area.id === item.lifeAreaId)?.color || "#A78BFA" } as CSSProperties} onClick={event => { event.stopPropagation(); openEditEvent(item); }}>{item.title}</span>)}
                        {dayTasks.slice(0, Math.max(0, 3 - Math.min(dayEvents.length, 3))).map(item => <span key={item.id} className="month-event task-calendar-event">{item.title}</span>)}
                        {dayEvents.length + dayTasks.length > 3 && <span className="month-more">+{dayEvents.length + dayTasks.length - 3} more</span>}
                      </span>
                    </button>;
                  })}</div>
                </div> : <div className={`agenda-calendar ${calendarMode === "day" ? "single-day" : ""}`}>
                  <div className="agenda-header"><div className="agenda-time-spacer"/>{visibleDays.map(date => <button key={calendarDateKey(date)} className={`agenda-day-heading ${calendarDateKey(date) === todayKey ? "is-today" : ""}`} onClick={() => { setCalendarDate(date); setCalendarMode("day"); }}><span>{date.toLocaleDateString(undefined, { weekday: "short" })}</span><strong>{date.getDate()}</strong></button>)}</div>
                  <div className="agenda-all-day"><div className="agenda-time-label">all-day</div>{visibleDays.map(date => <div className="agenda-all-day-cell" key={calendarDateKey(date)}>{eventsFor(date).filter(item => item.allDay).map(item => <button key={item.id} className="agenda-event all-day-event" onClick={() => openEditEvent(item)}>{item.title}</button>)}</div>)}</div>
                  <div className="agenda-scroll"><div className="agenda-time-column">{Array.from({length:17},(_,index)=>index+6).map(hour=><div key={hour} className="agenda-hour-label">{String(hour).padStart(2,"0")}:00</div>)}</div>
                    <div className="agenda-days">{visibleDays.map(date => <div className="agenda-day-column" key={calendarDateKey(date)}>
                      {Array.from({length:17},(_,index)=><button key={index} className="agenda-hour-cell" onClick={() => { setCalendarDate(date); setEventDate(calendarDateKey(date)); setEventTime(String(index+6).padStart(2,"0")+":00"); setEventEndTime(String(index+7).padStart(2,"0")+":00"); setEventAllDay(false); setEventEditingId(null); setEventTitle(""); setEventDescription(""); setEventLocation(""); setEventArea(""); setEventProject(""); setEventOpen(true); }} aria-label={`Create event at ${index+6}:00`}/>)}
                      {eventsFor(date).filter(item => !item.allDay).map(item => {
                        const start = new Date(item.startsAt);
                        const end = item.endsAt ? new Date(item.endsAt) : new Date(start.getTime()+60*60*1000);
                        const top = Math.max(0, (start.getHours()-6)*56 + start.getMinutes()/60*56);
                        const height = Math.max(30, Math.min(952-top, (end.getTime()-start.getTime())/60000/60*56));
                        return <button key={item.id} className="agenda-event timed-agenda-event" style={{ top, height, "--event-color": areas.find(area => area.id === item.lifeAreaId)?.color || "#A78BFA" } as React.CSSProperties} onClick={() => openEditEvent(item)}><strong>{item.title}</strong><span>{formatEventTime(item.startsAt)}{item.endsAt ? " – "+formatEventTime(item.endsAt) : ""}</span></button>;
                      })}
                      {tasksFor(date).map(item => <div key={item.id} className="agenda-task-deadline"><CalendarDays size={11}/>{item.title}</div>)}
                    </div>)}</div>
                  </div>
                </div>}
                <div className="calendar-legend"><span><i className="legend-event"/>Events</span><span><i className="legend-task"/>Task deadlines</span><span className="calendar-hint">Select a day or event to see more</span></div>
              </section>
            </div>;
          })()}

          {view === "Goals" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">THE BIGGER PICTURE</div><h1>Your goals.</h1><p className="subheading">Give your longer-term intentions a place to live.</p></div><button className="primary-button" onClick={()=>setGoalOpen(true)}><Plus size={17}/>New goal</button></div><section className="project-grid">{goals.map(goal=><article className="panel project-card" key={goal.id}><div className="section-kicker">{goal.status.toUpperCase()}</div><h2>{goal.title}</h2><p>{goal.description||"A direction worth making time for."}</p><span>{goal.targetDate?"Target · "+new Date(goal.targetDate+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"No target date"}</span><div className="goal-actions"><button className="secondary-button" onClick={async()=>{const status=goal.status==="completed"?"active":"completed";try{const result=await apiRequest<ApiList<ApiGoal>>("/goals/"+goal.id,{method:"PATCH",body:JSON.stringify({status})});setGoals(current=>current.map(item=>item.id===goal.id?result.data:item));}catch(cause){setError(cause instanceof Error?cause.message:"Could not update goal.");}}}>{goal.status==="completed"?"Reopen":"Mark complete"}</button><button className="icon-button" onClick={async()=>{try{await apiRequest("/goals/"+goal.id,{method:"DELETE"});setGoals(current=>current.filter(item=>item.id!==goal.id));}catch(cause){setError(cause instanceof Error?cause.message:"Could not delete goal.");}}} aria-label="Delete goal"><Trash2 size={14}/></button></div></article>)}{goals.length===0&&<div className="empty-state"><Flag size={20}/><strong>No goals yet</strong><span>Start with something you want to move towards.</span></div>}</section></div>}
          {view === "Habits" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">SMALL THINGS, REPEATED</div><h1>Your habits.</h1><p className="subheading">Build consistency without the pressure of perfect streaks.</p></div><button className="primary-button" onClick={()=>setHabitOpen(true)}><Plus size={17}/>New habit</button></div><section className="panel full-task-panel">{habits.filter(habit=>!habit.archivedAt).map(habit=>{const today=localDate(new Date().toISOString());const checked=habitEntries.some(entry=>entry.habitId===habit.id&&entry.entryDate===today);const area=areas.find(item=>item.id===habit.lifeAreaId);const recent=habitEntries.filter(entry=>entry.habitId===habit.id).length;return <div className="habit-row" key={habit.id}><button className={"task-check "+(checked?"checked":"")} onClick={()=>void checkInHabit(habit)} aria-label="Toggle today's check-in">{checked&&<Check size={13}/>}</button><div className="task-copy"><strong className="task-title">{habit.name}</strong><div className="task-meta"><span className="area-tag">{area?.name||"Personal"}</span><span className="repeat-tag">{habit.frequency==="weekdays"?"Weekdays":habit.frequency==="weekly"?"Weekly":"Daily"}</span><span className="due-tag">{recent} check-ins</span></div></div><button className="icon-button" onClick={async()=>{try{await apiRequest("/habits/"+habit.id,{method:"PATCH",body:JSON.stringify({archived:true})});setHabits(current=>current.map(item=>item.id===habit.id?{...item,archivedAt:new Date().toISOString()}:item));}catch(cause){setError(cause instanceof Error?cause.message:"Could not archive habit.");}}} aria-label="Archive habit"><CheckCheck size={15}/></button></div>;})}{habits.filter(habit=>!habit.archivedAt).length===0&&<div className="empty-state"><Heart size={20}/><strong>No habits yet</strong><span>Choose one small practice you want to repeat.</span></div>}</section></div>}
          {view === "Life Areas" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">THE CONTEXT BEHIND YOUR WORK</div><h1>Your life areas.</h1><p className="subheading">Organize responsibilities without splitting your life into silos.</p></div><button className="primary-button" onClick={()=>setAreaOpen(true)}><Plus size={17}/>New area</button></div><section className="project-grid">{areas.map(area=><article className="panel project-card" key={area.id}><div className="section-kicker">LIFE AREA</div><h2><span className="area-mini-icon" style={{display:"inline-grid",background:area.color+"22",color:area.color,marginRight:8}}>●</span>{area.name}</h2><p>{tasks.filter(task=>task.lifeAreaId===area.id).length} tasks · {projects.filter(project=>project.lifeAreaId===area.id).length} projects</p><div className="goal-actions"><button className="secondary-button" onClick={()=>{setFilterArea(area.id);setView("Tasks");}}>View tasks</button><button className="icon-button" onClick={()=>void deleteArea(area)} aria-label="Delete life area"><Trash2 size={14}/></button></div></article>)}</section></div>}
          {view === "Projects" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">THINGS YOU&apos;RE BUILDING</div><h1>Your projects.</h1><p className="subheading">Keep the bigger picture connected to the next step.</p></div><button className="primary-button" onClick={() => setProjectOpen(true)}><Plus size={17} />New project</button></div><section className="project-grid">{projects.map(project => <article className="panel project-card" key={project.id}><div className="section-kicker">{project.status.replace("_", " ").toUpperCase()}</div><h2>{project.name}</h2><p>{project.description || "No description yet."}</p><span>{tasks.filter(task => task.projectId === project.id).length} linked tasks</span></article>)}{projects.length === 0 && <div className="empty-state"><Command size={20} /><strong>No projects yet</strong><span>Create a project when something needs more than one step.</span></div>}</section></div>}
        </div>
      </section>

      {taskOpen && <div className="modal-backdrop"><form className="task-modal" onSubmit={createTask}><div className="modal-heading"><div><div className="section-kicker">GET IT OUT OF YOUR HEAD</div><h2>New task</h2></div><button type="button" className="icon-button" onClick={() => setTaskOpen(false)}><X size={18} /></button></div><label className="form-label">Task name<input required autoFocus value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="What needs your attention?" /></label><label className="form-label">Notes<textarea rows={3} value={taskDescription} onChange={event => setTaskDescription(event.target.value)} placeholder="Add a little context…" /></label><div className="form-grid"><label className="form-label">Life area<select value={taskArea} onChange={event => setTaskArea(event.target.value)}><option value="">None</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label className="form-label">Priority<select value={taskPriority} onChange={event => setTaskPriority(event.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><label className="form-label">Due date<input type="date" value={taskDue} onChange={event => setTaskDue(event.target.value)} /></label><label className="form-label">Project<select value={taskProject} onChange={event => setTaskProject(event.target.value)}><option value="">None</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label></div><div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setTaskOpen(false)}>Cancel</button><button className="primary-button" type="submit">Create task <ArrowRight size={14} /></button></div></form></div>}
      {goalOpen && <div className="modal-backdrop"><form className="task-modal" onSubmit={createGoal}><div className="modal-heading"><div><div className="section-kicker">THINK LONG TERM</div><h2>New goal</h2></div><button type="button" className="icon-button" onClick={()=>setGoalOpen(false)}><X size={18}/></button></div><label className="form-label">Goal<input required autoFocus value={goalTitle} onChange={event=>setGoalTitle(event.target.value)} placeholder="What do you want to work towards?"/></label><div className="form-grid"><label className="form-label">Life area<select value={goalArea} onChange={event=>setGoalArea(event.target.value)}><option value="">None</option>{areas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label className="form-label">Target date<input type="date" value={goalDate} onChange={event=>setGoalDate(event.target.value)}/></label></div><div className="modal-footer"><button type="button" className="secondary-button" onClick={()=>setGoalOpen(false)}>Cancel</button><button className="primary-button" type="submit">Create goal</button></div></form></div>}
      {habitOpen && <div className="modal-backdrop"><form className="task-modal" onSubmit={createHabit}><div className="modal-heading"><div><div className="section-kicker">BUILD A PRACTICE</div><h2>New habit</h2></div><button type="button" className="icon-button" onClick={()=>setHabitOpen(false)}><X size={18}/></button></div><label className="form-label">Habit name<input required autoFocus value={habitName} onChange={event=>setHabitName(event.target.value)} placeholder="e.g. Read for 15 minutes"/></label><div className="form-grid"><label className="form-label">Life area<select value={habitArea} onChange={event=>setHabitArea(event.target.value)}><option value="">Personal</option>{areas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label className="form-label">Frequency<select value={habitFrequency} onChange={event=>setHabitFrequency(event.target.value as typeof habitFrequency)}><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select></label></div><div className="modal-footer"><button type="button" className="secondary-button" onClick={()=>setHabitOpen(false)}>Cancel</button><button className="primary-button" type="submit">Create habit</button></div></form></div>}
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
      {areaOpen && <div className="modal-backdrop"><form className="task-modal" onSubmit={createArea}><div className="modal-heading"><div><div className="section-kicker">MAKE IT YOURS</div><h2>New life area</h2></div><button type="button" className="icon-button" onClick={()=>setAreaOpen(false)}><X size={18}/></button></div><label className="form-label">Area name<input required autoFocus value={areaName} onChange={event=>setAreaName(event.target.value)} placeholder="e.g. Learning"/></label><label className="form-label">Color<input type="color" value={areaColor} onChange={event=>setAreaColor(event.target.value)}/></label><div className="modal-footer"><button type="button" className="secondary-button" onClick={()=>setAreaOpen(false)}>Cancel</button><button className="primary-button" type="submit">Create area</button></div></form></div>}
      {projectOpen && <div className="modal-backdrop"><form className="task-modal" onSubmit={createProject}><div className="modal-heading"><div><div className="section-kicker">START SOMETHING</div><h2>New project</h2></div><button type="button" className="icon-button" onClick={() => setProjectOpen(false)}><X size={18} /></button></div><label className="form-label">Project name<input required autoFocus value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="What are you working on?" /></label><div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setProjectOpen(false)}>Cancel</button><button className="primary-button" type="submit">Create project</button></div></form></div>}
    </main>
  );
}

function TaskRow({ task, areas, onToggle, onDelete }: {
  task: ApiTask;
  areas: ApiLifeArea[];
  onToggle: (task: ApiTask) => void;
  onDelete: (id: string) => void;
}) {
  const area = areas.find(item => item.id === task.lifeAreaId);
  const due = task.dueAt ? localDate(task.dueAt) : "";
  const today = localDate(new Date().toISOString());
  return <div className={`task-row ${task.status === "done" ? "task-completed" : ""}`}>
    <button className={`task-check ${task.status === "done" ? "checked" : ""}`} onClick={() => onToggle(task)} aria-label="Toggle completion">{task.status === "done" && <Check size={13} />}</button>
    <div className="task-copy"><strong className="task-title">{task.title}</strong>{task.description && <span className="task-notes">{task.description}</span>}<div className="task-meta">{area && <span className="area-tag">{area.name}</span>}<span className={`priority-tag priority-${task.priority}`}><i />{task.priority}</span>{due && <span className={`due-tag ${due < today && task.status !== "done" ? "overdue-tag" : ""}`}><CalendarDays size={12} />{due === today ? "Today" : new Date(task.dueAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}</div></div>
    <button className="icon-button task-more" onClick={() => onDelete(task.id)} aria-label="Delete task"><Trash2 size={15} /></button>
  </div>;
}
