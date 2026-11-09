"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDown, ArrowUpRight, Bell, BookOpen, CalendarDays, Check,
  CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Circle, Command,
  Compass, Dumbbell, Filter, Heart, LayoutDashboard, ListTodo, Menu,
  MoreHorizontal, Plus, Search, Settings2, Sparkles, SquarePen, Target,
  Trash2, TrendingUp, X
} from "lucide-react";
import {
  Area, Priority, Repeat, Task, formatDueDate, localDate, readTasks, writeTasks
} from "@/lib/tasks";

type Section = "Overview" | "Tasks" | "Calendar" | "Insights" | "Settings";
const areas: Area[] = ["School", "Church", "Projects", "Personal", "Health"];
const priorities: Priority[] = ["Low", "Medium", "High"];
const repeats: Repeat[] = ["Never", "Daily", "Weekly", "Monthly"];

const areaIcons = {
  School: BookOpen,
  Church: Heart,
  Projects: Command,
  Personal: Compass,
  Health: Dumbbell
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function blankTask(): Omit<Task, "id" | "createdAt"> {
  return { title: "", notes: "", area: "Personal", priority: "Medium", dueDate: localDate(new Date()), repeat: "Never", completed: false };
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<Section>("Overview");
  const [query, setQuery] = useState("");
  const [filterArea, setFilterArea] = useState<"All" | Area>("All");
  const [filterStatus, setFilterStatus] = useState<"All" | "Open" | "Completed">("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState(blankTask);
  const [mobileNav, setMobileNav] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setTasks(readTasks());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeTasks(tasks);
  }, [tasks, ready]);

  const today = localDate(new Date());
  const openTasks = tasks.filter(t => !t.completed);
  const completedToday = tasks.filter(t => t.completed).length;
  const dueToday = openTasks.filter(t => t.dueDate === today);
  const overdue = openTasks.filter(t => t.dueDate && t.dueDate < today);
  const visibleTasks = useMemo(() => tasks
    .filter(t => section !== "Overview" || showAll || !t.completed)
    .filter(t => filterArea === "All" || t.area === filterArea)
    .filter(t => filterStatus === "All" || (filterStatus === "Open" ? !t.completed : t.completed))
    .filter(t => (t.title + " " + t.notes).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999")),
  [tasks, section, showAll, filterArea, filterStatus, query]);

  function openNewTask() {
    setEditing(null);
    setDraft(blankTask());
    setModalOpen(true);
  }
  function openEditTask(task: Task) {
    setEditing(task);
    setDraft({ title: task.title, notes: task.notes, area: task.area, priority: task.priority, dueDate: task.dueDate, repeat: task.repeat, completed: task.completed });
    setModalOpen(true);
  }
  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    if (editing) {
      setTasks(current => current.map(t => t.id === editing.id ? { ...t, ...draft, title: draft.title.trim() } : t));
    } else {
      setTasks(current => [{ ...draft, title: draft.title.trim(), id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current]);
    }
    setModalOpen(false);
  }
  function toggleTask(id: string) {
    setTasks(current => {
      const selected = current.find(t => t.id === id);
      if (!selected) return current;
      if (selected.completed) {
        return current.map(t => t.id === id ? { ...t, completed: false } : t);
      }
      const completed = { ...selected, completed: true };
      if (selected.repeat === "Never") {
        return current.map(t => t.id === id ? completed : t);
      }
      const nextDate = selected.dueDate ? new Date(selected.dueDate + "T12:00:00") : new Date();
      if (selected.repeat === "Daily") nextDate.setDate(nextDate.getDate() + 1);
      if (selected.repeat === "Weekly") nextDate.setDate(nextDate.getDate() + 7);
      if (selected.repeat === "Monthly") nextDate.setMonth(nextDate.getMonth() + 1);
      const nextTask: Task = {
        ...selected,
        id: crypto.randomUUID(),
        dueDate: localDate(nextDate),
        completed: false,
        createdAt: new Date().toISOString()
      };
      return [nextTask, ...current.map(t => t.id === id ? completed : t)];
    });
  }
  function deleteTask(id: string) {
    setTasks(current => current.filter(t => t.id !== id));
  }

  const navItems: { name: Section; icon: typeof LayoutDashboard }[] = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Tasks", icon: ListTodo },
    { name: "Calendar", icon: CalendarDays },
    { name: "Insights", icon: Activity }
  ];

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" onClick={() => { setSection("Overview"); setMobileNav(false); }}>
          <span className="brand-mark"><span /></span>
          <span className="brand-name">sonder</span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return <button key={item.name} className={`nav-item ${section === item.name ? "active" : ""}`} onClick={() => { setSection(item.name); setMobileNav(false); }}>
              <Icon size={17} strokeWidth={1.8} /><span>{item.name}</span>
              {item.name === "Tasks" && <span className="nav-count">{openTasks.length}</span>}
            </button>;
          })}
        </nav>
        <div className="workspace-label areas-label">YOUR LIFE</div>
        <div className="area-nav">
          {areas.map(area => {
            const Icon = areaIcons[area];
            const count = openTasks.filter(t => t.area === area).length;
            return <button key={area} className={`area-item ${filterArea === area ? "area-selected" : ""}`} onClick={() => { setFilterArea(filterArea === area ? "All" : area); setSection("Tasks"); setMobileNav(false); }}>
              <span className={`area-dot dot-${area.toLowerCase()}`}><Icon size={14} /></span><span>{area}</span><span className="area-count">{count || ""}</span>
            </button>;
          })}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-quote">“You don't have to do it all. Just the next thing.”</div>
          <button className="nav-item settings-link" onClick={() => setSection("Settings")}><Settings2 size={17} /><span>Settings</span></button>
          <div className="profile-row">
            <div className="avatar">S</div><div className="profile-copy"><strong>Your space</strong><span>Personal workspace</span></div><MoreHorizontal size={18} className="muted-icon" />
          </div>
        </div>
      </aside>

      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <section className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{section}</strong></div>
          <div className="topbar-actions">
            <div className="date-chip"><CalendarDays size={14} />{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={17} /><i /></button>
            <div className="avatar top-avatar">S</div>
          </div>
        </header>

        <div className="page-content">
          {section === "Overview" && <>
            <div className="welcome-row">
              <div><div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div><h1>{greeting()}.</h1><p className="subheading">A little clarity goes a long way. Here's your day at a glance.</p></div>
              <button className="primary-button" onClick={openNewTask}><Plus size={17} />New task</button>
            </div>

            <div className="stat-grid">
              <div className="stat-card"><div className="stat-top"><span>Open tasks</span><span className="stat-icon lavender"><ListTodo size={16} /></span></div><div className="stat-value">{openTasks.length}<span className="stat-caption">in your space</span></div><div className="stat-foot"><span className="tiny-dot purple-dot" />Across all life areas</div></div>
              <div className="stat-card"><div className="stat-top"><span>Due today</span><span className="stat-icon amber"><Target size={16} /></span></div><div className="stat-value">{dueToday.length}<span className="stat-caption">to focus on</span></div><div className="stat-foot">{overdue.length ? <><span className="tiny-dot red-dot" />{overdue.length} overdue</> : <><span className="tiny-dot green-dot" />You're up to date</>}</div></div>
              <div className="stat-card"><div className="stat-top"><span>Completed</span><span className="stat-icon green"><CheckCheck size={16} /></span></div><div className="stat-value">{completedToday}<span className="stat-caption">marked done</span></div><div className="stat-foot"><span className="tiny-dot green-dot" />Nice progress, keep it gentle</div></div>
            </div>

            <div className="content-grid">
              <section className="panel tasks-panel">
                <div className="panel-heading"><div><div className="section-kicker">YOUR FOCUS</div><h2>Today's priorities</h2></div><button className="text-button" onClick={() => { setSection("Tasks"); setShowAll(true); }}>View all <ArrowUpRight size={15} /></button></div>
                <div className="task-list">
                  {visibleTasks.filter(t => !t.completed).slice(0, 5).map(task => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={openEditTask} onDelete={deleteTask} />)}
                  {openTasks.length === 0 && <div className="empty-state"><span className="empty-icon"><Check size={20} /></span><strong>All clear for now</strong><span>Enjoy the breathing room. You've earned it.</span></div>}
                </div>
                <button className="add-task-row" onClick={openNewTask}><Plus size={16} />Add a task</button>
              </section>

              <div className="right-column">
                <section className="panel ai-panel">
                  <div className="ai-heading"><span className="ai-spark"><Sparkles size={16} /></span><span>SONDER AI</span><span className="coming-pill">PREVIEW</span></div>
                  <h2>A clearer next step.</h2>
                  <p>Your day has {dueToday.length} task{dueToday.length === 1 ? "" : "s"} due today{overdue.length ? ` and ${overdue.length} overdue` : ""}. Start with one meaningful thing, then reassess.</p>
                  <button className="ai-button" onClick={() => setSection("Insights")}>Explore your insights <ArrowUpRight size={15} /></button>
                </section>
                <section className="panel areas-panel">
                  <div className="panel-heading compact-heading"><div><div className="section-kicker">THE BIG PICTURE</div><h2>Your life areas</h2></div><button className="icon-button subtle" onClick={() => { setFilterArea("All"); setSection("Tasks"); }} aria-label="View all areas"><ArrowUpRight size={16} /></button></div>
                  <div className="area-progress-list">
                    {areas.map(area => {
                      const all = tasks.filter(t => t.area === area);
                      const done = all.filter(t => t.completed).length;
                      const Icon = areaIcons[area];
                      return <button className="area-progress" key={area} onClick={() => { setFilterArea(area); setSection("Tasks"); }}>
                        <span className={`area-mini-icon dot-${area.toLowerCase()}`}><Icon size={14} /></span><span className="progress-name">{area}</span><span className="progress-track"><i style={{ width: all.length ? `${done / all.length * 100}%` : "0%" }} /></span><span className="progress-number">{done}/{all.length}</span>
                      </button>;
                    })}
                  </div>
                </section>
              </div>
            </div>
            <section className="panel bottom-panel">
              <div className="bottom-message"><div className="bottom-orb"><Compass size={20} /></div><div><strong>Make room for what matters.</strong><span>Sonder is here to help you see the whole picture, not fill every minute.</span></div></div>
              <div className="bottom-metric"><span>YOUR PACE</span><strong>One day at a time</strong></div>
            </section>
          </>}

          {section === "Tasks" && <div className="section-page">
            <div className="welcome-row"><div><div className="eyebrow">MAKE SPACE FOR WHAT MATTERS</div><h1>Your tasks.</h1><p className="subheading">Everything you're carrying, in one place.</p></div><button className="primary-button" onClick={openNewTask}><Plus size={17} />New task</button></div>
            <div className="task-toolbar">
              <div className="search-field"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks..." /></div>
              <select value={filterArea} onChange={e => setFilterArea(e.target.value as "All" | Area)} aria-label="Filter by life area"><option value="All">All areas</option>{areas.map(a => <option key={a}>{a}</option>)}</select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)} aria-label="Filter by status"><option value="All">All tasks</option><option value="Open">Open</option><option value="Completed">Completed</option></select>
            </div>
            <div className="task-summary-line"><span>{visibleTasks.length} task{visibleTasks.length === 1 ? "" : "s"}</span><span>{visibleTasks.filter(t => t.completed).length} completed</span></div>
            <section className="panel full-task-panel">
              {visibleTasks.length ? visibleTasks.map(task => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={openEditTask} onDelete={deleteTask} />) : <div className="empty-state"><span className="empty-icon"><ListTodo size={20} /></span><strong>Nothing here just yet</strong><span>Try another filter or add a new task.</span><button className="text-button" onClick={openNewTask}>Create a task <Plus size={14} /></button></div>}
            </section>
          </div>}

          {section === "Calendar" && <div className="section-page"><div className="welcome-row"><div><div className="eyebrow">LOOK AHEAD</div><h1>Your calendar.</h1><p className="subheading">A simple view of what's coming up.</p></div><button className="primary-button" onClick={openNewTask}><Plus size={17} />Add task</button></div><section className="panel calendar-panel"><div className="panel-heading"><div><div className="section-kicker">UPCOMING</div><h2>Next 14 days</h2></div><CalendarDays size={19} className="muted-icon" /></div>{Array.from({ length: 14 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() + i); const key = localDate(date); const dayTasks = tasks.filter(t => t.dueDate === key); return <div className="calendar-day" key={key}><div className="calendar-date"><strong>{date.toLocaleDateString(undefined, { weekday: "short" })}</strong><span>{date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div><div className="calendar-events">{dayTasks.length ? dayTasks.map(t => <button key={t.id} className={`calendar-event ${t.completed ? "event-done" : ""}`} onClick={() => openEditTask(t)}><i className={`event-dot dot-${t.area.toLowerCase()}`} />{t.title}</button>) : <span className="no-events">Nothing planned</span>}</div></div>; })}</section></div>}

          {section === "Insights" && <div className="section-page"><div className="eyebrow">A MOMENT TO REFLECT</div><h1>Your perspective.</h1><p className="subheading">A little context, without the pressure to optimize everything.</p><div className="insight-grid"><div className="panel insight-card"><span className="stat-icon lavender"><TrendingUp size={18} /></span><span className="section-kicker">TASK COMPLETION</span><strong>{tasks.length ? Math.round(completedToday / tasks.length * 100) : 0}%</strong><p>of your current tasks are complete.</p></div><div className="panel insight-card"><span className="stat-icon amber"><Target size={18} /></span><span className="section-kicker">NEEDS ATTENTION</span><strong>{overdue.length + dueToday.length}</strong><p>tasks are overdue or due today.</p></div></div><section className="panel reflection-panel"><Sparkles size={18} /><div><strong>A gentle reminder</strong><p>These numbers are information, not a score. Your life is bigger than a checklist. Rest is part of the plan, too.</p></div></section></div>}

          {section === "Settings" && <div className="section-page"><div className="eyebrow">MAKE IT YOURS</div><h1>Your settings.</h1><p className="subheading">Sonder is currently running as a local prototype.</p><section className="panel settings-panel"><div><strong>Data storage</strong><span>Tasks are saved in this browser on this device.</span></div><span className="settings-status">LOCAL ONLY</span></section><section className="panel settings-panel"><div><strong>Cloud sync</strong><span>Account sign-in and cross-device sync will be added in a later milestone.</span></div><span className="settings-status muted-status">COMING NEXT</span></section><section className="panel settings-panel"><div><strong>Reset sample data</strong><span>Restore the starter tasks on this browser.</span></div><button className="secondary-button" onClick={() => { if (confirm("Restore the starter tasks? This replaces your current tasks on this device.")) setTasks(readTasks().length ? (awaitInitialTasks()) : []); }}>Restore starter tasks</button></section></div>}
        </div>
      </section>

      {modalOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <form className="task-modal" onSubmit={saveTask}>
          <div className="modal-heading"><div><div className="section-kicker">{editing ? "MAKE A CHANGE" : "GET IT OUT OF YOUR HEAD"}</div><h2>{editing ? "Edit task" : "New task"}</h2></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={18} /></button></div>
          <label className="form-label">Task name<input autoFocus required maxLength={120} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="What needs your attention?" /></label>
          <label className="form-label">Notes <span className="optional-label">OPTIONAL</span><textarea rows={3} maxLength={500} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Add a little context..." /></label>
          <div className="form-grid"><label className="form-label">Life area<select value={draft.area} onChange={e => setDraft({ ...draft, area: e.target.value as Area })}>{areas.map(a => <option key={a}>{a}</option>)}</select></label><label className="form-label">Priority<select value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as Priority })}>{priorities.map(p => <option key={p}>{p}</option>)}</select></label><label className="form-label">Due date<input type="date" value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} /></label><label className="form-label">Repeat<select value={draft.repeat} onChange={e => setDraft({ ...draft, repeat: e.target.value as Repeat })}>{repeats.map(r => <option key={r}>{r}</option>)}</select></label></div>
          <div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary-button" type="submit">{editing ? "Save changes" : "Create task"}<ArrowUpRight size={15} /></button></div>
        </form>
      </div>}
    </main>
  );
}

function awaitInitialTasks(): Task[] {
  return [
    { id: "sample-1", title: "Finish economics assignment", notes: "Review the final section and prepare the slides.", area: "School", priority: "High", dueDate: localDate(new Date()), repeat: "Never", completed: false, createdAt: new Date().toISOString() },
    { id: "sample-2", title: "Review C++ subprograms", notes: "A focused 30-minute revision session.", area: "School", priority: "Medium", dueDate: localDate(new Date()), repeat: "Never", completed: false, createdAt: new Date().toISOString() },
    { id: "sample-3", title: "Check Sunday service setup", notes: "Confirm the media and audio checklist.", area: "Church", priority: "Medium", dueDate: localDate(new Date()), repeat: "Weekly", completed: false, createdAt: new Date().toISOString() },
    { id: "sample-4", title: "Go for a workout", notes: "Keep it simple. Showing up is enough.", area: "Health", priority: "Low", dueDate: "", repeat: "Never", completed: false, createdAt: new Date().toISOString() }
  ];
}

function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: (id: string) => void; onEdit: (task: Task) => void; onDelete: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className={`task-row ${task.completed ? "task-completed" : ""}`}>
    <button className={`task-check ${task.completed ? "checked" : ""}`} onClick={() => onToggle(task.id)} aria-label={task.completed ? "Mark as open" : "Mark as complete"}>{task.completed && <Check size={13} />}</button>
    <div className="task-copy"><button className="task-title" onClick={() => onEdit(task)}>{task.title}</button>{task.notes && <span className="task-notes">{task.notes}</span>}<div className="task-meta"><span className={`area-tag tag-${task.area.toLowerCase()}`}>{task.area}</span><span className={`priority-tag priority-${task.priority.toLowerCase()}`}><i />{task.priority}</span><span className={`due-tag ${task.dueDate && task.dueDate < localDate(new Date()) && !task.completed ? "overdue-tag" : ""}`}><CalendarDays size={12} />{formatDueDate(task.dueDate)}</span>{task.repeat !== "Never" && <span className="repeat-tag"><Activity size={11} />{task.repeat}</span>}</div></div>
    <div className="task-actions"><button className="icon-button task-more" onClick={() => setMenuOpen(!menuOpen)} aria-label="Task options"><MoreHorizontal size={17} /></button>{menuOpen && <div className="task-menu"><button onClick={() => { onEdit(task); setMenuOpen(false); }}><SquarePen size={14} />Edit</button><button className="delete-action" onClick={() => { onDelete(task.id); setMenuOpen(false); }}><Trash2 size={14} />Delete</button></div>}</div>
  </div>;
}