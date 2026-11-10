"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, Play, Square } from "lucide-react";
import { apiRequest, type ApiList, type ApiTask } from "@/lib/api";

type FocusSession = { id:string; taskId:string|null; plannedMinutes:number; actualMinutes:number|null; status:"active"|"completed"|"abandoned"; startedAt:string; endedAt:string|null; note:string|null };
export default function FocusPage() {
  const [sessions,setSessions]=useState<FocusSession[]>([]);
  const [tasks,setTasks]=useState<ApiTask[]>([]);
  const [active,setActive]=useState<FocusSession|null>(null);
  const [taskId,setTaskId]=useState("");
  const [minutes,setMinutes]=useState(25);
  const [seconds,setSeconds]=useState(Date.now());
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{void Promise.all([apiRequest<ApiList<FocusSession[]>>("/focus"),apiRequest<ApiList<ApiTask[]>>("/tasks")]).then(([a,b])=>{setSessions(a.data);setActive(a.data.find(s=>s.status==="active")??null);setTasks(b.data.filter(t=>!["done","cancelled"].includes(t.status)));}).catch(e=>setError(e instanceof Error?e.message:"Couldn't load focus data."));},[]);
  useEffect(()=>{const timer=window.setInterval(()=>setSeconds(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  const remaining=active?Math.max(0,active.plannedMinutes*60-Math.floor((seconds-new Date(active.startedAt).getTime())/1000)):minutes*60;
  const display=useMemo(()=>{const m=Math.floor(remaining/60);const s=remaining%60;return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");},[remaining]);
  async function start(){setBusy(true);try{const r=await apiRequest<{data:FocusSession}>("/focus",{method:"POST",body:JSON.stringify({taskId:taskId||null,plannedMinutes:minutes})});setActive(r.data);setSessions(current=>[r.data,...current]);setError("");}catch(e){setError(e instanceof Error?e.message:"Couldn't start a session.");}finally{setBusy(false);}}
  async function finish(status:"completed"|"abandoned"){if(!active)return;setBusy(true);try{const r=await apiRequest<{data:FocusSession}>("/focus/"+active.id,{method:"PATCH",body:JSON.stringify({status})});setSessions(current=>current.map(s=>s.id===r.data.id?r.data:s));setActive(null);setError("");}catch(e){setError(e instanceof Error?e.message:"Couldn't finish the session.");}finally{setBusy(false);}}
  const todaySessions=sessions.filter(s=>s.status==="completed"&&s.endedAt&&new Date(s.endedAt).toDateString()===new Date().toDateString());
  const todayMinutes=todaySessions.reduce((sum,s)=>sum+(s.actualMinutes??0),0);
  return <main className="life-page"><header className="life-page-header"><Link href="/" className="life-back"><ArrowLeft size={16}/> Workspace</Link><div><span className="life-eyebrow">ONE THING AT A TIME</span><h1>Focus</h1><p>Give one task your undivided attention.</p></div></header>{error&&<div className="life-error">{error}</div>}
    <section className="focus-layout"><div className="life-panel focus-main"><span className="life-eyebrow">{active?"SESSION IN PROGRESS":"MAKE SPACE FOR DEEP WORK"}</span><div className={"focus-clock "+(remaining===0&&active?"focus-finished":"")}>{display}</div><p>{active?(tasks.find(t=>t.id===active.taskId)?.title??"Focused work"):"Choose a task, set a duration and begin."}</p>{active?<div className="focus-actions"><button className="life-primary-button" disabled={busy} onClick={()=>void finish("completed")}><Check size={16}/>Finish session</button><button className="life-secondary-button" disabled={busy} onClick={()=>void finish("abandoned")}><Square size={15}/>End early</button></div>:<><label className="focus-select-label">Working on<select value={taskId} onChange={e=>setTaskId(e.target.value)}><option value="">Unlinked focus session</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><div className="focus-duration">{[15,25,45,60,90].map(value=><button key={value} className={minutes===value?"active":""} onClick={()=>setMinutes(value)}>{value} min</button>)}</div><button className="life-primary-button focus-start" disabled={busy} onClick={()=>void start()}><Play size={16}/>Start focusing</button></>}</div><div className="life-panel focus-stats"><div><span>Today</span><strong>{Math.floor(todayMinutes/60)}h {todayMinutes%60}m</strong><small>Focused time</small></div><div><span>Sessions</span><strong>{todaySessions.length}</strong><small>Completed today</small></div><div><span>Recent history</span><strong>{sessions.filter(s=>s.status==="completed").length}</strong><small>Completed sessions</small></div></div></section>
    <section className="life-panel"><div className="life-section-heading"><div><span className="life-eyebrow">YOUR RECENT WORK</span><h2>Session history</h2></div></div>{sessions.filter(s=>s.status!=="active").slice(0,12).map(s=><div className="focus-history-row" key={s.id}><span className="focus-history-icon"><Clock3 size={16}/></span><div><strong>{tasks.find(t=>t.id===s.taskId)?.title??"Focus session"}</strong><small>{new Date(s.startedAt).toLocaleString()}</small></div><span>{s.actualMinutes??s.plannedMinutes} min</span><em className={s.status==="completed"?"success":""}>{s.status}</em></div>)}{sessions.filter(s=>s.status!=="active").length===0&&<p className="life-empty">Your completed sessions will appear here.</p>}</section>
  </main>;
}
