"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Archive, CalendarDays, CheckCircle2, Circle, FileText, FolderKanban, LoaderCircle, Pencil, Plus, Target } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";

type Workspace = {
  project: { id: string; name: string; description: string | null; status: string; dueDate: string | null; goalId?: string | null; lifeAreaId?: string | null };
  tasks: Array<{ id: string; title: string; status: string; priority: string; dueAt: string | null; description: string | null; parentTaskId?: string | null }>;
  events: Array<{ id: string; title: string; startsAt: string; endsAt: string | null; allDay: boolean }>;
  notes: Array<{ id: string; title: string; icon: string | null; updatedAt: string }>;
  activity: Array<{ id: string; summary: string; createdAt: string }>;
  dependencies: Array<{ id: string; taskId: string; dependsOnTaskId: string }>;
  goal: { id: string; title: string; status: string } | null;
  lifeArea: { id: string; name: string; color: string } | null;
  progress: { completed: number; total: number; percentage: number };
};

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const { data: session, isPending } = authClient.useSession();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dependencyTaskId, setDependencyTaskId] = useState("");
  const [dependsOnTaskId, setDependsOnTaskId] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDueDate, setProjectDueDate] = useState("");
  const [projectStatus, setProjectStatus] = useState("active");
  const [taskDraft, setTaskDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const result = await apiRequest<{ data: Workspace }>("/workspace/projects/" + params.id);
      setWorkspace(result.data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load this project.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (isPending) return;
    if (session?.user) void load();
    else setLoading(false);
  }, [isPending, session?.user, load]);

  async function toggleTask(task: Workspace["tasks"][number]) {
    try {
      await apiRequest("/tasks/" + task.id, {
        method: "PATCH",
        body: JSON.stringify({ status: task.status === "done" ? "todo" : "done" })
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't update the task.");
    }
  }

  function openProjectEditor() {
    if (!workspace) return;
    setProjectName(workspace.project.name);
    setProjectDescription(workspace.project.description || "");
    setProjectDueDate(workspace.project.dueDate || "");
    setProjectStatus(workspace.project.status);
    setEditOpen(true);
  }

  async function saveProject(event: FormEvent) {
    event.preventDefault();
    if (!workspace || !projectName.trim()) return;
    setSaving(true);
    try {
      await apiRequest("/projects/" + workspace.project.id, {
        method: "PATCH",
        body: JSON.stringify({ name: projectName.trim(), description: projectDescription.trim() || null, dueDate: projectDueDate || null, status: projectStatus })
      });
      setEditOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't update this project.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchiveProject() {
    if (!workspace) return;
    const status = workspace.project.status === "archived" ? "active" : "archived";
    try {
      await apiRequest("/projects/" + workspace.project.id, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't update the project status.");
    }
  }

  async function createProjectTask(event: FormEvent) {
    event.preventDefault();
    if (!workspace || !taskDraft.trim() || ["archived", "completed"].includes(workspace.project.status)) return;
    try {
      await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskDraft.trim(),
          projectId: workspace.project.id,
          lifeAreaId: workspace.lifeArea?.id ?? null,
          goalId: workspace.project.goalId ?? null,
          priority: "medium",
          status: "todo"
        })
      });
      setTaskDraft("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't add a task to this project.");
    }
  }

  async function addDependency(event: FormEvent) {
    event.preventDefault();
    if (!dependencyTaskId || !dependsOnTaskId) return;
    try {
      await apiRequest("/tasks/" + dependencyTaskId + "/dependencies", {
        method: "POST",
        body: JSON.stringify({ dependsOnTaskId })
      });
      setDependsOnTaskId("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't add that dependency.");
    }
  }

  if (isPending || loading) return <main className="project-workspace-loading"><LoaderCircle className="spin" size={20}/>Loading project…</main>;
  if (!session?.user) return <main className="project-workspace-loading">Please <Link href="/">sign in</Link> to continue.</main>;
  if (!workspace) return <main className="project-workspace-loading"><p>{error || "Project not found."}</p><Link href="/">Back to Sonder</Link></main>;

  const { project, tasks, events, notes, activity, dependencies, goal, lifeArea, progress } = workspace;
  return <main className="project-workspace">
    <header className="project-workspace-topbar"><Link href="/"><ArrowLeft size={16}/> Back to Sonder</Link><div className="project-topbar-actions"><span>PROJECT WORKSPACE</span><button onClick={openProjectEditor}><Pencil size={13}/> Edit</button><button onClick={() => void toggleArchiveProject()}><Archive size={13}/>{workspace.project.status === "archived" ? "Restore" : "Archive"}</button></div></header>
    <div className="project-workspace-content">
      {error && <div className="project-workspace-error" role="alert">{error}</div>}
      <div className="project-workspace-eyebrow"><FolderKanban size={14}/>{lifeArea?.name || "Project"}{goal && <><span>·</span><Target size={13}/>{goal.title}</>}</div>
      <div className="project-workspace-heading"><div><h1>{project.name}</h1><p>{project.description || "Everything connected to this project, in one place."}</p></div><span className={"project-status-pill status-" + project.status}>{project.status.replace("_", " ")}</span></div>
      {progress.total > 0 ? <section className="project-progress-panel">
        <div className="project-progress-copy"><div><span>PROJECT PROGRESS</span><strong>{progress.percentage}%</strong></div><p>{progress.completed} of {progress.total} tasks completed{project.dueDate ? " · Due " + new Date(project.dueDate + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</p></div>
        <div className="project-progress-track"><i style={{ width: progress.percentage + "%" }}/></div>
      </section> : <section className="project-progress-panel project-progress-empty"><div><span>READY WHEN YOU ARE</span><strong>This project is waiting for its first step.</strong><p>Add a task below to turn the idea into something you can move forward.</p></div></section>}
      <div className="project-workspace-grid">
        <section className="project-workspace-panel project-workspace-tasks">
          <div className="project-workspace-panel-heading"><div><span>MAKE PROGRESS</span><h2>Tasks <small>{tasks.length}</small></h2></div><span className="project-panel-hint">Small next steps add up</span></div><form className="project-quick-task" onSubmit={createProjectTask}><input value={taskDraft} onChange={event => setTaskDraft(event.target.value)} placeholder={["archived", "completed"].includes(project.status) ? "Restore this project to add tasks…" : "Add the next step…"} aria-label="New project task"/><button disabled={!taskDraft.trim() || ["archived", "completed"].includes(project.status)}><Plus size={14}/> Add task</button></form>
          {tasks.length ? tasks.map(task => <div className={"project-task-row " + (task.status === "done" ? "is-done" : "")} style={{paddingLeft:task.parentTaskId?22:0}} key={task.id}>
            <button onClick={() => void toggleTask(task)} aria-label="Toggle task">{task.status === "done" ? <CheckCircle2 size={17}/> : <Circle size={17}/>}</button>
            <div><strong>{task.title}</strong><span>{task.priority}{task.dueAt ? " · Due " + new Date(task.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</span>{dependencies.filter(item=>item.taskId===task.id).map(item=><small key={item.id}>Blocked by: {tasks.find(other=>other.id===item.dependsOnTaskId)?.title||"another task"}</small>)}</div>
          </div>) : <p className="project-workspace-empty">No tasks linked to this project yet.</p>}
        </section>
          {tasks.length > 1 && <form className="dependency-form" onSubmit={addDependency}><span>LINK TASK DEPENDENCIES</span><div><select required value={dependencyTaskId} onChange={event=>setDependencyTaskId(event.target.value)}><option value="">Task that is waiting</option>{tasks.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</select><select required value={dependsOnTaskId} onChange={event=>setDependsOnTaskId(event.target.value)}><option value="">Blocked by task</option>{tasks.filter(task=>task.id!==dependencyTaskId).map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</select><button disabled={!dependencyTaskId||!dependsOnTaskId}>Add dependency</button></div></form>}
        <section className="project-workspace-panel">
          <div className="project-workspace-panel-heading"><div><span>KEEP THE CONTEXT</span><h2>Notes <small>{notes.length}</small></h2></div><Link href="/notes">Open notes <ArrowLeft size={13}/></Link></div>
          {notes.length ? notes.map(note => <Link className="project-resource-row" href="/notes" key={note.id}><FileText size={16}/><span>{note.icon || "📝"} {note.title}</span><small>{new Date(note.updatedAt).toLocaleDateString()}</small></Link>) : <p className="project-workspace-empty">No notes connected yet. Link a note to this project from Notes.</p>}
        </section>
        <section className="project-workspace-panel">
          <div className="project-workspace-panel-heading"><div><span>PLAN AHEAD</span><h2>Calendar <small>{events.length}</small></h2></div><Link href="/">Open calendar <ArrowLeft size={13}/></Link></div>
          {events.length ? events.map(event => <div className="project-resource-row" key={event.id}><CalendarDays size={16}/><span>{event.title}</span><small>{new Date(event.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></div>) : <p className="project-workspace-empty">No calendar events linked to this project yet.</p>}
        </section>
        <section className="project-workspace-panel">
          <div className="project-workspace-panel-heading"><div><span>RECENT CHANGES</span><h2>Activity</h2></div></div>
          {activity.length ? activity.map(item => <div className="project-activity-row" key={item.id}><span/><div><p>{item.summary}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></div>) : <p className="project-workspace-empty">Project activity will appear here as you work.</p>}
        </section>
      </div>
    </div>
    {editOpen && <div className="project-edit-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setEditOpen(false); }}>
      <form className="project-edit-modal" onSubmit={saveProject}>
        <div className="project-edit-heading"><div><span>PROJECT DETAILS</span><h2>Edit project</h2></div><button type="button" onClick={() => setEditOpen(false)} aria-label="Close">×</button></div>
        <label>Project name<input required autoFocus value={projectName} onChange={event => setProjectName(event.target.value)}/></label>
        <label>Description<textarea rows={3} value={projectDescription} onChange={event => setProjectDescription(event.target.value)} placeholder="What is this project about?"/></label>
        <div className="project-edit-fields"><label>Target date<input type="date" value={projectDueDate} onChange={event => setProjectDueDate(event.target.value)}/></label><label>Status<select value={projectStatus} onChange={event => setProjectStatus(event.target.value)}><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label></div>
        <div className="project-edit-actions"><button type="button" onClick={() => setEditOpen(false)}>Cancel</button><button type="submit" disabled={saving || !projectName.trim()}>{saving ? "Saving…" : "Save changes"}</button></div>
      </form>
    </div>}
  </main>;
}
