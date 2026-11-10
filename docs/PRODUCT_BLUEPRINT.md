# Sonder — Product Blueprint

**Status:** Product direction for the Apple-inspired life-system milestone  
**Audience:** Product, design, engineering  
**North star:** Help a person understand what matters, organize what needs doing, and make room for the life they are building.

## 1. Product definition

Sonder is a personal life system, not a task manager with extra tabs. It connects the user's commitments, plans, projects, goals, habits, notes, and calendar so they can see their life as one coherent whole.

**Product promise:** Sonder quietly handles the structure and connections, so the person can spend less energy managing an app and more energy living their life.

The product succeeds when it reduces mental load and helps someone make a better next decision. It does not succeed merely because the user creates more records, checks more boxes, or spends more time inside the app.

### The daily question

Every primary experience should help answer:

**What matters today?**

Supporting questions:
- What have I committed to?
- What genuinely needs my attention?
- What am I moving forward?
- What am I neglecting that I still care about?
- Where do I need to leave room?

## 2. Product principles

1. **Clarity before completeness.** Surface the few things that matter now; keep the rest accessible.
2. **One life, connected records.** A task, project, goal, event, habit, and note are different views of related information—not separate silos.
3. **Action over reporting.** Measurements are useful only when they help the user understand or act.
4. **Human pace.** Plans must accommodate rest, change, uncertainty, and difficult weeks.
5. **No shame mechanics.** No punitive streaks, red failure states, artificial productivity scores, or guilt-based copy.
6. **Progressive disclosure.** Common actions are immediate; advanced controls appear when relevant.
7. **User agency.** Sonder may explain and recommend. It never silently makes consequential changes.
8. **Evidence and uncertainty.** Separate user-entered facts, imported measurements, derived observations, and suggestions.
9. **Privacy by default.** Collect only what creates clear value. Well-being information is especially sensitive.
10. **Quiet craft.** Visual polish, motion, and notifications must serve comprehension or action.

## 3. Information architecture

### Primary destinations

Use four clear destinations as the long-term navigation model:

- **Today** — daily briefing, agenda, next actions, quick capture, optional habits, relevant context.
- **Calendar** — time, events, deadlines, and scheduled work.
- **Organize** — a single home for Inbox, Tasks, Projects, Goals, Habits, and Life Areas.
- **Notes** — personal knowledge, quick notes, linked pages, and references.

Global capabilities:
- Search / command palette (Cmd/Ctrl+K)
- Quick capture available from every primary destination
- Notifications only for actionable, timely events
- Profile and settings

On desktop, use a compact persistent sidebar. On mobile, use a small bottom navigation and keep quick capture reachable. Do not force desktop navigation patterns onto mobile.

The four-destination model is a navigation simplification, not a removal of existing capabilities. Existing modules remain accessible inside Organize.

## 4. Today — the central experience

Today is the product's most important screen. It is a briefing, not a metrics dashboard.

### Information order

1. **Personal greeting and date.** Calm, human, no motivational slogan required.
2. **Quick capture.** One field that gets an item out of the user's head without requiring categorization.
3. **Day context.** A concise factual line: scheduled commitments, tasks due today, and overdue items only when relevant.
4. **Today's agenda.** Calendar events and time blocks, chronologically ordered, with clear times and direct edit/navigation actions.
5. **Next actions.** A short list selected from overdue tasks, due-today tasks, and genuinely high/urgent tasks. Never fill the list with arbitrary low-priority work just to avoid an empty state.
6. **Optional habits.** Only show active habits that are due today. A check-in is reversible and never treated as a failure when missed.
7. **Coming up.** A small preview of the next few future events.
8. **Goals in progress.** A small reminder of longer-term direction, not a second project dashboard.
9. **Inbox entry point.** Show how many items are waiting to be sorted and let the user process them later.

### Content rules

- Hide empty sections when their absence is not meaningful; use a quiet empty state when it helps the user understand the day.
- Do not show open-task totals as the main success metric.
- Do not show lifetime completed-task totals on Today.
- Do not infer availability from incomplete calendar data.
- Do not tell the user a day is overloaded unless the data supports that statement.
- Any recommendation must name the evidence behind it and remain optional.
- A clear day is a valid outcome. Do not invent tasks or insights to fill space.

### Today acceptance criteria

- The first viewport answers what is happening today and what needs attention.
- Calendar events and time blocks are represented without duplication.
- Earlier events today remain visible after their start time.
- Overdue work is visible but not alarmist.
- Completing a task updates the list immediately and persists.
- Quick capture works without leaving Today.
- Every visible action has a working destination or mutation.
- The screen remains useful with no events, no tasks, no habits, or no goals.
- Layout works at narrow mobile widths and desktop widths.

## 5. Calendar — understand time, not just dates

Calendar combines user-created events, task deadlines, and scheduled work blocks. These are visually distinguishable and never mistaken for each other.

Required behavior:
- Month, week, and day views
- Date-range loading based on the visible range
- Clear all-day and timed event treatment
- Time-zone-safe storage and display
- Event creation, editing, deletion
- Time-block creation, movement, and removal
- Deadlines shown as deadlines, not fabricated events
- Empty/loading/error states
- Calendar range navigation must load past and future data rather than relying on a dashboard's limited upcoming-event list

Do not claim free time or schedule capacity until overlapping events, time blocks, and relevant constraints are accounted for.

## 6. Organize — connected personal systems

### Inbox
Purpose: capture first, decide later.
- Capture in one short interaction.
- Convert to task, note, or event without losing the original content.
- Archive intentionally.
- Show a clear empty state.
- Avoid mandatory triage workflows.

### Tasks
Purpose: make the next action clear.
- Title, description, status, priority, due date, recurrence, reminder.
- Optional relationships to project, goal, life area, parent task, and time block.
- List and calendar/agenda perspectives.
- Search and filters that remain understandable.
- Completion is reversible where safe.
- Do not make every task require a project, goal, priority, or due date.

### Projects
Purpose: coordinate a meaningful body of work.
- Name, description, status, dates, life area, optional goal.
- Linked tasks, notes, events, milestones, and activity.
- Progress based on defined work (tasks/milestones), with the denominator visible.
- Empty projects should offer a useful next action, not fake progress.
- Archive and restore should preserve history.

### Goals
Purpose: maintain direction over time.
- Clear title, optional description, target date, life area, status.
- Milestones and linked projects/tasks/habits.
- Progress must be explainable and must not double-count the same work.
- A goal with no measurable linked activity should not display a fabricated percentage.

### Habits
Purpose: support chosen repetition, not enforce perfection.
- Flexible schedules and optional life-area/goal relationships.
- Check-in history and consistency trends.
- Missed days are neutral; no punitive streak reset.
- Only surface habits that are due and relevant.
- Check-ins are user-controlled and reversible.

### Life Areas
Purpose: organize by meaningful contexts such as learning, work, family, faith, or personal life.
- User-defined names, colors, and ordering.
- Areas are optional metadata, not mandatory folders.
- Never derive a person's well-being or life balance from task counts alone.

## 7. Notes — personal knowledge

Notes should be useful as a quiet place to think and remember:
- Fast capture and editing
- Pages, hierarchy, tags, favorites, templates
- Links to tasks, projects, goals, and events
- Backlinks that help discover relationships
- Search across titles and content
- Clear autosave/save status
- No feature should make note-taking feel like database administration

A note should remain useful without being linked to anything.

## 8. Well-being — a later, optional layer

Well-being is not a medical product, diagnosis, therapy substitute, or score.

If introduced, it should be a small optional reflection system:
- Brief self-reported mood/state-of-mind check-in
- Optional energy and stress reflection
- Optional contextual factors selected by the user
- History and trends shown over time
- Explicit distinction between self-report and imported sensor data
- User-controlled deletion, export, and visibility

Potential observations may connect user-reported check-ins with observable schedule patterns, but must use cautious language:
- Say “you reported lower energy on days with more scheduled commitments” only when sufficient records support it.
- Never say the schedule caused the user's mood.
- Show sample size and period when presenting a pattern.
- Say when there is not enough data.
- Offer a practical, optional next step rather than a diagnosis.

Do not add health integrations, sleep tracking, biometrics, wellness scores, mental-health questionnaires, or an AI therapist in this milestone. Do not collect sensitive information simply to make the dashboard look intelligent.

## 9. Insights — earn the right to interpret

Insights should be introduced only after the underlying data is reliable and historical coverage is sufficient.

A useful insight has:
- A clear observation
- A defined time period
- The source records or calculation behind it
- Appropriate uncertainty
- A relevant next step, if one exists

Good examples:
- “You completed 4 of the 6 tasks linked to this project this week.”
- “Your learning goal has no completed linked activity in the last 14 days.”
- “You have 5 scheduled commitments tomorrow.”

Bad examples:
- “Your productivity is 82%.”
- “You are unbalanced.”
- “You are burned out.”
- Any causal or psychological claim inferred from task counts.

No insight is better than a fabricated insight.

## 10. Design direction

### Visual language
- Obsidian background: #0B0B0F
- Lavender accent: #A78BFA
- Warm high-contrast text and muted secondary text
- Restrained charcoal surfaces
- Thin, quiet dividers
- DM Sans / Manrope typography already in the product
- Rounded surfaces only when they communicate grouping or interaction
- Avoid card grids as the default layout
- Avoid decorative gradients, noisy glows, and excessive uppercase labels

### Layout
- Let typography and whitespace create hierarchy.
- Use continuous page surfaces with section dividers.
- Reserve elevated panels for independent, actionable groups.
- Keep primary actions predictable and near the content they affect.
- Mobile layouts should reflow naturally, not shrink desktop columns.

### Motion and accessibility
- Motion communicates state changes and spatial relationships.
- Respect prefers-reduced-motion.
- All controls need accessible names and visible focus states.
- Do not rely on color alone to convey status.
- Maintain readable contrast and usable touch targets.

## 11. Notifications

Notifications are for timely, actionable information only:
- A reminder the user explicitly requested
- An upcoming commitment that needs preparation
- A meaningful state change the user opted into

No engagement nudges, streak warnings, generic motivational messages, or repeated notifications for unchanged information. Users control notification categories and quiet hours.

## 12. Data, trust, and technical boundaries

- Existing user records must be preserved.
- Every query and mutation must enforce ownership.
- Do not introduce new tables without a defined user-facing workflow and migration plan.
- Preserve timestamps and history when changing relationships.
- Distinguish user-entered data from computed values.
- Avoid duplicate sources of truth.
- Use date-only values for date-only concepts and timezone-aware instants for moments.
- Visible calendar ranges must load their own data.
- Loading, empty, error, and retry states are part of the feature—not polish to add later.
- Never claim an integration exists before it is connected and tested.
- No AI feature in this milestone.

## 13. Explicit non-goals

Do not build in this milestone:
- A gamified productivity score
- Mood streaks or forced check-ins
- A medical or mental-health dashboard
- Social feeds, likes, or leaderboards
- Finance, subscription, or document-vault modules
- A complex focus timer just because competitors have one
- AI chat or automatic planning
- Dashboard widget customization before the default experience is excellent
- Duplicate task/project/note workspaces

## 14. Definition of done

A feature is ready only when:
1. Its user problem and purpose are written down.
2. It fits the information architecture.
3. It has a clear primary action and a sensible empty state.
4. Its data model and relationships are understood.
5. Validation and ownership checks are in place.
6. Loading, error, success, and empty states are implemented.
7. Desktop and mobile behavior are considered.
8. Accessibility and reduced-motion behavior are checked.
9. Tests cover meaningful logic and regressions.
10. The implementation has been reviewed against this blueprint.

A feature that merely renders is not finished.
