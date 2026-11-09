"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight, CalendarDays, Check, CheckCheck, Command, Inbox,
  LayoutDashboard, ListTodo, LogOut, Plus, RefreshCw, Search, Sparkles, Target, Trash2, X
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";
import type { ApiInboxItem, ApiLifeArea, ApiList, ApiProject, ApiTask } from "@/lib/api";

type View = "Today" | "Inbox" | "Tasks" | "Projects";
type Priority = ApiTask["priority"];

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
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
  const [projectName, setProjectName] = useState("");

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [taskResult, areaResult, projectResult, inboxResult] = await Promise.all([
        apiRequest<ApiList<ApiTask[]>>("/tasks"),
        apiRequest<ApiList<ApiLifeArea[]>>("/life-areas"),
        apiRequest<ApiList<ApiProject[]>>("/projects"),
        apiRequest<ApiList<ApiInboxItem[]>>("/inbox?status=inbox")
      ]);

      let loadedAreas = areaResult.data;
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

      setTasks(taskResult.data);
      setAreas(loadedAreas);
      setProjects(projectResult.data);
      setInbox(inboxResult.data);
      if (!taskArea && loadedAreas[0]) setTaskArea(loadedAreas[0].id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load your workspace.");
    } finally {
      setLoading(false);
    }
  }, [taskArea]);

  useEffect(() => {
    if (session?.user?.id) void loadWorkspace();
    else {
      setTasks([]);
      setAreas([]);
      setProjects([]);
      setInbox([]);
    }
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
          status: "todo"
        })
      });
      setTasks(current => [result.data, ...current]);
      setTaskTitle("");
      setTaskDescription("");
      setTaskDue("");
      setTaskProject("");
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

  async function createProject(event: FormEvent) {
    event.preventDefault();
    if (!projectName.trim()) return;
    try {
      const result = await apiRequest<ApiList<ApiProject>>("/projects", {
        method: "POST",
        body: JSON.stringify({ name: projectName.trim() })
      });
      setProjects(current => [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      setProjectName("");
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
        <p className="subheading">A calm place for everything you're carrying.</p>
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
            ["Projects", Command]
          ] as const).map(([name, Icon]) =>
            <button key={name} className={`nav-item ${view === name ? "active" : ""}`} onClick={() => setView(name)}>
              <Icon size={17} strokeWidth={1.8} /><span>{name}</span>
              {name === "Inbox" && <span className="nav-count">{inbox.length}</span>}
              {name === "Tasks" && <span className="nav-count">{openTasks.length}</span>}
            </button>
          )}
        </nav>
        <div className="workspace-label areas-label">YOUR LIFE</div>
        <div className="area-nav">
          {areas.map(area => <button key={area.id} className="area-item" onClick={() => { setTaskArea(area.id); setFilterArea(area.id); setView("Tasks"); }}>
            <span className="area-dot" style={{ color: area.color, background: area.color + "20" }}><span>•</span></span><span>{area.name}</span>
          </button>)}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-quote">“You don't have to do it all. Just the next thing.”</div>
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
            <div className="welcome-row"><div><div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div><h1>{greeting()}, {session.user.name?.split(" ")[0] || "there"}.</h1><p className="subheading">A little clarity goes a long way. Here's your day at a glance.</p></div><button className="primary-button" onClick={() => setTaskOpen(true)}><Plus size={17} />New task</button></div>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-top"><span>Open tasks</span><ListTodo size={16} /></div><div className="stat-value">{openTasks.length}</div><div className="stat-foot">Across your life areas</div></div>
              <div className="stat-card"><div className="stat-top"><span>Due today</span><Target size={16} /></div><div className="stat-value">{dueToday.length}</div><div className="stat-foot">{overdue.length} overdue</div></div>
              <div className="stat-card"><div className="stat-top"><span>Completed</span><CheckCheck size={16} /></div><div className="stat-value">{completed.length}</div><div className="stat-foot">A little progress counts</div></div>
            </div>
            <div className="content-grid">
              <section className="panel tasks-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR FOCUS</div><h2>Today's priorities</h2></div><button className="text-button" onClick={() => setView("Tasks")}>View all <ArrowRight size={14} /></button></div>
                {loading ? <div className="empty-state">Loading your tasks…</div> : dueToday.length || openTasks.length ? (dueToday.length ? dueToday : openTasks).slice(0, 7).map(task => <TaskRow key={task.id} task={task} areas={areas} onToggle={toggleTask} onDelete={deleteTask} />) : <div className="empty-state"><Check size={20} /><strong>All clear for now</strong><span>Enjoy the breathing room. You've earned it.</span></div>}
                <button className="add-task-row" onClick={() => setTaskOpen(true)}><Plus size={15} />Add a task</button>
              </section>
              <div className="right-column">
                <section className="panel ai-panel"><div className="ai-heading"><span className="ai-spark"><Sparkles size={16} /></span><span>SONDER AI</span><span className="coming-pill">LOCAL FIRST · LATER</span></div><h2>A clearer next step.</h2><p>Your day has {dueToday.length} task{dueToday.length === 1 ? "" : "s"} due today{overdue.length ? ` and ${overdue.length} overdue` : ""}. Start with one meaningful thing, then reassess.</p><p className="muted-note">AI will be optional and run locally where possible — no paid AI API required.</p></section>
                <section className="panel areas-panel"><div className="panel-heading compact-heading"><div><div className="section-kicker">THE BIG PICTURE</div><h2>Your life areas</h2></div></div><div className="area-progress-list">{areas.map(area => { const related = tasks.filter(task => task.lifeAreaId === area.id); const done = related.filter(task => task.status === "done").length; return <div className="area-progress" key={area.id}><span className="area-mini-icon" style={{ color: area.color }}>●</span><span className="progress-name">{area.name}</span><span className="progress-track"><i style={{ width: related.length ? `${done / related.length * 100}%` : "0%" }} /></span><span className="progress-number">{done}/{related.length}</span></div>; })}</div></section>
              </div>
            </div>
          </>}
          {view === "Inbox" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">CAPTURE NOW · ORGANIZE LATER</div><h1>Your inbox.</h1><p className="subheading">Get it out of your head. Decide what it means later.</p></div></div><form className="capture-form" onSubmit={quickCapture}><Plus size={18} /><input value={capture} onChange={event => setCapture(event.target.value)} placeholder="Capture a task, thought, idea…" /><button className="primary-button" disabled={!capture.trim()}>Add to inbox</button></form><section className="panel full-task-panel">{inbox.length ? inbox.map(item => <div className="inbox-row" key={item.id}><div className="inbox-item-copy"><strong>{item.title}</strong><span>{item.type} · {new Date(item.createdAt).toLocaleDateString()}</span>{item.content && <p>{item.content}</p>}</div><div className="inbox-actions"><button className="secondary-button" onClick={() => void convertInboxItem(item)}>Make task</button><button className="icon-button" onClick={() => void archiveInboxItem(item)} aria-label="Archive"><Check size={16} /></button></div></div>) : <div className="empty-state"><Inbox size={20} /><strong>Your inbox is clear</strong><span>Capture anything you don't want to forget.</span></div>}</section></div>}
          {view === "Tasks" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">MAKE SPACE FOR WHAT MATTERS</div><h1>Your tasks.</h1><p className="subheading">Everything you're carrying, in one place.</p></div><button className="primary-button" onClick={() => setTaskOpen(true)}><Plus size={17} />New task</button></div><div className="task-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tasks…" /></div><select className="area-filter" value={filterArea} onChange={event => setFilterArea(event.target.value)}><option value="all">All life areas</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div><section className="panel full-task-panel">{visibleTasks.length ? visibleTasks.map(task => <TaskRow key={task.id} task={task} areas={areas} onToggle={toggleTask} onDelete={deleteTask} />) : <div className="empty-state"><ListTodo size={20} /><strong>No tasks yet</strong><span>Start with one small thing.</span></div>}</section></div>}
          {view === "Projects" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">THINGS YOU'RE BUILDING</div><h1>Your projects.</h1><p className="subheading">Keep the bigger picture connected to the next step.</p></div><button className="primary-button" onClick={() => setProjectOpen(true)}><Plus size={17} />New project</button></div><section className="project-grid">{projects.map(project => <article className="panel project-card" key={project.id}><div className="section-kicker">{project.status.replace("_", " ").toUpperCase()}</div><h2>{project.name}</h2><p>{project.description || "No description yet."}</p><span>{tasks.filter(task => task.projectId === project.id).length} linked tasks</span></article>)}{projects.length === 0 && <div className="empty-state"><Command size={20} /><strong>No projects yet</strong><span>Create a project when something needs more than one step.</span></div>}</section></div>}
        </div>
      </section>

      {taskOpen && <div className="modal-backdrop"><form className="task-modal" onSubmit={createTask}><div className="modal-heading"><div><div className="section-kicker">GET IT OUT OF YOUR HEAD</div><h2>New task</h2></div><button type="button" className="icon-button" onClick={() => setTaskOpen(false)}><X size={18} /></button></div><label className="form-label">Task name<input required autoFocus value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="What needs your attention?" /></label><label className="form-label">Notes<textarea rows={3} value={taskDescription} onChange={event => setTaskDescription(event.target.value)} placeholder="Add a little context…" /></label><div className="form-grid"><label className="form-label">Life area<select value={taskArea} onChange={event => setTaskArea(event.target.value)}><option value="">None</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label className="form-label">Priority<select value={taskPriority} onChange={event => setTaskPriority(event.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><label className="form-label">Due date<input type="date" value={taskDue} onChange={event => setTaskDue(event.target.value)} /></label><label className="form-label">Project<select value={taskProject} onChange={event => setTaskProject(event.target.value)}><option value="">None</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label></div><div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setTaskOpen(false)}>Cancel</button><button className="primary-button" type="submit">Create task <ArrowRight size={14} /></button></div></form></div>}
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
