import { useEffect, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import { API_BASE_URL, apiRequest, authClient } from "./auth-client";

type Task = {
  id: string;
  title: string;
  status: "inbox" | "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueAt: string | null;
};
type InboxItem = { id: string; title: string; createdAt: string };
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
  const [capture, setCapture] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) {
      setTasks([]);
      setInbox([]);
      return;
    }
    void loadData();
  }, [session?.user?.id]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [taskResult, inboxResult] = await Promise.all([
        apiRequest<List<Task[]>>("/tasks"),
        apiRequest<List<InboxItem[]>>("/inbox?status=inbox")
      ]);
      setTasks(taskResult.data);
      setInbox(inboxResult.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load your data.");
    } finally {
      setLoading(false);
    }
  }

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
      const result = await apiRequest<List<Task>>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: task.status === "done" ? "todo" : "done" })
      });
      setTasks(current => current.map(item => item.id === task.id ? result.data : item));
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.kicker}>YOUR WORKSPACE</Text><Text style={styles.heading}>Today.</Text><Text style={styles.muted}>A little clarity goes a long way.</Text></View>
          <TouchableOpacity style={styles.signOut} onPress={() => void authClient.signOut()}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity>
        </View>
        <View style={styles.welcome}><Text style={styles.welcomeName}>Hey, {session.user.name?.split(" ")[0] || "there"}.</Text><Text style={styles.muted}>Make room for what matters.</Text></View>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statValue}>{activeTasks.length}</Text><Text style={styles.statLabel}>Open tasks</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{dueToday.length}</Text><Text style={styles.statLabel}>Due today</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{inbox.length}</Text><Text style={styles.statLabel}>Inbox</Text></View>
        </View>
        <Text style={styles.sectionTitle}>Quick capture</Text>
        <View style={styles.capture}>
          <TextInput style={styles.captureInput} placeholder="Don't forget…" placeholderTextColor={colors.muted} value={capture} onChangeText={setCapture} onSubmitEditing={() => void addCapture()} returnKeyType="done" />
          <TouchableOpacity style={styles.captureButton} onPress={() => void addCapture()}><Text style={styles.captureButtonText}>Add</Text></TouchableOpacity>
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your priorities</Text><TouchableOpacity onPress={() => void loadData()}><Text style={styles.link}>Refresh</Text></TouchableOpacity></View>
        {loading ? <ActivityIndicator color={colors.lavender} /> : activeTasks.slice(0, 12).map(task => (
          <TouchableOpacity key={task.id} style={styles.taskRow} onPress={() => void toggleTask(task)}>
            <View style={styles.taskCircle} /><View style={styles.taskCopy}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskMeta}>{task.priority} priority{task.dueAt ? " · " + new Date(task.dueAt).toLocaleDateString() : ""}</Text></View>
          </TouchableOpacity>
        ))}
        {!loading && activeTasks.length === 0 && <View style={styles.empty}><Text style={styles.emptyTitle}>All clear for now</Text><Text style={styles.muted}>Capture something above when it comes to mind.</Text></View>}
        <Text style={styles.sectionTitle}>Inbox</Text>
        {inbox.slice(0, 5).map(item => <View key={item.id} style={styles.inboxRow}><View style={styles.inboxCopy}><Text style={styles.taskTitle}>{item.title}</Text><Text style={styles.taskMeta}>Saved for later</Text></View><View style={styles.inboxActions}><TouchableOpacity onPress={() => void convertInboxItem(item)}><Text style={styles.link}>Make task</Text></TouchableOpacity><TouchableOpacity onPress={() => void archiveInboxItem(item)}><Text style={styles.archiveLink}>Archive</Text></TouchableOpacity></View></View>)}
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
  switchText: { color: colors.lavender, fontSize: 12, textAlign: "center", marginTop: 20 },
  footnote: { color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 28 },
  apiHint: { color: "#514d5a", fontSize: 9, textAlign: "center", marginTop: 12 },
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
  inboxRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },\n  inboxCopy: { flex: 1 },\n  inboxActions: { flexDirection: "row", alignItems: "center", gap: 13 },\n  archiveLink: { color: colors.muted, fontSize: 10 },
  error: { color: "#E18A91", fontSize: 11, marginTop: 12 },
  footer: { color: "#55515D", fontSize: 10, textAlign: "center", marginTop: 35 }
});
