"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Download, FileJson, ShieldCheck, Upload } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function IntegrationsPage(){
 const [importing,setImporting]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 async function importCalendar(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];if(!file)return;
  setImporting(true);setMessage("");setError("");
  try{const content=await file.text();const result=await apiRequest<{imported:number;skippedDuplicates:number}>("/import/calendar.ics",{method:"POST",body:JSON.stringify({content})});setMessage(result.imported+" events imported · "+result.skippedDuplicates+" duplicates skipped.");}
  catch(cause){setError(cause instanceof Error?cause.message:"Couldn't import that calendar.");}
  finally{setImporting(false);event.target.value="";}
 }
 return <main className="life-page"><header className="life-page-header"><Link href="/" className="life-back"><ArrowLeft size={16}/> Workspace</Link><div><span className="life-eyebrow">YOUR DATA, YOUR CHOICE</span><h1>Integrations & exports</h1><p>Bring your calendar in, or take your data with you.</p></div></header>
 {message&&<div className="life-notice">{message}</div>}{error&&<div className="life-error">{error}</div>}
 <section className="integration-grid"><article className="life-panel integration-card"><div className="integration-icon"><CalendarDays size={22}/></div><span className="life-eyebrow">CALENDAR</span><h2>Import a calendar</h2><p>Import events from an iCalendar (.ics) file exported by Google Calendar, Apple Calendar or Outlook. Existing events with the same title and start time are skipped.</p><label className="life-primary-link integration-file-label"><Upload size={16}/>{importing?"Importing…":"Choose .ics file"}<input type="file" accept=".ics,text/calendar" disabled={importing} onChange={importCalendar}/></label><a className="life-secondary-button" href="/api/v1/export/calendar.ics"><Download size={16}/>Download calendar (.ics)</a></article><article className="life-panel integration-card"><div className="integration-icon"><FileJson size={22}/></div><span className="life-eyebrow">PORTABILITY</span><h2>Full data backup</h2><p>Export your life areas, tasks, projects, goals, habits, notes, calendar, wellbeing entries and focus history as JSON.</p><a className="life-primary-link" href="/api/v1/export/data"><Download size={16}/>Download backup (.json)</a></article></section>
 <section className="life-panel integration-guide"><div className="integration-icon"><ShieldCheck size={22}/></div><div><span className="life-eyebrow">PRIVATE BY DEFAULT</span><h2>Your data stays yours</h2><p>Exports and imports are available only after signing in. Importing is limited to your calendar events; it won't overwrite existing records.</p><p><strong>Google Calendar:</strong> Export an .ics file from Google Calendar using Settings → Import & export. Then import it here. You can also import Sonder's .ics export back into Google Calendar.</p><p><strong>Apple Calendar:</strong> Export a calendar as .ics and import it here, or open Sonder's .ics export in Calendar.</p><p><strong>Outlook:</strong> Save your calendar as an .ics file and import it here. Outlook can also import Sonder's .ics file.</p></div></section>
 <p className="life-disclaimer">These are file-based integrations. Live two-way sync and automatic Google/Apple/Outlook connections are not configured yet and will require provider authorization and credentials.</p></main>;
}
