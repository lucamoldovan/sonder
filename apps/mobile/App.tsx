import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import type { CalendarEventRecord, GoalRecord, HabitEntryRecord, HabitRecord, InboxItemRecord, LifeAreaRecord, NoteRecord, ProjectRecord, TaskRecord } from "@sonder/contracts";
import { API_BASE_URL, apiRequest, authClient } from "./auth-client";

type Task = TaskRecord;
type TimeBlock = { id: string; taskId: string; startsAt: string; endsAt: string; note: string | null };
type Milestone = { id: string; goalId: string; title: string; description: string | null; targetDate: string | null; status: "pending" | "completed"; position: number; completedAt: string | null };
type NoteTemplate = { id: string; name: string; description: string | null; content: NoteRecord["content"] };
type Backlink = { id: string; title: string; updatedAt: string };
type InboxItem = InboxItemRecord;
type Tab = "today" | "tasks" | "inbox" | "habits" | "goals" | "calendar" | "projects" | "notes" | "areas" | "organize";
type OrganizeSection = "home" | "tasks" | "inbox" | "habits" | "goals" | "projects" | "areas";
type List<T> = { data: T };

const colors = {
  bg: "#0B0B0F", surface: "#15131C", surface2: "#1B1823",
  text: "#F3F0F7", muted: "#85818F", lavender: "#A78BFA",
  border: "rgba(255,255,255,0.09)", green: "#83C9A1"
};

export default function App() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [habits, setHabits] = useState<HabitRecord[]>([]);
  const [habitEntries, setHabitEntries] = useState<HabitEntryRecord[]>([]);
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [calendarRangeEvents, setCalendarRangeEvents] = useState<CalendarEventRecord[]>([]);
  const [eventDraftTitle, setEventDraftTitle] = useState("");
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [lifeAreas, setLifeAreas] = useState<LifeAreaRecord[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({});
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>([]);
  const [noteBacklinks, setNoteBacklinks] = useState<Record<string, Backlink[]>>({});
  const [scheduleDate, setScheduleDate] = useState(() => { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-"); });
  const [scheduleStart, setScheduleStart] = useState("09:00");
  const [scheduleEnd, setScheduleEnd] = useState("10:00");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteEditingId, setNoteEditingId] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [tab, setTab] = useState<Tab>("today");
  const [taskFilter, setTaskFilter] = useState<"open" | "completed" | "all">("open");
  const [taskDraft, setTaskDraft] = useState("");
  const [taskEditId, setTaskEditId] = useState<string | null>(null);
  const [taskEditTitle, setTaskEditTitle] = useState("");
  const [taskEditDescription, setTaskEditDescription] = useState("");
  const [taskEditPriority, setTaskEditPriority] = useState<Task["priority"]>("medium");
  const [taskEditDue, setTaskEditDue] = useState("");
  const [organizeSection, setOrganizeSection] = useState<OrganizeSection>("home");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectTaskDraft, setProjectTaskDraft] = useState("");
  const [projectDraft, setProjectDraft] = useState("");
  const [goalDraftTitle, setGoalDraftTitle] = useState("");
  const [goalEditingId, setGoalEditingId] = useState<string | null>(null);
  const [goalEditTitle, setGoalEditTitle] = useState("");
  const [goalEditDescription, setGoalEditDescription] = useState("");
  const [goalEditDate, setGoalEditDate] = useState("");
  const [goalEditArea, setGoalEditArea] = useState("");
  const [habitDraftName, setHabitDraftName] = useState("");
  const [habitDraftFrequency, setHabitDraftFrequency] = useState<"daily" | "weekdays" | "weekly">("daily");
  const [lifeAreaDraft, setLifeAreaDraft] = useState("");
  const [lifeAreaEditId, setLifeAreaEditId] = useState<string | null>(null);
  const [lifeAreaEditName, setLifeAreaEditName] = useState("");
  const [lifeAreaEditColor, setLifeAreaEditColor] = useState("#A78BFA");
  const [capture, setCapture] = useState("");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{id:string;title:string;subtitle:string|string[]|null;type:string;href:string}[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [result, noteResult, blockResult, templateResult] = await Promise.all([apiRequest<List<{
        tasks: Task[];
        inbox: InboxItem[];
        projects: ProjectRecord[];
        goals: GoalRecord[];
        habits: HabitRecord[];
        habitEntries: HabitEntryRecord[];
        events: CalendarEventRecord[];
        lifeAreas: LifeAreaRecord[];
      }>>("/workspace/dashboard"), apiRequest<List<NoteRecord[]>>("/notes"), apiRequest<List<TimeBlock[]>>("/time-blocks"), apiRequest<List<NoteTemplate[]>>("/note-templates")]);
      setTasks(result.data.tasks);
      setInbox(result.data.inbox);
      setProjects(result.data.projects);
      setGoals(result.data.goals);
      setHabits(result.data.habits);
      setHabitEntries(result.data.habitEntries);
      setEvents(result.data.events);
      setLifeAreas(result.data.lifeAreas);
      setNotes(noteResult.data);
      setTimeBlocks(blockResult.data);
      setNoteTemplates(templateResult.data);
      const milestoneResults = await Promise.all(result.data.goals.map(goal => apiRequest<List<Milestone[]>>("/goals/" + goal.id + "/milestones")));
      setMilestones(Object.fromEntries(result.data.goals.map((goal, index) => [goal.id, milestoneResults[index].data])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load your data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setTasks([]);
      setInbox([]);
      setProjects([]);
      setGoals([]);
      setHabits([]);
      setHabitEntries([]);
      setEvents([]);
      setCalendarRangeEvents([]);
      setNotes([]);
      setLifeAreas([]);
      setTimeBlocks([]);
      setMilestones({});
      setNoteTemplates([]);
      setNoteBacklinks({});
      return;
    }
    void loadData();
  }, [session?.user?.id, loadData]);

  useEffect(() => {
    if (tab !== "calendar" || !scheduleDate) return;
    let active = true;
    const from = new Date(scheduleDate + "T00:00:00");
    const to = new Date(scheduleDate + "T23:59:59.999");
    void apiRequest<List<CalendarEventRecord[]>>("/calendar?from=" + encodeURIComponent(from.toISOString()) + "&to=" + encodeURIComponent(to.toISOString()))
      .then(result => { if (active) setCalendarRangeEvents(result.data); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Couldn't load this day."); });
    return () => { active = false; };
  }, [tab, scheduleDate]);

  async function submitAuth() {
    setAuthBusy(true);
    setError("");
    try {
      const result = mode === "signup"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) throw new Error(result.error.message || "Authentication failed.");
      await refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signInWithGoogle() {
    setAuthBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/"
      });
      if (result.error) throw new Error(result.error.message || "Google sign-in failed.");
      await refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function runMobileSearch() {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const result = await apiRequest<List<{id:string;title:string;subtitle:string|string[]|null;type:string;href:string}[]>>("/workspace/search?q=" + encodeURIComponent(searchQuery.trim()));
      setSearchResults(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't search Sonder.");
    } finally {
      setSearchLoading(false);
    }
  }

  function openSearchResult(result: {id:string;type:string}) {
    setSearchOpen(false);
    if (result.type === "project") { setSelectedProjectId(result.id); openOrganizeSection("projects"); }
    else if (result.type === "task") { setTaskFilter("all"); openOrganizeSection("tasks"); }
    else if (result.type === "goal") openOrganizeSection("goals");
    else if (result.type === "habit") openOrganizeSection("habits");
    else if (result.type === "event") setTab("calendar");
    else if (result.type === "note") setTab("notes");
  }

  async function addCapture() {
    if (!capture.trim()) return;
    try {
      const result = await apiRequest<List<InboxItem>>("/inbox", {
        method: "POST",
        body: JSON.stringify({ title: capture.trim(), type: "task" })
      });
      setInbox(current => [result.data, ...current]);
      setCapture("");
      setCaptureOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save that item.");
    }
  }


  async function convertInboxItem(item: InboxItem) {
    try {
      const result = await apiRequest<List<{ inboxItem: InboxItem; task: Task }>>(
        `/inbox/${item.id}/convert-to-task`, { method: "POST" }
      );
      setInbox(current => current.filter(entry => entry.id !== item.id));
      setTasks(current => [result.data.task, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't convert the inbox item.");
    }
  }

  async function checkInHabit(habit: HabitRecord) {
    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    const existing = habitEntries.find(entry => entry.habitId === habit.id && entry.entryDate === date);
    try {
      if (existing) {
        await apiRequest("/habits/" + habit.id + "/check-in/" + date, { method: "DELETE" });
        setHabitEntries(current => current.filter(entry => entry.id !== existing.id));
      } else {
        const result = await apiRequest<List<HabitEntryRecord>>("/habits/" + habit.id + "/check-in", {
          method: "POST", body: JSON.stringify({ date })
        });
        setHabitEntries(current => [result.data, ...current]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't update habit.");
    }
  }

  async function convertInboxToNote(item: InboxItem) {
    try {
      await apiRequest("/inbox/" + item.id + "/convert-to-note", { method: "POST" });
      setInbox(current => current.filter(entry => entry.id !== item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create note.");
    }
  }

  async function scheduleTask(taskId: string) {
    try {
      const result = await apiRequest<List<TimeBlock>>("/time-blocks", {
        method: "POST",
        body: JSON.stringify({ taskId, startsAt: new Date(scheduleDate + "T" + scheduleStart).toISOString(), endsAt: new Date(scheduleDate + "T" + scheduleEnd).toISOString() })
      });
      setTimeBlocks(current => [...current, result.data].sort((a,b)=>a.startsAt.localeCompare(b.startsAt)));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't schedule that task."); }
  }

  async function toggleMilestone(goalId: string, milestone: Milestone) {
    try {
      const result = await apiRequest<List<Milestone>>("/milestones/" + milestone.id, { method: "PATCH", body: JSON.stringify({ status: milestone.status === "completed" ? "pending" : "completed" }) });
      setMilestones(current => ({ ...current, [goalId]: (current[goalId] || []).map(item => item.id === milestone.id ? result.data : item) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't update milestone."); }
  }

  async function addMilestone(goalId: string) {
    const title = milestoneDrafts[goalId]?.trim();
    if (!title) return;
    try {
      const result = await apiRequest<List<Milestone>>("/goals/" + goalId + "/milestones", { method: "POST", body: JSON.stringify({ title, position: milestones[goalId]?.length || 0 }) });
      setMilestones(current => ({ ...current, [goalId]: [...(current[goalId] || []), result.data] }));
      setMilestoneDrafts(current => ({ ...current, [goalId]: "" }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't add milestone."); }
  }

  async function saveNoteTemplate() {
    if (!noteTitle.trim() || !noteBody.trim()) return;
    try {
      const result = await apiRequest<List<NoteTemplate>>("/note-templates", { method: "POST", body: JSON.stringify({ name: noteTitle.trim(), content: [{ id: String(Date.now()), type: "paragraph", text: noteBody.trim() }] }) });
      setNoteTemplates(current => [...current, result.data]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't save template."); }
  }

  async function loadNoteBacklinks(noteId: string) {
    try {
      const result = await apiRequest<List<Backlink[]>>("/notes/" + noteId + "/backlinks");
      setNoteBacklinks(current => ({ ...current, [noteId]: result.data }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't load backlinks."); }
  }

  function openNoteEditor(note: NoteRecord) {
    setNoteEditingId(note.id);
    setNoteTitle(note.title);
    setNoteBody(note.content.map(block => block.text).join("\n\n"));
  }

  async function createNote() {
    if (!noteTitle.trim()) return;
    try {
      const payload = {
        title: noteTitle.trim(),
        content: noteBody.trim() ? [{ id: String(Date.now()), type: "paragraph", text: noteBody.trim() }] : []
      };
      const result = await apiRequest<List<NoteRecord>>(noteEditingId ? "/notes/" + noteEditingId : "/notes", {
        method: noteEditingId ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
      setNotes(current => noteEditingId ? current.map(note => note.id === noteEditingId ? result.data : note) : [result.data, ...current]);
      setNoteTitle("");
      setNoteBody("");
      setNoteEditingId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save note.");
    }
  }

  async function archiveInboxItem(item: InboxItem) {
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

  async function createLifeArea() {
    if (!lifeAreaDraft.trim()) return;
    try {
      const result = await apiRequest<{data:LifeAreaRecord}>("/life-areas", {
        method:"POST",
        body:JSON.stringify({name:lifeAreaDraft.trim(),color:"#A78BFA",position:lifeAreas.length})
      });
      setLifeAreas(current=>[...current,result.data]);
      setLifeAreaDraft("");
    } catch(cause) { setError(cause instanceof Error?cause.message:"Couldn't create the life area."); }
  }

  function openLifeAreaEditor(area: LifeAreaRecord) {
    setLifeAreaEditId(area.id);
    setLifeAreaEditName(area.name);
    setLifeAreaEditColor(area.color);
  }

  async function saveLifeArea() {
    if (!lifeAreaEditId || !lifeAreaEditName.trim()) return;
    try {
      const result = await apiRequest<{data:LifeAreaRecord}>(`/life-areas/${lifeAreaEditId}`, {
        method:"PATCH",
        body:JSON.stringify({name:lifeAreaEditName.trim(),color:lifeAreaEditColor})
      });
      setLifeAreas(current=>current.map(area=>area.id===lifeAreaEditId?result.data:area));
      setLifeAreaEditId(null);
    } catch(cause) { setError(cause instanceof Error?cause.message:"Couldn't update the life area."); }
  }

  async function createHabit() {
    if (!habitDraftName.trim()) return;
    try {
      const targetPerWeek = habitDraftFrequency === "daily" ? 7 : habitDraftFrequency === "weekdays" ? 5 : 1;
      const result = await apiRequest<{ data: HabitRecord }>("/habits", {
        method: "POST",
        body: JSON.stringify({ name: habitDraftName.trim(), frequency: habitDraftFrequency, targetPerWeek })
      });
      setHabits(current => [...current, result.data]);
      setHabitDraftName("");
      setHabitDraftFrequency("daily");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create the habit.");
    }
  }

  async function archiveHabit(habit: HabitRecord) {
    try {
      await apiRequest(`/habits/${habit.id}`, { method: "PATCH", body: JSON.stringify({ archived: true }) });
      setHabits(current => current.map(item => item.id === habit.id ? { ...item, archivedAt: new Date().toISOString() } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't archive the habit.");
    }
  }

  async function createGoal() {
    if (!goalDraftTitle.trim()) return;
    try {
      const result = await apiRequest<{ data: GoalRecord }>("/goals", {
        method: "POST",
        body: JSON.stringify({ title: goalDraftTitle.trim(), status: "active" })
      });
      setGoals(current => [...current, result.data]);
      setGoalDraftTitle("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create the goal.");
    }
  }

  function openGoalEditor(goal: GoalRecord) {
    setGoalEditingId(goal.id);
    setGoalEditTitle(goal.title);
    setGoalEditDescription(goal.description || "");
    setGoalEditDate(goal.targetDate || "");
    setGoalEditArea(goal.lifeAreaId || "");
  }

  async function saveGoalEditor() {
    if (!goalEditingId || !goalEditTitle.trim()) return;
    try {
      const result = await apiRequest<{ data: GoalRecord }>(`/goals/${goalEditingId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: goalEditTitle.trim(), description: goalEditDescription.trim() || null, targetDate: goalEditDate || null, lifeAreaId: goalEditArea || null })
      });
      setGoals(current => current.map(goal => goal.id === goalEditingId ? result.data : goal));
      setGoalEditingId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't update the goal.");
    }
  }

  async function createProject() {
    if (!projectDraft.trim()) return;
    try {
      const result = await apiRequest<{ data: ProjectRecord }>("/projects", {
        method: "POST",
        body: JSON.stringify({ name: projectDraft.trim(), status: "active" })
      });
      setProjects(current => [...current, result.data].sort((a,b) => a.name.localeCompare(b.name)));
      setProjectDraft("");
      setSelectedProjectId(result.data.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create the project.");
    }
  }

  async function createProjectTask() {
    const project = projects.find(item => item.id === selectedProjectId);
    if (!project || !projectTaskDraft.trim() || project.status === "archived" || project.status === "completed") return;
    try {
      const result = await apiRequest<{ data: Task }>("/tasks", {
        method: "POST",
        body: JSON.stringify({ title: projectTaskDraft.trim(), projectId: project.id, goalId: project.goalId || null, lifeAreaId: project.lifeAreaId || null, status: "todo", priority: "medium" })
      });
      setTasks(current => [...current, result.data]);
      setProjectTaskDraft("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't add a task to this project.");
    }
  }

  async function createQuickTask() {
    if (!taskDraft.trim()) return;
    try {
      const result = await apiRequest<{ data: Task }>("/tasks", {
        method: "POST",
        body: JSON.stringify({ title: taskDraft.trim(), status: "todo", priority: "medium" })
      });
      setTasks(current => [result.data, ...current]);
      setTaskDraft("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create the task.");
    }
  }

  function openTaskEditor(task: Task) {
    setTaskEditId(task.id);
    setTaskEditTitle(task.title);
    setTaskEditDescription(task.description || "");
    setTaskEditPriority(task.priority);
    setTaskEditDue(task.dueAt ? localDateKey(task.dueAt) : "");
  }

  async function saveTaskEditor() {
    if (!taskEditId || !taskEditTitle.trim()) return;
    try {
      const result = await apiRequest<{ data: Task }>(`/tasks/${taskEditId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: taskEditTitle.trim(),
          description: taskEditDescription.trim() || null,
          priority: taskEditPriority,
          dueAt: taskEditDue ? new Date(taskEditDue + "T12:00:00").toISOString() : null
        })
      });
      setTasks(current => current.map(task => task.id === taskEditId ? result.data : task));
      setTaskEditId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't update the task.");
    }
  }

  async function toggleTask(task: Task) {
    try {
      const result = await apiRequest<{ data: Task; nextOccurrence?: Task | null }>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: task.status === "done" ? "todo" : "done" })
      });
      setTasks(current => [...current.map(item => item.id === task.id ? result.data : item), ...(result.nextOccurrence ? [result.nextOccurrence] : [])]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't update task.");
    }
  }

  if (isPending) {
    return <SafeAreaView style={styles.center}><StatusBar barStyle="light-content" /><ActivityIndicator color={colors.lavender} /><Text style={styles.muted}>Opening Sonder…</Text></SafeAreaView>;
  }

  if (!session?.user) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <KeyboardAvoidingView style={styles.authWrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.logoMark}><Text style={styles.logoMarkText}>s.</Text></View>
          <Text style={styles.logo}>sonder</Text>
          <Text style={styles.tagline}>Your life, in perspective.</Text>
          <View style={styles.authCard}>
            <Text style={styles.kicker}>YOUR SPACE, YOUR PACE</Text>
            <Text style={styles.heading}>{mode === "signup" ? "Create your space." : "Welcome back."}</Text>
            <Text style={styles.muted}>A calm place for everything you&apos;re carrying.</Text>
            {mode === "signup" && <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={colors.muted} value={name} onChangeText={setName} autoComplete="name" />}
            <TextInput style={styles.input} placeholder="Email address" placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <TextInput style={styles.input} placeholder="Password (8+ characters)" placeholderTextColor={colors.muted} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={[styles.primaryButton, authBusy && styles.disabled]} disabled={authBusy} onPress={() => void submitAuth()}>
              {authBusy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.primaryText}>{mode === "signup" ? "Create free account" : "Sign in"}</Text>}
            </TouchableOpacity>
            {process.env.EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" && <TouchableOpacity style={styles.googleButton} disabled={authBusy} onPress={() => void signInWithGoogle()}><Text style={styles.googleText}>Continue with Google</Text></TouchableOpacity>}
            <TouchableOpacity onPress={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}>
              <Text style={styles.switchText}>{mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footnote}>Free to use · Your data belongs to you</Text>
          <Text style={styles.apiHint}>API: {API_BASE_URL}</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const activeTasks = tasks.filter(task => !["done", "cancelled"].includes(task.status));
  const dueToday = activeTasks.filter(task => task.dueAt && new Date(task.dueAt).toDateString() === new Date().toDateString());
  const todayDate = new Date();
  const todayKey = [todayDate.getFullYear(), String(todayDate.getMonth() + 1).padStart(2, "0"), String(todayDate.getDate()).padStart(2, "0")].join("-");
  const localDateKey = (value: string) => {
    const date = new Date(value);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  };
  const weekStartDate = new Date(todayDate);
  weekStartDate.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7));
  const weekStartKey = [weekStartDate.getFullYear(), String(weekStartDate.getMonth() + 1).padStart(2, "0"), String(weekStartDate.getDate()).padStart(2, "0")].join("-");
  const selectedCalendarDate = new Date(scheduleDate + "T12:00:00");
  const selectedCalendarEvents = calendarRangeEvents.filter(event => localDateKey(event.startsAt) === scheduleDate).sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const selectedCalendarBlocks = timeBlocks.filter(block => localDateKey(block.startsAt) === scheduleDate).sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const selectedCalendarTasks = tasks.filter(task => task.dueAt && localDateKey(task.dueAt) === scheduleDate && task.status !== "done" && task.status !== "cancelled");
  const moveCalendarDay = (direction: number) => {
    const next = new Date(scheduleDate + "T12:00:00");
    next.setDate(next.getDate() + direction);
    setScheduleDate([next.getFullYear(),String(next.getMonth()+1).padStart(2,"0"),String(next.getDate()).padStart(2,"0")].join("-"));
  };
  const createCalendarEvent = async () => {
    if (!eventDraftTitle.trim()) return;
    try {
      const startsAt = new Date(scheduleDate + "T" + scheduleStart + ":00").toISOString();
      const endsAt = new Date(scheduleDate + "T" + scheduleEnd + ":00").toISOString();
      if (new Date(endsAt) <= new Date(startsAt)) { setError("The event end must be after its start."); return; }
      const result = await apiRequest<{data:CalendarEventRecord}>("/calendar", {
        method:"POST",
        body:JSON.stringify({title:eventDraftTitle.trim(),startsAt,endsAt,allDay:false})
      });
      setEvents(current=>[...current.filter(item=>item.id!==result.data.id),result.data]);
      setCalendarRangeEvents(current=>[...current.filter(item=>item.id!==result.data.id),result.data]);
      setEventDraftTitle("");
    } catch(cause) { setError(cause instanceof Error?cause.message:"Couldn't create the event."); }
  };
  const todayEvents = events.filter(event => localDateKey(event.startsAt) === todayKey).sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const todayBlocks = timeBlocks.filter(block => localDateKey(block.startsAt) === todayKey).sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const todayAgendaItems = [
    ...todayEvents.map(event => ({ id: event.id, kind: "event" as const, startsAt: event.startsAt, endsAt: event.endsAt, title: event.title, event })),
    ...todayBlocks.map(block => ({ id: block.id, kind: "block" as const, startsAt: block.startsAt, endsAt: block.endsAt, title: tasks.find(task => task.id === block.taskId)?.title || "Scheduled work", block }))
  ].sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const nextActionTasks = activeTasks.filter(task => task.status === "in_progress" || (task.dueAt && localDateKey(task.dueAt) <= todayKey) || task.priority === "urgent" || task.priority === "high")
    .sort((a,b) => (a.dueAt || "9999").localeCompare(b.dueAt || "9999") || ["urgent","high","medium","low"].indexOf(a.priority) - ["urgent","high","medium","low"].indexOf(b.priority)).slice(0,5);
  const habitsDueToday = habits.filter(habit => {
    if (habit.archivedAt) return false;
    if (habit.frequency === "daily") return true;
    if (habit.frequency === "weekdays") return todayDate.getDay() !== 0 && todayDate.getDay() !== 6;
    const checkedInToday = habitEntries.some(entry => entry.habitId === habit.id && entry.entryDate === todayKey);
    return checkedInToday || habitEntries.filter(entry => entry.habitId === habit.id && entry.entryDate >= weekStartKey).length < habit.targetPerWeek;
  });

  const openOrganizeSection = (section: Exclude<OrganizeSection, "home">) => {
    setOrganizeSection(section);
    setTab("organize");
  };

  const renderTask = (task: Task) => (
    <View key={task.id} style={styles.taskRow}>
      <TouchableOpacity onPress={() => void toggleTask(task)}><View style={[styles.taskCircle, task.status === "done" && styles.taskCircleDone]} /></TouchableOpacity>
      <View style={styles.taskCopy}><Text style={[styles.taskTitle, task.status === "done" && styles.taskDone]}>{task.title}</Text><Text style={styles.taskMeta}>{task.priority} priority{task.dueAt ? " · " + new Date(task.dueAt).toLocaleDateString() : ""}{task.recurrenceFrequency ? " · Repeats " + task.recurrenceFrequency : ""}</Text></View>
      <TouchableOpacity onPress={() => openTaskEditor(task)}><Text style={styles.link}>Edit</Text></TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView style={{flex:1}} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.kicker}>YOUR WORKSPACE</Text><Text style={styles.heading}>{tab === "organize" ? (organizeSection === "home" ? "Organize." : organizeSection[0].toUpperCase()+organizeSection.slice(1)+".") : tab === "today" ? "Today." : tab[0].toUpperCase()+tab.slice(1)+"."}</Text><Text style={styles.muted}>A little clarity goes a long way.</Text></View>
          <View style={styles.mobileHeaderActions}><TouchableOpacity style={styles.mobileCaptureButton} onPress={() => setSearchOpen(true)}><Text style={styles.mobileCaptureButtonText}>Search</Text></TouchableOpacity><TouchableOpacity style={styles.mobileCaptureButton} onPress={() => setCaptureOpen(true)}><Text style={styles.mobileCaptureButtonText}>Capture</Text></TouchableOpacity><TouchableOpacity style={styles.signOut} onPress={() => void authClient.signOut()}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity></View>
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {tab === "today" && <>
          <View style={styles.mobileTodayIntro}>
            <Text style={styles.mobileTodayDate}>{todayDate.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</Text>
            <Text style={styles.mobileTodayTitle}>Hey, {session.user.name?.split(" ")[0] || "there"}.</Text>
            <Text style={styles.muted}>Here’s what matters today. Take it one thing at a time.</Text>
          </View>
          <View style={styles.capture}>
            <TextInput style={styles.captureInput} placeholder="Get it out of your head…" placeholderTextColor={colors.muted} value={capture} onChangeText={setCapture} onSubmitEditing={() => void addCapture()} returnKeyType="done" />
            <TouchableOpacity style={styles.captureButton} onPress={() => void addCapture()}><Text style={styles.captureButtonText}>Capture</Text></TouchableOpacity>
          </View>
          <Text style={styles.mobileDayContext}>{todayAgendaItems.length} scheduled · {dueToday.length} due today{activeTasks.some(task=>task.dueAt&&localDateKey(task.dueAt)<todayKey)?" · Some overdue":""}</Text>

          <View style={styles.mobileTodaySection}>
            <View style={styles.mobileTodaySectionHeader}><Text style={styles.mobileTodaySectionTitle}>Today’s agenda</Text><TouchableOpacity onPress={()=>setTab("calendar")}><Text style={styles.link}>Calendar</Text></TouchableOpacity></View>
            {todayAgendaItems.length === 0
              ? <View style={styles.mobileTodayEmpty}><Text style={styles.mobileTodayEmptyTitle}>Nothing scheduled today.</Text><Text style={styles.muted}>That’s room you can use—or leave free.</Text></View>
              : todayAgendaItems.map(item=><View key={item.kind+":"+item.id} style={styles.mobileTodayAgendaRow}>
                <Text style={styles.mobileTodayTime}>{item.kind==="event"&&item.event.allDay?"All day":new Date(item.startsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</Text>
                <View style={[styles.mobileTodayDot,{backgroundColor:item.kind==="event"?"#79B7D7":colors.lavender}]}/>
                <View style={styles.taskCopy}><Text style={styles.taskTitle}>{item.title}</Text><Text style={styles.taskMeta}>{item.kind==="block"?new Date(item.endsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})+" · Work block":item.event.location||"Calendar event"}</Text></View>
              </View>)}
          </View>

          <View style={styles.mobileTodaySection}>
            <View style={styles.mobileTodaySectionHeader}><Text style={styles.mobileTodaySectionTitle}>Next actions</Text><TouchableOpacity onPress={()=>openOrganizeSection("tasks")}><Text style={styles.link}>All tasks</Text></TouchableOpacity></View>
            {loading ? <ActivityIndicator color={colors.lavender}/> : nextActionTasks.length ? nextActionTasks.map(renderTask) : <View style={styles.mobileTodayEmpty}><Text style={styles.mobileTodayEmptyTitle}>Nothing urgent asking for attention.</Text><Text style={styles.muted}>Choose something meaningful, or enjoy the breathing room.</Text></View>}
          </View>

          {habitsDueToday.length>0&&<View style={styles.mobileTodaySection}>
            <View style={styles.mobileTodaySectionHeader}><Text style={styles.mobileTodaySectionTitle}>Small things, repeated</Text><TouchableOpacity onPress={()=>openOrganizeSection("habits")}><Text style={styles.link}>All habits</Text></TouchableOpacity></View>
            {habitsDueToday.slice(0,5).map(habit=>{const checked=habitEntries.some(entry=>entry.habitId===habit.id&&entry.entryDate===todayKey);return <TouchableOpacity key={habit.id} style={styles.mobileTodayHabitRow} onPress={()=>void checkInHabit(habit)}><View style={[styles.taskCircle,checked&&styles.taskCircleDone]}/><View style={styles.taskCopy}><Text style={[styles.taskTitle,checked&&styles.taskDone]}>{habit.name}</Text><Text style={styles.taskMeta}>{checked?"Checked in today":"Optional check-in"}</Text></View></TouchableOpacity>;})}
          </View>}

          {todayAgendaItems.length>=5&&<View style={styles.mobileTodayNote}><Text style={styles.mobileTodayNoteTitle}>A full day ahead.</Text><Text style={styles.muted}>You have several scheduled commitments. Leave a little space between them where you can.</Text></View>}

          {goals.filter(goal=>goal.status==="active").length>0&&<View style={styles.mobileTodaySection}>
            <View style={styles.mobileTodaySectionHeader}><Text style={styles.mobileTodaySectionTitle}>Goals in progress</Text><TouchableOpacity onPress={()=>openOrganizeSection("goals")}><Text style={styles.link}>All goals</Text></TouchableOpacity></View>
            {goals.filter(goal=>goal.status==="active").slice(0,3).map(goal=><View key={goal.id} style={styles.mobileTodayAgendaRow}><View style={[styles.mobileTodayDot,{backgroundColor:colors.lavender}]}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{goal.title}</Text><Text style={styles.taskMeta}>{goal.targetDate?"Target · "+new Date(goal.targetDate+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"}):"Active goal"}</Text></View></View>)}
          </View>}

          <View style={styles.mobileTodaySection}>
            <View style={styles.mobileTodaySectionHeader}><Text style={styles.mobileTodaySectionTitle}>Coming up</Text><TouchableOpacity onPress={()=>setTab("calendar")}><Text style={styles.link}>Calendar</Text></TouchableOpacity></View>
            {events.filter(event=>new Date(event.startsAt)>new Date()&&localDateKey(event.startsAt)!==todayKey).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)).slice(0,3).map(event=><View key={event.id} style={styles.mobileTodayAgendaRow}><Text style={styles.mobileTodayTime}>{new Date(event.startsAt).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</Text><View style={[styles.mobileTodayDot,{backgroundColor:"#79B7D7"}]}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{event.title}</Text><Text style={styles.taskMeta}>{event.allDay?"All day":new Date(event.startsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</Text></View></View>)}
            {events.filter(event=>new Date(event.startsAt)>new Date()&&localDateKey(event.startsAt)!==todayKey).length===0&&<Text style={styles.muted}>Nothing else on the calendar yet.</Text>}
          </View>

          <TouchableOpacity style={styles.mobileTodayInbox} onPress={()=>openOrganizeSection("inbox")}><View style={styles.taskCopy}><Text style={styles.taskTitle}>{inbox.length} items to sort</Text><Text style={styles.taskMeta}>Capture now. Organize when you’re ready.</Text></View><Text style={styles.link}>Open inbox →</Text></TouchableOpacity>
        </>}
        {tab === "organize" && organizeSection === "home" && <>
          <View style={styles.mobileTodayIntro}><Text style={styles.mobileTodayTitle}>Organize.</Text><Text style={styles.muted}>Everything has a place. Nothing needs to live in isolation.</Text></View>
          {([
            ["inbox","Inbox","Capture now, organize later",inbox.length],
            ["tasks","Tasks","The next actions you can take",activeTasks.length],
            ["projects","Projects","Work that takes more than one step",projects.filter(project=>project.status==="active").length],
            ["goals","Goals","Longer-term direction and milestones",goals.filter(goal=>goal.status==="active").length],
            ["habits","Habits","Small practices you choose to repeat",habits.filter(habit=>!habit.archivedAt).length],
            ["areas","Life areas","Contexts that organize your life",lifeAreas.length]
          ] as const).map(([section,title,description,count])=><TouchableOpacity key={section} style={styles.mobileOrganizeRow} onPress={()=>openOrganizeSection(section)}><View style={styles.taskCopy}><Text style={styles.taskTitle}>{title}</Text><Text style={styles.taskMeta}>{description}</Text></View><Text style={styles.mobileOrganizeCount}>{count}</Text><Text style={styles.link}>›</Text></TouchableOpacity>)}
        </>}
        {tab === "organize" && organizeSection === "tasks" && <>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <View style={styles.projectTaskComposer}><TextInput style={styles.mobileInlineInput} value={taskDraft} onChangeText={setTaskDraft} placeholder="Add a next action…" placeholderTextColor={colors.muted} onSubmitEditing={() => void createQuickTask()}/><TouchableOpacity onPress={() => void createQuickTask()} disabled={!taskDraft.trim()}><Text style={styles.link}>Add</Text></TouchableOpacity></View>
          <View style={styles.mobileTaskFilters}>{(["open","completed","all"] as const).map(filter=><TouchableOpacity key={filter} style={[styles.mobileTaskFilter,taskFilter===filter&&styles.mobileTaskFilterActive]} onPress={()=>setTaskFilter(filter)}><Text style={[styles.mobileTaskFilterText,taskFilter===filter&&styles.mobileTaskFilterTextActive]}>{filter[0].toUpperCase()+filter.slice(1)}</Text><Text style={[styles.mobileTaskFilterCount,taskFilter===filter&&styles.mobileTaskFilterTextActive]}>{filter==="all"?tasks.length:filter==="completed"?tasks.filter(task=>task.status==="done").length:tasks.filter(task=>!["done","cancelled"].includes(task.status)).length}</Text></TouchableOpacity>)}</View>
          {tasks.filter(task=>taskFilter==="all"||(taskFilter==="completed"?task.status==="done":!["done","cancelled"].includes(task.status))).map(renderTask)}
        </>}
        {tab === "organize" && organizeSection === "inbox" && <><Text style={styles.sectionTitle}>Capture now · Organize later</Text><View style={styles.capture}><TextInput style={styles.captureInput} placeholder="Capture a thought…" placeholderTextColor={colors.muted} value={capture} onChangeText={setCapture} onSubmitEditing={() => void addCapture()} returnKeyType="done"/><TouchableOpacity style={styles.captureButton} onPress={() => void addCapture()}><Text style={styles.captureButtonText}>Add</Text></TouchableOpacity></View>{inbox.map(item=><View key={item.id} style={styles.inboxRow}><View style={styles.inboxCopy}><Text style={styles.taskTitle}>{item.title}</Text><Text style={styles.taskMeta}>{item.type} · {new Date(item.createdAt).toLocaleDateString()}</Text></View><View style={styles.inboxActions}><TouchableOpacity onPress={()=>void convertInboxItem(item)}><Text style={styles.link}>Task</Text></TouchableOpacity><TouchableOpacity onPress={()=>void convertInboxToNote(item)}><Text style={styles.link}>Note</Text></TouchableOpacity><TouchableOpacity onPress={()=>void archiveInboxItem(item)}><Text style={styles.archiveLink}>Archive</Text></TouchableOpacity></View></View>)}</>}
        {tab === "organize" && organizeSection === "habits" && <><Text style={styles.sectionTitle}>Your habits</Text><View style={styles.projectTaskComposer}><TextInput style={styles.mobileInlineInput} value={habitDraftName} onChangeText={setHabitDraftName} placeholder="Add a small practice…" placeholderTextColor={colors.muted} onSubmitEditing={() => void createHabit()}/><TouchableOpacity onPress={() => void createHabit()} disabled={!habitDraftName.trim()}><Text style={styles.link}>Create</Text></TouchableOpacity></View><View style={styles.mobileTaskPriorityRow}>{(["daily","weekdays","weekly"] as const).map(frequency=><TouchableOpacity key={frequency} style={[styles.mobileTaskPriority,habitDraftFrequency===frequency&&styles.mobileTaskPriorityActive]} onPress={()=>setHabitDraftFrequency(frequency)}><Text style={[styles.mobileTaskPriorityText,habitDraftFrequency===frequency&&styles.mobileTaskFilterTextActive]}>{frequency}</Text></TouchableOpacity>)}</View>{habits.filter(habit=>!habit.archivedAt).map(habit=>{const checked=habitEntries.some(entry=>entry.habitId===habit.id&&entry.entryDate===todayKey);const history=Array.from({length:28},(_,index)=>{const d=new Date();d.setDate(d.getDate()-(27-index));const key=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");return habitEntries.some(entry=>entry.habitId===habit.id&&entry.entryDate===key);});return <View key={habit.id} style={styles.mobileHabitRow}><TouchableOpacity style={[styles.taskCircle,checked&&styles.taskCircleDone]} onPress={()=>void checkInHabit(habit)}/><View style={styles.taskCopy}><Text style={[styles.taskTitle,checked&&styles.taskDone]}>{habit.name}</Text><Text style={styles.taskMeta}>{habit.frequency==="weekly"&&habit.targetPerWeek>1?habit.targetPerWeek+"× per week":habit.frequency} · {habitEntries.filter(entry=>entry.habitId===habit.id).length} check-ins</Text><View style={styles.mobileHeatmap}>{history.map((done,index)=><View key={index} style={[styles.mobileHeatCell,done&&styles.mobileHeatCellDone]}/>)}</View></View><TouchableOpacity onPress={()=>void archiveHabit(habit)}><Text style={styles.archiveLink}>Archive</Text></TouchableOpacity></View>;})}</>}
        {tab === "organize" && organizeSection === "goals" && <><Text style={styles.sectionTitle}>Your goals</Text><View style={styles.projectTaskComposer}><TextInput style={styles.mobileInlineInput} value={goalDraftTitle} onChangeText={setGoalDraftTitle} placeholder="Add a goal…" placeholderTextColor={colors.muted} onSubmitEditing={() => void createGoal()}/><TouchableOpacity onPress={() => void createGoal()} disabled={!goalDraftTitle.trim()}><Text style={styles.link}>Create</Text></TouchableOpacity></View>{goals.map(goal=>{const linked=tasks.filter(task=>task.goalId===goal.id);const done=linked.filter(task=>task.status==="done").length;const steps=milestones[goal.id]||[];const completed=steps.filter(step=>step.status==="completed").length;const percent=linked.length+steps.length?Math.round((done+completed)/(linked.length+steps.length)*100):0;return <View key={goal.id} style={styles.mobileGoal}><View style={styles.taskRow}><View style={styles.goalDot}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{goal.title}</Text><Text style={styles.taskMeta}>{linked.length+steps.length>0?percent+"% complete · "+done+"/"+linked.length+" tasks · "+completed+"/"+steps.length+" milestones":"No measurable progress yet"}</Text></View><TouchableOpacity onPress={() => openGoalEditor(goal)}><Text style={styles.link}>Edit</Text></TouchableOpacity></View>{steps.map(step=><TouchableOpacity key={step.id} style={styles.mobileMilestone} onPress={()=>void toggleMilestone(goal.id,step)}><View style={[styles.taskCircle,step.status==="completed"&&styles.taskCircleDone]}/><Text style={[styles.taskMeta,step.status==="completed"&&styles.taskDone]}>{step.title}</Text></TouchableOpacity>)}<View style={styles.mobileMilestoneComposer}><TextInput style={styles.mobileInlineInput} placeholder="Add a milestone…" placeholderTextColor={colors.muted} value={milestoneDrafts[goal.id]||""} onChangeText={value=>setMilestoneDrafts(current=>({...current,[goal.id]:value}))}/><TouchableOpacity onPress={()=>void addMilestone(goal.id)}><Text style={styles.link}>Add</Text></TouchableOpacity></View></View>;})}</>}
        {tab === "calendar" && <>
          <View style={styles.mobileCalendarHeading}><TouchableOpacity onPress={()=>moveCalendarDay(-1)}><Text style={styles.link}>‹</Text></TouchableOpacity><View style={styles.taskCopy}><Text style={styles.mobileCalendarDate}>{selectedCalendarDate.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</Text><TouchableOpacity onPress={()=>setScheduleDate(todayKey)}><Text style={styles.link}>Today</Text></TouchableOpacity></View><TouchableOpacity onPress={()=>moveCalendarDay(1)}><Text style={styles.link}>›</Text></TouchableOpacity></View>
          <TextInput style={styles.mobileInlineInput} value={scheduleDate} onChangeText={setScheduleDate} placeholder="Date · YYYY-MM-DD" placeholderTextColor={colors.muted}/>
          <Text style={styles.sectionTitle}>Your agenda</Text>
          {selectedCalendarEvents.map(event=><View key={event.id} style={styles.taskRow}><View style={styles.eventDot}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{event.title}</Text><Text style={styles.taskMeta}>{event.allDay?"All day":new Date(event.startsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})+(event.endsAt?" – "+new Date(event.endsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}):"")}</Text></View><TouchableOpacity onPress={async()=>{try{await apiRequest("/calendar/"+event.id,{method:"DELETE"});setCalendarRangeEvents(current=>current.filter(item=>item.id!==event.id));setEvents(current=>current.filter(item=>item.id!==event.id));}catch(cause){setError(cause instanceof Error?cause.message:"Couldn't delete the event.");}}}><Text style={styles.link}>Delete</Text></TouchableOpacity></View>)}
          {selectedCalendarBlocks.map(block=><View key={block.id} style={styles.taskRow}><View style={styles.goalDot}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{tasks.find(task=>task.id===block.taskId)?.title||"Scheduled task"}</Text><Text style={styles.taskMeta}>{new Date(block.startsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})} – {new Date(block.endsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</Text></View><TouchableOpacity onPress={async()=>{try{await apiRequest("/time-blocks/"+block.id,{method:"DELETE"});setTimeBlocks(current=>current.filter(item=>item.id!==block.id));}catch(cause){setError(cause instanceof Error?cause.message:"Couldn't remove block.");}}}><Text style={styles.link}>Remove</Text></TouchableOpacity></View>)}
          {selectedCalendarTasks.map(task=><View key={task.id} style={styles.taskRow}><View style={styles.taskCircle}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskMeta}>Due today</Text></View></View>)}
          {selectedCalendarEvents.length+selectedCalendarBlocks.length+selectedCalendarTasks.length===0&&<Text style={styles.muted}>Nothing planned for this day. Leave it open, or add something below.</Text>}
          <Text style={styles.sectionTitle}>Create an event</Text>
          <TextInput style={styles.mobileInlineInput} value={eventDraftTitle} onChangeText={setEventDraftTitle} placeholder="Event title…" placeholderTextColor={colors.muted}/>
          <View style={styles.mobileTimeRow}><TextInput style={[styles.mobileInlineInput,styles.mobileTimeInput]} value={scheduleStart} onChangeText={setScheduleStart} placeholder="09:00" placeholderTextColor={colors.muted}/><TextInput style={[styles.mobileInlineInput,styles.mobileTimeInput]} value={scheduleEnd} onChangeText={setScheduleEnd} placeholder="10:00" placeholderTextColor={colors.muted}/></View>
          <TouchableOpacity style={styles.mobileCaptureSave} onPress={()=>void createCalendarEvent()} disabled={!eventDraftTitle.trim()}><Text style={styles.captureButtonText}>Add event</Text></TouchableOpacity>
          <Text style={styles.sectionTitle}>Schedule a task</Text><Text style={styles.taskMeta}>This creates a work block without changing the task deadline.</Text>
          {tasks.filter(task=>task.status!=="done"&&task.status!=="cancelled").slice(0,20).map(task=><TouchableOpacity key={task.id} style={styles.mobileScheduleRow} onPress={()=>void scheduleTask(task.id)}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.link}>Schedule</Text></TouchableOpacity>)}
        </>}
        {tab === "organize" && organizeSection === "projects" && <>
          {selectedProjectId ? (() => {
            const project = projects.find(item => item.id === selectedProjectId);
            if (!project) return <View><TouchableOpacity onPress={() => setSelectedProjectId(null)}><Text style={styles.link}>← All projects</Text></TouchableOpacity><Text style={styles.muted}>This project is no longer available.</Text></View>;
            const linkedTasks = tasks.filter(task => task.projectId === project.id);
            const completedTasks = linkedTasks.filter(task => task.status === "done").length;
            return <View>
              <TouchableOpacity onPress={() => setSelectedProjectId(null)}><Text style={styles.link}>← All projects</Text></TouchableOpacity>
              <Text style={styles.mobileProjectTitle}>{project.name}</Text>
              {!!project.description && <Text style={styles.muted}>{project.description}</Text>}
              <Text style={styles.taskMeta}>{project.status.replace("_"," ")} · {project.dueDate ? "Due "+new Date(project.dueDate+"T12:00:00").toLocaleDateString() : "No target date"}</Text>
              <View style={styles.mobileProjectProgress}><Text style={styles.mobileProjectProgressText}>{linkedTasks.length ? completedTasks+" of "+linkedTasks.length+" tasks completed" : "No steps added yet"}</Text>{linkedTasks.length>0&&<View style={styles.mobileProjectProgressTrack}><View style={[styles.mobileProjectProgressFill,{width: `${completedTasks/linkedTasks.length*100}%` as `${number}%`}]}/></View>}</View>
              <Text style={styles.sectionTitle}>Next steps</Text>
              {linkedTasks.length ? linkedTasks.map(renderTask) : <Text style={styles.muted}>Add one small action to give this project momentum.</Text>}
              {project.status!=="archived"&&project.status!=="completed"&&<View style={styles.projectTaskComposer}><TextInput style={styles.mobileInlineInput} value={projectTaskDraft} onChangeText={setProjectTaskDraft} placeholder="Add the next step…" placeholderTextColor={colors.muted} onSubmitEditing={() => void createProjectTask()}/><TouchableOpacity onPress={() => void createProjectTask()} disabled={!projectTaskDraft.trim()}><Text style={styles.link}>Add</Text></TouchableOpacity></View>}
            </View>;
          })() : <><View style={styles.mobileTodaySectionHeader}><Text style={styles.sectionTitle}>Your projects</Text></View><View style={styles.projectTaskComposer}><TextInput style={styles.mobileInlineInput} value={projectDraft} onChangeText={setProjectDraft} placeholder="Start a new project…" placeholderTextColor={colors.muted} onSubmitEditing={() => void createProject()}/><TouchableOpacity onPress={() => void createProject()} disabled={!projectDraft.trim()}><Text style={styles.link}>Create</Text></TouchableOpacity></View>{projects.length ? projects.map(project=><TouchableOpacity key={project.id} style={styles.mobileOrganizeRow} onPress={() => setSelectedProjectId(project.id)}><View style={styles.taskCopy}><Text style={styles.taskTitle}>{project.name}</Text><Text style={styles.taskMeta}>{project.status.replace("_"," ")} · {tasks.filter(task=>task.projectId===project.id).length} linked tasks</Text></View><Text style={styles.link}>›</Text></TouchableOpacity>) : <Text style={styles.muted}>Create a project when something needs more than one step.</Text>}</>}
        </>}
        {tab === "notes" && <><Text style={styles.sectionTitle}>Your notes</Text><View style={styles.noteComposer}><TextInput style={styles.noteTitleInput} placeholder={noteEditingId?"Edit note title":"Note title"} placeholderTextColor={colors.muted} value={noteTitle} onChangeText={setNoteTitle}/><TextInput style={styles.noteBodyInput} placeholder="Start writing…" placeholderTextColor={colors.muted} value={noteBody} onChangeText={setNoteBody} multiline/><TouchableOpacity style={styles.captureButton} onPress={()=>void createNote()}><Text style={styles.captureButtonText}>{noteEditingId?"Update note":"Save note"}</Text></TouchableOpacity>{noteEditingId&&<TouchableOpacity style={styles.mobileTemplateSave} onPress={()=>{setNoteEditingId(null);setNoteTitle("");setNoteBody("");}}><Text style={styles.link}>Cancel editing</Text></TouchableOpacity>}<TouchableOpacity style={styles.mobileTemplateSave} onPress={()=>void saveNoteTemplate()}><Text style={styles.link}>Save current draft as template</Text></TouchableOpacity></View>{noteTemplates.map(template=><TouchableOpacity key={template.id} style={styles.mobileTemplateChip} onPress={()=>{setNoteTitle(template.name);setNoteBody(template.content.map(block=>block.text).join("\n"));}}><Text style={styles.link}>Use {template.name}</Text></TouchableOpacity>)}{notes.filter(note=>!note.archivedAt).map(note=><View key={note.id} style={styles.taskRow}><TouchableOpacity style={styles.taskCopy} onPress={()=>openNoteEditor(note)}><Text style={styles.taskTitle}>{note.icon||"📝"} {note.title}</Text><Text style={styles.taskMeta}>{note.tags.join(" · ")||"Note"} · Updated {new Date(note.updatedAt).toLocaleDateString()}</Text>{(noteBacklinks[note.id]||[]).map(backlink=><Text key={backlink.id} style={styles.taskMeta}>Linked from: {backlink.title}</Text>)}</TouchableOpacity><TouchableOpacity onPress={()=>void loadNoteBacklinks(note.id)}><Text style={styles.link}>Backlinks</Text></TouchableOpacity></View>)}</>}
        {tab === "organize" && organizeSection === "areas" && <><Text style={styles.sectionTitle}>Your life areas</Text><View style={styles.projectTaskComposer}><TextInput style={styles.mobileInlineInput} value={lifeAreaDraft} onChangeText={setLifeAreaDraft} placeholder="Add a life area…" placeholderTextColor={colors.muted} onSubmitEditing={() => void createLifeArea()}/><TouchableOpacity onPress={() => void createLifeArea()} disabled={!lifeAreaDraft.trim()}><Text style={styles.link}>Create</Text></TouchableOpacity></View>{lifeAreas.map(area=><View key={area.id} style={styles.taskRow}><View style={[styles.areaDot,{backgroundColor:area.color}]}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{area.name}</Text><Text style={styles.taskMeta}>{tasks.filter(task=>task.lifeAreaId===area.id).length} tasks · {projects.filter(project=>project.lifeAreaId===area.id).length} projects · {goals.filter(goal=>goal.lifeAreaId===area.id).length} goals</Text></View><TouchableOpacity onPress={()=>openLifeAreaEditor(area)}><Text style={styles.link}>Edit</Text></TouchableOpacity></View>)}</>}
        <Text style={styles.footer}>Sonder · Your life, in perspective.</Text>
      </ScrollView>
      <View style={styles.mobileBottomNav}>
        {(["today","calendar","organize","notes"] as Tab[]).map(item=><TouchableOpacity key={item} style={styles.mobileBottomItem} onPress={()=>{if(item==="organize")setOrganizeSection("home");setTab(item);}}>
          <View style={[styles.mobileBottomIndicator,tab===item&&styles.mobileBottomIndicatorActive]}/>
          <Text style={[styles.mobileBottomLabel,tab===item&&styles.mobileBottomLabelActive]}>{item[0].toUpperCase()+item.slice(1)}</Text>
        </TouchableOpacity>)}
      </View>
      <Modal visible={lifeAreaEditId !== null} transparent animationType="fade" onRequestClose={() => setLifeAreaEditId(null)}>
        <KeyboardAvoidingView style={styles.mobileCaptureOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.mobileCaptureCard}>
            <View style={styles.mobileCaptureModalHeading}><View style={{flex:1}}><Text style={styles.kicker}>LIFE AREA</Text><Text style={styles.mobileCaptureTitle}>Edit area</Text></View><TouchableOpacity onPress={() => setLifeAreaEditId(null)}><Text style={styles.link}>Close</Text></TouchableOpacity></View>
            <TextInput style={styles.mobileCaptureInput} value={lifeAreaEditName} onChangeText={setLifeAreaEditName} placeholder="Area name" placeholderTextColor={colors.muted}/>
            <View style={styles.mobileTaskPriorityRow}>{(["#A78BFA","#79B7D7","#76B99A","#D6A66A","#D58CA8","#8D98AA"] as const).map(color=><TouchableOpacity key={color} style={[styles.mobileAreaColor,{backgroundColor:color},lifeAreaEditColor===color&&styles.mobileAreaColorSelected]} onPress={()=>setLifeAreaEditColor(color)}/>)}</View>
            <TouchableOpacity style={styles.mobileCaptureSave} onPress={() => void saveLifeArea()} disabled={!lifeAreaEditName.trim()}><Text style={styles.captureButtonText}>Save changes</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={searchOpen} transparent animationType="fade" onRequestClose={() => setSearchOpen(false)}>
        <KeyboardAvoidingView style={styles.mobileCaptureOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.mobileCaptureCard}>
            <View style={styles.mobileCaptureModalHeading}><View style={{flex:1}}><Text style={styles.kicker}>SEARCH YOUR LIFE</Text><Text style={styles.mobileCaptureTitle}>Find anything.</Text></View><TouchableOpacity onPress={() => setSearchOpen(false)}><Text style={styles.link}>Close</Text></TouchableOpacity></View>
            <View style={styles.mobileSearchInputRow}><TextInput autoFocus style={[styles.mobileCaptureInput,{flex:1}]} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search tasks, projects, goals, notes…" placeholderTextColor={colors.muted} onSubmitEditing={() => void runMobileSearch()}/><TouchableOpacity onPress={() => void runMobileSearch()}><Text style={styles.link}>Go</Text></TouchableOpacity></View>
            {searchLoading&&<ActivityIndicator color={colors.lavender}/>}
            {searchResults.map(result=><TouchableOpacity key={result.type+":"+result.id} style={styles.mobileSearchResult} onPress={() => openSearchResult(result)}><View style={styles.taskCopy}><Text style={styles.taskTitle}>{result.title}</Text><Text style={styles.taskMeta}>{result.type}{result.subtitle?" · "+(Array.isArray(result.subtitle)?result.subtitle.join(" · "):result.subtitle):""}</Text></View><Text style={styles.link}>›</Text></TouchableOpacity>)}
            {!searchLoading&&searchQuery.trim().length>=2&&searchResults.length===0&&<Text style={styles.muted}>No matches. Try a different phrase.</Text>}
            {searchQuery.trim().length<2&&<Text style={styles.taskMeta}>Enter at least two characters to search across your workspace.</Text>}
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={goalEditingId !== null} transparent animationType="fade" onRequestClose={() => setGoalEditingId(null)}>
        <KeyboardAvoidingView style={styles.mobileCaptureOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.mobileCaptureCard}>
            <View style={styles.mobileCaptureModalHeading}><View style={{flex:1}}><Text style={styles.kicker}>LONG-TERM DIRECTION</Text><Text style={styles.mobileCaptureTitle}>Edit goal</Text></View><TouchableOpacity onPress={() => setGoalEditingId(null)}><Text style={styles.link}>Close</Text></TouchableOpacity></View>
            <TextInput style={styles.mobileCaptureInput} value={goalEditTitle} onChangeText={setGoalEditTitle} placeholder="Goal title" placeholderTextColor={colors.muted}/>
            <TextInput style={[styles.mobileCaptureInput,{minHeight:76,textAlignVertical:"top"}]} value={goalEditDescription} onChangeText={setGoalEditDescription} placeholder="Why does this matter to you?" placeholderTextColor={colors.muted} multiline/>
            <TextInput style={styles.mobileCaptureInput} value={goalEditDate} onChangeText={setGoalEditDate} placeholder="Target date · YYYY-MM-DD" placeholderTextColor={colors.muted}/>
            <View style={styles.mobileAreaPicker}>{lifeAreas.map(area=><TouchableOpacity key={area.id} style={[styles.mobileTaskPriority,goalEditArea===area.id&&styles.mobileTaskPriorityActive]} onPress={()=>setGoalEditArea(goalEditArea===area.id?"":area.id)}><Text style={[styles.mobileTaskPriorityText,goalEditArea===area.id&&styles.mobileTaskFilterTextActive]}>{area.name}</Text></TouchableOpacity>)}</View>
            <TouchableOpacity style={styles.mobileCaptureSave} onPress={() => void saveGoalEditor()} disabled={!goalEditTitle.trim()}><Text style={styles.captureButtonText}>Save changes</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={taskEditId !== null} transparent animationType="fade" onRequestClose={() => setTaskEditId(null)}>
        <KeyboardAvoidingView style={styles.mobileCaptureOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.mobileCaptureCard}>
            <View style={styles.mobileCaptureModalHeading}><View style={{flex:1}}><Text style={styles.kicker}>TASK DETAILS</Text><Text style={styles.mobileCaptureTitle}>Edit task</Text></View><TouchableOpacity onPress={() => setTaskEditId(null)}><Text style={styles.link}>Close</Text></TouchableOpacity></View>
            <TextInput style={styles.mobileCaptureInput} value={taskEditTitle} onChangeText={setTaskEditTitle} placeholder="Task title" placeholderTextColor={colors.muted}/>
            <TextInput style={[styles.mobileCaptureInput,{minHeight:76,textAlignVertical:"top"}]} value={taskEditDescription} onChangeText={setTaskEditDescription} placeholder="Add context (optional)" placeholderTextColor={colors.muted} multiline/>
            <TextInput style={styles.mobileCaptureInput} value={taskEditDue} onChangeText={setTaskEditDue} placeholder="Due date · YYYY-MM-DD" placeholderTextColor={colors.muted}/>
            <View style={styles.mobileTaskPriorityRow}>{(["low","medium","high","urgent"] as const).map(priority=><TouchableOpacity key={priority} style={[styles.mobileTaskPriority,taskEditPriority===priority&&styles.mobileTaskPriorityActive]} onPress={()=>setTaskEditPriority(priority)}><Text style={[styles.mobileTaskPriorityText,taskEditPriority===priority&&styles.mobileTaskFilterTextActive]}>{priority}</Text></TouchableOpacity>)}</View>
            <TouchableOpacity style={styles.mobileCaptureSave} onPress={() => void saveTaskEditor()} disabled={!taskEditTitle.trim()}><Text style={styles.captureButtonText}>Save changes</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={captureOpen} transparent animationType="fade" onRequestClose={() => setCaptureOpen(false)}>
        <KeyboardAvoidingView style={styles.mobileCaptureOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.mobileCaptureCard}>
            <View style={styles.mobileCaptureModalHeading}><View style={{flex:1}}><Text style={styles.kicker}>QUICK CAPTURE</Text><Text style={styles.mobileCaptureTitle}>Get it out of your head.</Text></View><TouchableOpacity onPress={() => setCaptureOpen(false)}><Text style={styles.link}>Close</Text></TouchableOpacity></View>
            <TextInput autoFocus style={styles.mobileCaptureInput} placeholder="A task, thought, idea, or reminder…" placeholderTextColor={colors.muted} value={capture} onChangeText={setCapture} onSubmitEditing={() => void addCapture()} returnKeyType="done"/>
            <Text style={styles.taskMeta}>Saved to your inbox. Sort it whenever you’re ready.</Text>
            <TouchableOpacity style={styles.mobileCaptureSave} onPress={() => void addCapture()} disabled={!capture.trim()}><Text style={styles.captureButtonText}>Capture</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 12 },
  authWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 26, paddingVertical: 28 },
  logoMark: { width: 54, height: 54, borderRadius: 18, borderWidth: 1, borderColor: colors.lavender, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 12 },
  logoMarkText: { color: colors.lavender, fontSize: 28, fontWeight: "600" },
  logo: { color: colors.text, fontSize: 32, fontWeight: "700", letterSpacing: -1, textAlign: "center" },
  tagline: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 6, marginBottom: 34 },
  authCard: { padding: 22, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18 },
  kicker: { color: colors.lavender, fontSize: 10, letterSpacing: 1.6, fontWeight: "700", marginBottom: 9 },
  heading: { color: colors.text, fontSize: 26, fontWeight: "600", letterSpacing: -0.8, marginBottom: 6 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, color: colors.text, paddingHorizontal: 13, marginTop: 13, fontSize: 13 },
  primaryButton: { height: 48, borderRadius: 10, backgroundColor: colors.lavender, alignItems: "center", justifyContent: "center", marginTop: 18 },
  primaryText: { color: colors.bg, fontWeight: "700", fontSize: 13 },
  disabled: { opacity: 0.6 },
  googleButton: { height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", marginTop: 10 },
  googleText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  switchText: { color: colors.lavender, fontSize: 12, textAlign: "center", marginTop: 20 },
  footnote: { color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 28 },
  apiHint: { color: "#514d5a", fontSize: 9, textAlign: "center", marginTop: 12 },
  mobileBottomNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", minHeight: 62, paddingTop: 7, paddingBottom: 5, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  mobileBottomItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 4 },
  mobileBottomIndicator: { width: 18, height: 3, borderRadius: 2, backgroundColor: "transparent" },
  mobileBottomIndicatorActive: { backgroundColor: colors.lavender },
  mobileBottomLabel: { color: colors.muted, fontSize: 10, fontWeight: "500" },
  mobileBottomLabelActive: { color: "#D8CAFF", fontWeight: "700" },
  mobileHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  mobileCaptureButton: { borderWidth: 1, borderColor: "rgba(167,139,250,0.35)", backgroundColor: "rgba(167,139,250,0.12)", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 },
  mobileCaptureButtonText: { color: "#D8CAFF", fontSize: 10, fontWeight: "600" },
  mobileSearchInputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  mobileSearchResult: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  mobileCaptureOverlay: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.76)" },
  mobileCaptureCard: { padding: 20, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 12 },
  mobileCaptureModalHeading: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  mobileCaptureTitle: { color: colors.text, fontSize: 20, fontWeight: "600", letterSpacing: -0.5 },
  mobileCaptureInput: { minHeight: 50, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, color: colors.text, fontSize: 13 },
  mobileCaptureSave: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: colors.lavender },
  mobileAreaColor: { width: 27, height: 27, borderRadius: 14, borderWidth: 2, borderColor: "transparent" },
  mobileAreaColorSelected: { borderColor: colors.text, transform: [{scale:1.08}] },
  mobileAreaPicker: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  mobileCalendarHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  mobileCalendarDate: { color: colors.text, fontSize: 16, fontWeight: "600", textAlign: "center" },
  mobileTaskPriorityRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  mobileTaskPriority: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  mobileTaskPriorityActive: { borderColor: "rgba(167,139,250,0.4)", backgroundColor: "rgba(167,139,250,0.12)" },
  mobileTaskPriorityText: { color: colors.muted, fontSize: 10, textTransform: "capitalize" },
  mobileTaskFilters: { flexDirection: "row", gap: 6, marginBottom: 14 },
  mobileTaskFilter: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "transparent" },
  mobileTaskFilterActive: { borderColor: "rgba(167,139,250,0.3)", backgroundColor: "rgba(167,139,250,0.12)" },
  mobileTaskFilterText: { color: colors.muted, fontSize: 10 },
  mobileTaskFilterCount: { color: colors.muted, fontSize: 9 },
  mobileTaskFilterTextActive: { color: "#D8CAFF", fontWeight: "600" },
  mobileProjectTitle: { color: colors.text, fontSize: 25, fontWeight: "600", letterSpacing: -0.8, marginTop: 18, marginBottom: 7 },
  mobileProjectProgress: { paddingVertical: 16, marginTop: 15, marginBottom: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, gap: 10 },
  mobileProjectProgressText: { color: colors.muted, fontSize: 10 },
  mobileProjectProgressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.surface2, overflow: "hidden" },
  mobileProjectProgressFill: { height: 5, borderRadius: 3, backgroundColor: colors.lavender },
  projectTaskComposer: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 15 },
  mobileOrganizeRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: colors.border },
  mobileOrganizeCount: { color: colors.muted, fontSize: 11, fontVariant: ["tabular-nums"] },
  mobileTodayIntro: { marginTop: 30, marginBottom: 22 },
  mobileTodayDate: { color: colors.muted, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 9 },
  mobileTodayTitle: { color: colors.text, fontSize: 30, fontWeight: "600", letterSpacing: -1, marginBottom: 6 },
  mobileDayContext: { color: colors.muted, fontSize: 10, marginTop: 13, marginBottom: 6 },
  mobileTodaySection: { marginTop: 26, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
  mobileTodaySectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  mobileTodaySectionTitle: { color: colors.text, fontSize: 16, fontWeight: "600", letterSpacing: -0.3 },
  mobileTodayAgendaRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.045)" },
  mobileTodayTime: { color: colors.muted, fontSize: 10, width: 65, fontVariant: ["tabular-nums"] },
  mobileTodayDot: { width: 7, height: 7, borderRadius: 4 },
  mobileTodayEmpty: { paddingVertical: 15, gap: 5 },
  mobileTodayEmptyTitle: { color: colors.text, fontSize: 12, fontWeight: "600" },
  mobileTodayHabitRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.045)" },
  mobileTodayNote: { marginTop: 22, padding: 16, borderRadius: 12, backgroundColor: colors.surface2, gap: 6 },
  mobileTodayNoteTitle: { color: colors.text, fontSize: 14, fontWeight: "600" },
  mobileTodayInbox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 22, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 38 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  signOut: { borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  signOutText: { color: colors.muted, fontSize: 11 },
  welcome: { marginTop: 34, marginBottom: 18 },
  welcomeName: { color: colors.text, fontSize: 22, fontWeight: "600", marginBottom: 5 },
  stats: { flexDirection: "row", gap: 9, marginBottom: 28 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 13, padding: 14, borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.text, fontSize: 25, fontWeight: "600" },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 5 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 28 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: 12, marginTop: 22 },
  capture: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 6 },
  captureInput: { flex: 1, color: colors.text, paddingHorizontal: 10, height: 42, fontSize: 12 },
  captureButton: { backgroundColor: colors.lavender, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 8 },
  captureButtonText: { color: colors.bg, fontWeight: "700", fontSize: 11 },
  link: { color: colors.lavender, fontSize: 11 },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  taskCircle: { width: 19, height: 19, borderRadius: 7, borderWidth: 1, borderColor: colors.muted },
  taskCopy: { flex: 1 },
  taskTitle: { color: colors.text, fontSize: 13, fontWeight: "500" },
  taskMeta: { color: colors.muted, fontSize: 10, marginTop: 5, textTransform: "capitalize" },
  empty: { alignItems: "center", paddingVertical: 26, backgroundColor: colors.surface, borderRadius: 13 },
  emptyTitle: { color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: 5 },
  inboxRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  inboxCopy: { flex: 1 },
  inboxActions: { flexDirection: "row", alignItems: "center", gap: 13 },
  archiveLink: { color: colors.muted, fontSize: 10 },
  error: { color: "#E18A91", fontSize: 11, marginTop: 12 },
  mobileHabitRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  mobileHeatmap: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 9, maxWidth: 220 },
  mobileHeatCell: { width: 9, height: 9, borderRadius: 3, backgroundColor: colors.surface2 },
  mobileHeatCellDone: { backgroundColor: colors.lavender },
  mobileGoal: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  mobileMilestone: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, paddingLeft: 30 },
  mobileMilestoneComposer: { flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 30 },
  mobileInlineInput: { minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 11, color: colors.text, backgroundColor: colors.surface, marginVertical: 6, fontSize: 12 },
  mobileTimeRow: { flexDirection: "row", gap: 8 },
  mobileTimeInput: { flex: 1 },
  mobileScheduleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  mobileTemplateSave: { marginTop: 12 },
  mobileTemplateChip: { alignSelf: "flex-start", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.surface2, marginBottom: 8 },
  footer: { color: "#55515D", fontSize: 10, textAlign: "center", marginTop: 35 },
  tabs: { marginTop: 22, maxHeight: 42 },
  tabsContent: { flexDirection: "row", gap: 7, alignItems: "center" },
  tab: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9 },
  tabActive: { backgroundColor: "#292137", borderColor: colors.lavender },
  tabText: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  tabTextActive: { color: "#D8CAFF" },
  taskCircleDone: { backgroundColor: colors.lavender, borderColor: colors.lavender },
  taskDone: { color: colors.muted, textDecorationLine: "line-through" },
  eventDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#79B7D7" },
  goalDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.lavender },
  areaDot: { width: 9, height: 9, borderRadius: 5 },
  noteComposer: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 12, gap: 8, marginBottom: 14 },
  noteTitleInput: { color: colors.text, fontSize: 14, fontWeight: "600", paddingVertical: 8 },
  noteBodyInput: { color: colors.text, fontSize: 12, minHeight: 68, textAlignVertical: "top" },

});
