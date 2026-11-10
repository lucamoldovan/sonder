import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView,
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
  const [noteBody, setNoteBody] = useState("");
  const [tab, setTab] = useState<Tab>("today");
  const [organizeSection, setOrganizeSection] = useState<OrganizeSection>("home");
  const [capture, setCapture] = useState("");
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

  async function addCapture() {
    if (!capture.trim()) return;
    try {
      const result = await apiRequest<List<InboxItem>>("/inbox", {
        method: "POST",
        body: JSON.stringify({ title: capture.trim(), type: "task" })
      });
      setInbox(current => [result.data, ...current]);
      setCapture("");
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

  async function createNote() {
    if (!noteTitle.trim()) return;
    try {
      const result = await apiRequest<List<NoteRecord>>("/notes", {
        method: "POST",
        body: JSON.stringify({
          title: noteTitle.trim(),
          content: noteBody.trim() ? [{ id: String(Date.now()), type: "paragraph", text: noteBody.trim() }] : []
        })
      });
      setNotes(current => [result.data, ...current]);
      setNoteTitle("");
      setNoteBody("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create note.");
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
            <Text style={styles.muted}>A calm place for everything you're carrying.</Text>
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
  const todayEvents = events.filter(event => localDateKey(event.startsAt) === todayKey).sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const todayBlocks = timeBlocks.filter(block => localDateKey(block.startsAt) === todayKey).sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const todayAgendaItems = [
    ...todayEvents.map(event => ({ id: event.id, kind: "event" as const, startsAt: event.startsAt, endsAt: event.endsAt, title: event.title, event })),
    ...todayBlocks.map(block => ({ id: block.id, kind: "block" as const, startsAt: block.startsAt, endsAt: block.endsAt, title: tasks.find(task => task.id === block.taskId)?.title || "Scheduled work", block }))
  ].sort((a,b) => a.startsAt.localeCompare(b.startsAt));
  const nextActionTasks = activeTasks.filter(task => (task.dueAt && localDateKey(task.dueAt) <= todayKey) || task.priority === "urgent" || task.priority === "high")
    .sort((a,b) => (a.dueAt || "9999").localeCompare(b.dueAt || "9999") || ["urgent","high","medium","low"].indexOf(a.priority) - ["urgent","high","medium","low"].indexOf(b.priority)).slice(0,5);
  const habitsDueToday = habits.filter(habit => {
    if (habit.archivedAt) return false;
    if (habit.frequency === "daily") return true;
    if (habit.frequency === "weekdays") return todayDate.getDay() !== 0 && todayDate.getDay() !== 6;
    return habitEntries.filter(entry => entry.habitId === habit.id && entry.entryDate >= weekStartKey).length < habit.targetPerWeek;
  });

  const openOrganizeSection = (section: Exclude<OrganizeSection, "home">) => {
    setOrganizeSection(section);
    setTab("organize");
  };

  const renderTask = (task: Task) => (
    <TouchableOpacity key={task.id} style={styles.taskRow} onPress={() => void toggleTask(task)}>
      <View style={[styles.taskCircle, task.status === "done" && styles.taskCircleDone]} />
      <View style={styles.taskCopy}><Text style={[styles.taskTitle, task.status === "done" && styles.taskDone]}>{task.title}</Text><Text style={styles.taskMeta}>{task.priority} priority{task.dueAt ? " · " + new Date(task.dueAt).toLocaleDateString() : ""}{task.recurrenceFrequency ? " · Repeats " + task.recurrenceFrequency : ""}</Text></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.kicker}>YOUR WORKSPACE</Text><Text style={styles.heading}>{tab === "today" ? "Today." : tab[0].toUpperCase()+tab.slice(1)+"."}</Text><Text style={styles.muted}>A little clarity goes a long way.</Text></View>
          <TouchableOpacity style={styles.signOut} onPress={() => void authClient.signOut()}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
          {(["today","calendar","organize","notes"] as Tab[]).map(item=><TouchableOpacity key={item} style={[styles.tab,tab===item&&styles.tabActive]} onPress={()=>{if(item==="organize")setOrganizeSection("home");setTab(item);}}><Text style={[styles.tabText,tab===item&&styles.tabTextActive]}>{item[0].toUpperCase()+item.slice(1)}</Text></TouchableOpacity>)}
        </ScrollView>
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
        {tab === "organize" && organizeSection === "tasks" && <><Text style={styles.sectionTitle}>All tasks</Text>{tasks.map(renderTask)}</>}
        {tab === "organize" && organizeSection === "inbox" && <><Text style={styles.sectionTitle}>Capture now · Organize later</Text><View style={styles.capture}><TextInput style={styles.captureInput} placeholder="Capture a thought…" placeholderTextColor={colors.muted} value={capture} onChangeText={setCapture} onSubmitEditing={() => void addCapture()} returnKeyType="done"/><TouchableOpacity style={styles.captureButton} onPress={() => void addCapture()}><Text style={styles.captureButtonText}>Add</Text></TouchableOpacity></View>{inbox.map(item=><View key={item.id} style={styles.inboxRow}><View style={styles.inboxCopy}><Text style={styles.taskTitle}>{item.title}</Text><Text style={styles.taskMeta}>{item.type} · {new Date(item.createdAt).toLocaleDateString()}</Text></View><View style={styles.inboxActions}><TouchableOpacity onPress={()=>void convertInboxItem(item)}><Text style={styles.link}>Task</Text></TouchableOpacity><TouchableOpacity onPress={()=>void convertInboxToNote(item)}><Text style={styles.link}>Note</Text></TouchableOpacity><TouchableOpacity onPress={()=>void archiveInboxItem(item)}><Text style={styles.archiveLink}>Archive</Text></TouchableOpacity></View></View>)}</>}
        {tab === "organize" && organizeSection === "habits" && <><Text style={styles.sectionTitle}>Your habits</Text>{habits.filter(habit=>!habit.archivedAt).map(habit=>{const checked=habitEntries.some(entry=>entry.habitId===habit.id&&entry.entryDate===todayKey);const history=Array.from({length:28},(_,index)=>{const d=new Date();d.setDate(d.getDate()-(27-index));const key=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");return habitEntries.some(entry=>entry.habitId===habit.id&&entry.entryDate===key);});return <View key={habit.id} style={styles.mobileHabitRow}><TouchableOpacity style={[styles.taskCircle,checked&&styles.taskCircleDone]} onPress={()=>void checkInHabit(habit)}/><View style={styles.taskCopy}><Text style={[styles.taskTitle,checked&&styles.taskDone]}>{habit.name}</Text><Text style={styles.taskMeta}>{habit.frequency} · {habitEntries.filter(entry=>entry.habitId===habit.id).length} check-ins</Text><View style={styles.mobileHeatmap}>{history.map((done,index)=><View key={index} style={[styles.mobileHeatCell,done&&styles.mobileHeatCellDone]}/>)}</View></View></View>;})}</>}
        {tab === "organize" && organizeSection === "goals" && <><Text style={styles.sectionTitle}>Your goals</Text>{goals.map(goal=>{const linked=tasks.filter(task=>task.goalId===goal.id);const done=linked.filter(task=>task.status==="done").length;const steps=milestones[goal.id]||[];const completed=steps.filter(step=>step.status==="completed").length;const percent=linked.length+steps.length?Math.round((done+completed)/(linked.length+steps.length)*100):0;return <View key={goal.id} style={styles.mobileGoal}><View style={styles.taskRow}><View style={styles.goalDot}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{goal.title}</Text><Text style={styles.taskMeta}>{percent}% complete · {done}/{linked.length} tasks · {completed}/{steps.length} milestones</Text></View></View>{steps.map(step=><TouchableOpacity key={step.id} style={styles.mobileMilestone} onPress={()=>void toggleMilestone(goal.id,step)}><View style={[styles.taskCircle,step.status==="completed"&&styles.taskCircleDone]}/><Text style={[styles.taskMeta,step.status==="completed"&&styles.taskDone]}>{step.title}</Text></TouchableOpacity>)}<View style={styles.mobileMilestoneComposer}><TextInput style={styles.mobileInlineInput} placeholder="Add a milestone…" placeholderTextColor={colors.muted} value={milestoneDrafts[goal.id]||""} onChangeText={value=>setMilestoneDrafts(current=>({...current,[goal.id]:value}))}/><TouchableOpacity onPress={()=>void addMilestone(goal.id)}><Text style={styles.link}>Add</Text></TouchableOpacity></View></View>;})}</>}
        {tab === "calendar" && <><Text style={styles.sectionTitle}>Upcoming calendar</Text><Text style={styles.taskMeta}>Schedule work without changing a task deadline.</Text><TextInput style={styles.mobileInlineInput} value={scheduleDate} onChangeText={setScheduleDate} placeholder="Date · YYYY-MM-DD" placeholderTextColor={colors.muted}/><View style={styles.mobileTimeRow}><TextInput style={[styles.mobileInlineInput,styles.mobileTimeInput]} value={scheduleStart} onChangeText={setScheduleStart} placeholder="09:00" placeholderTextColor={colors.muted}/><TextInput style={[styles.mobileInlineInput,styles.mobileTimeInput]} value={scheduleEnd} onChangeText={setScheduleEnd} placeholder="10:00" placeholderTextColor={colors.muted}/></View><Text style={styles.taskMeta}>Choose an open task to schedule it:</Text>{tasks.filter(task=>task.status!=="done"&&task.status!=="cancelled").slice(0,20).map(task=><TouchableOpacity key={task.id} style={styles.mobileScheduleRow} onPress={()=>void scheduleTask(task.id)}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.link}>Schedule</Text></TouchableOpacity>)}{timeBlocks.map(block=><View key={block.id} style={styles.taskRow}><View style={styles.eventDot}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{tasks.find(task=>task.id===block.taskId)?.title||"Scheduled task"}</Text><Text style={styles.taskMeta}>{new Date(block.startsAt).toLocaleString()} – {new Date(block.endsAt).toLocaleTimeString()}</Text></View><TouchableOpacity onPress={async()=>{try{await apiRequest("/time-blocks/"+block.id,{method:"DELETE"});setTimeBlocks(current=>current.filter(item=>item.id!==block.id));}catch(cause){setError(cause instanceof Error?cause.message:"Couldn't remove block.");}}}><Text style={styles.link}>Remove</Text></TouchableOpacity></View>) }{events.map(event=><View key={event.id} style={styles.taskRow}><View style={styles.eventDot}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{event.title}</Text><Text style={styles.taskMeta}>{new Date(event.startsAt).toLocaleString()}</Text></View></View>)}</>}
        {tab === "organize" && organizeSection === "projects" && <><Text style={styles.sectionTitle}>Your projects</Text>{projects.map(project=><View key={project.id} style={styles.taskRow}><View style={styles.goalDot}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{project.name}</Text><Text style={styles.taskMeta}>{project.status} · {tasks.filter(task=>task.projectId===project.id).length} linked tasks</Text></View></View>)}</>}
        {tab === "notes" && <><Text style={styles.sectionTitle}>Your notes</Text><View style={styles.noteComposer}><TextInput style={styles.noteTitleInput} placeholder="Note title" placeholderTextColor={colors.muted} value={noteTitle} onChangeText={setNoteTitle}/><TextInput style={styles.noteBodyInput} placeholder="Start writing…" placeholderTextColor={colors.muted} value={noteBody} onChangeText={setNoteBody} multiline/><TouchableOpacity style={styles.captureButton} onPress={()=>void createNote()}><Text style={styles.captureButtonText}>Save note</Text></TouchableOpacity><TouchableOpacity style={styles.mobileTemplateSave} onPress={()=>void saveNoteTemplate()}><Text style={styles.link}>Save current draft as template</Text></TouchableOpacity></View>{noteTemplates.map(template=><TouchableOpacity key={template.id} style={styles.mobileTemplateChip} onPress={()=>{setNoteTitle(template.name);setNoteBody(template.content.map(block=>block.text).join("\n"));}}><Text style={styles.link}>Use {template.name}</Text></TouchableOpacity>)}{notes.filter(note=>!note.archivedAt).map(note=><View key={note.id} style={styles.taskRow}><View style={styles.goalDot}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{note.icon||"📝"} {note.title}</Text><Text style={styles.taskMeta}>{note.tags.join(" · ")||"Note"} · Updated {new Date(note.updatedAt).toLocaleDateString()}</Text>{(noteBacklinks[note.id]||[]).map(backlink=><Text key={backlink.id} style={styles.taskMeta}>Linked from: {backlink.title}</Text>)}</View><TouchableOpacity onPress={()=>void loadNoteBacklinks(note.id)}><Text style={styles.link}>Backlinks</Text></TouchableOpacity></View>)}</>}
        {tab === "organize" && organizeSection === "areas" && <><Text style={styles.sectionTitle}>Your life areas</Text>{lifeAreas.map(area=><View key={area.id} style={styles.taskRow}><View style={[styles.areaDot,{backgroundColor:area.color}]}/><View style={styles.taskCopy}><Text style={styles.taskTitle}>{area.name}</Text><Text style={styles.taskMeta}>{tasks.filter(task=>task.lifeAreaId===area.id).length} tasks · {projects.filter(project=>project.lifeAreaId===area.id).length} projects · {goals.filter(goal=>goal.lifeAreaId===area.id).length} goals</Text></View></View>)}</>}
        <Text style={styles.footer}>Sonder · Your life, in perspective.</Text>
      </ScrollView>
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
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 50 },
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
