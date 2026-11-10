"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, LayoutGrid, List, Search, X } from "lucide-react";
import { apiRequest, type ApiList, type ApiTask } from "@/lib/api";

type TaskStatus = "inbox" | "todo" | "in_progress" | "done" | "cancelled";
const columns: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" }
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"list" | "board">("list");
  const [selected, setSelected] = useState<ApiTask | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const result = await apiRequest<ApiList<ApiTask[]>>("/tasks");
      setTasks(result.data);
      setSelected(current => current ? result.data.find(task => task.id === current.id) ?? null : null);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't load tasks."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => tasks.filter(task =>
    (statusFilter === "all" || task.status === statusFilter) &&
    (task.title + " " + (task.description ?? "")).toLowerCase().includes(query.toLowerCase())
  ), [tasks, statusFilter, query]);

  async function update(task: ApiTask, changes: Partial<ApiTask>) {
    setSaving(true);
    try {
      const result = await apiRequest<{ data: ApiTask }>("/tasks/" + task.id, { method: "PATCH", body: JSON.stringify(changes) });
      setTasks(current => current.map(item => item.id === task.id ? result.data : item));
      setSelected(result.data);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't update the task."); }
    finally { setSaving(false); }
  }

  return <main className="life-page">
    <header className="life-page-header"><Link href="/" className="life-back"><ArrowLeft size={16}/> Workspace</Link><div><span className="life-eyebrow">MAKE SPACE FOR WHAT MATTERS</span><h1>Task workspace</h1><p>Plan, prioritize and move work forward.</p></div></header>
    {error && <div className="life-error">{error}</div>}
    <div className="life-toolbar"><label className="life-search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search tasks"/></label><select value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">All statuses</option>{columns.map(column=><option key={column.id} value={column.id}>{column.label}</option>)}<option value="cancelled">Cancelled</option></select><div className="life-view-toggle"><button className={view==="list"?"active":""} onClick={()=>setView("list")} aria-label="List view"><List size={16}/></button><button className={view==="board"?"active":""} onClick={()=>setView("board")} aria-label="Board view"><LayoutGrid size={16}/></button></div></div>
    {loading ? <div className="life-panel">Loading tasks…</div> : view === "list" ? <section className="life-panel task-work-list">{filtered.map(task=><button className="task-work-row" key={task.id} onClick={()=>setSelected(task)}><span className={"task-status-dot status-"+task.status}/><span className="task-work-copy"><strong>{task.title}</strong><small>{task.description || "No description"} · {task.priority} priority</small></span><span className="task-work-date">{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "No due date"}</span></button>)}{!filtered.length&&<p className="life-empty">No tasks match this view.</p>}</section> : <section className="task-board">{columns.map(column=><div className="task-board-column" key={column.id}><div className="task-board-heading"><strong>{column.label}</strong><span>{filtered.filter(task=>task.status===column.id).length}</span></div>{filtered.filter(task=>task.status===column.id).map(task=><button className="task-board-card" key={task.id} onClick={()=>setSelected(task)}><strong>{task.title}</strong><small>{task.priority} priority</small>{task.dueAt&&<span><Clock3 size={12}/>{new Date(task.dueAt).toLocaleDateString()}</span>}</button>)}</div>)}</section>}
    {selected&&<div className="life-drawer-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null);}}><aside className="life-drawer"><div className="life-drawer-head"><span className="life-eyebrow">TASK DETAILS</span><button className="life-icon-button" onClick={()=>setSelected(null)} aria-label="Close"><X size={18}/></button></div><h2>{selected.title}</h2><p>{selected.description || "No description added."}</p><label>Status<select value={selected.status} disabled={saving} onChange={event=>void update(selected,{status:event.target.value as TaskStatus})}><option value="inbox">Inbox</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select></label><label>Priority<select value={selected.priority} disabled={saving} onChange={event=>void update(selected,{priority:event.target.value as ApiTask["priority"]})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><div className="life-detail-meta"><span>Due date</span><strong>{selected.dueAt?new Date(selected.dueAt).toLocaleString():"Not set"}</strong><span>Created</span><strong>{new Date(selected.createdAt).toLocaleDateString()}</strong></div><Link className="life-primary-link" href="/focus">Start a focus session</Link><button className="life-secondary-button" onClick={()=>setSelected(null)}>Close details</button></aside></div>}
  </main>;
}
