# Sonder — Product Specification

## 1. Vision

Sonder is a personal life operating system that helps people understand, organize, and improve how they use their time and attention. It connects responsibilities, projects, calendar events, habits, goals, notes, and personal knowledge in one coherent workspace.

**Product promise:** Everything important has a place, everything relevant is connected, and planning feels lighter—not like another job.

## 2. Product principles

1. **Clarity over density.** Show what matters now; keep secondary information discoverable.
2. **Connected by design.** A task can belong to a project, life area, goal, and calendar block.
3. **Human-paced productivity.** Make realistic plans, account for capacity, and avoid shame-based streak mechanics.
4. **AI with context and consent.** AI can recommend and prepare changes; it must explain consequential actions and ask before applying them.
5. **User ownership.** Provide export, deletion, transparent sync, and privacy controls.
6. **Responsive by default.** Desktop and mobile are first-class, with layouts adapted for each device.
7. **Progressive complexity.** Start simple; reveal advanced controls only when useful.

## 3. Information architecture

### Primary navigation
- Home
- Inbox
- Tasks
- Calendar
- Projects
- Goals
- Habits
- Notes
- Insights
- Sonder AI

### Supporting areas
- Life Areas
- Focus
- Routines
- Files & Attachments
- Search
- Templates
- Automations
- Settings

### Life areas
Users can create and customize areas such as School, Church, Projects, Personal, and Health. These are organizational contexts, not separate silos.

## 4. Feature catalogue

### A. Home / Today
- Today's agenda and time blocks
- Top priorities and due-soon tasks
- Quick capture
- Upcoming events and deadlines
- Habit/routine check-in
- Focus session launcher
- Contextual AI suggestions
- Workload and available-time overview
- Customizable, reorderable widgets
- Daily wrap-up

### B. Universal Inbox
- Capture a task, idea, note, link, event, or reminder in seconds
- Quick-add from keyboard and mobile
- Process later: convert, categorize, schedule, link, archive
- Inbox triage and bulk actions
- Optional voice capture in a later phase

### C. Tasks
- Tasks, subtasks, descriptions, checklists
- Status, priority, due date, start date, estimate
- Life area, project, goal, tags, and relationships
- Recurrence and reminders
- List, board, and agenda views
- Filters, sorting, saved views
- Dependencies and waiting-on status (advanced)
- Completion history and archive

### D. Projects
- Project overview, status, dates
- Linked tasks, notes, files, goals, and events
- Milestones and progress
- Project templates
- Activity history
- Archive and restore

### E. Calendar & Time
- Day, week, and month views
- Events and task time blocks
- Deadlines and reminders
- Drag-to-reschedule
- Availability and conflict detection
- Time estimates and actual focus time
- External calendar sync (Google Calendar first; other providers later)
- Time-zone-aware events

### F. Goals & Milestones
- Long-term and short-term goals
- Milestones and measurable outcomes
- Linked projects, tasks, and habits
- Progress history
- Review cadence and target dates
- Goal templates

### G. Habits, Routines & Health
- Flexible habit schedules
- Morning/evening and custom routines
- Check-ins and history
- Consistency heatmap (not streak pressure)
- Optional sleep, workout, water, and activity tracking
- Health platform integrations only with explicit consent

### H. Notes & Personal Knowledge
- Quick notes and structured pages
- Rich text / Markdown
- Folders, tags, backlinks, and relations
- Notes linked to tasks, projects, goals, and events
- Search and attachments
- Reusable templates
- Decision journal and daily reflections

### I. Focus
- Focus timer and distraction-free task view
- Session linked to a task or project
- Breaks and configurable session lengths
- Manual and automatic time tracking
- Session history and focus trends

### J. Sonder AI
- Natural-language capture and search
- Ask questions across the user's permitted Sonder data
- Daily planning and schedule proposals
- Break large goals into steps
- Detect overload, conflicts, and neglected priorities
- Summarize projects and prepare weekly reviews
- Explain recommendations and show source context
- Confirm before creating, editing, moving, or deleting user data
- User controls for AI access, history, and data retention

### K. Insights & Reviews
- Daily and weekly review
- Completed work and carried-over work
- Time distribution and focus trends
- Goal and habit progress
- Workload patterns and capacity
- Actionable, non-judgmental recommendations
- User-selectable reporting periods

### L. Platform capabilities
- Global search
- Command palette (Cmd/Ctrl+K)
- Keyboard shortcuts
- Notifications and reminders
- Import/export and account deletion
- Offline-friendly capture and sync conflict handling
- Accessibility, reduced motion, and responsive layouts
- Customizable dashboard and themes
- Templates and automation rules
- Secure file attachments

### M. Later expansions
- Lightweight income/expense and budget tracking
- Subscription tracking
- Reading and learning tracker
- Travel planning
- People and follow-up manager
- Personal document vault
- Life timeline / memories archive
- Optional sharing and accountability

## 5. Core entities and relationships

Initial domain model:
- User
- LifeArea
- InboxItem
- Task
- ChecklistItem
- Project
- Goal
- Milestone
- Habit
- HabitEntry
- Routine
- RoutineStep
- CalendarEvent
- TimeBlock
- Note
- Tag
- Attachment
- FocusSession
- Reminder
- ActivityEvent
- AIProposal
- IntegrationConnection

Core relationships:
- A user owns life areas and all personal records.
- Tasks may link to a project, goal, life area, event/time block, note, and tags.
- Projects contain tasks and may link to goals, notes, files, and events.
- Goals contain milestones and may link to projects, tasks, and habits.
- Notes can link to any supported record.
- Focus sessions can link to tasks/projects.
- Inbox items are converted into canonical records or archived.
- AI proposals reference the records they intend to change and require user approval before applying changes.

## 6. AI behavior and safety

- AI access is scoped to the user's data and enabled integrations.
- Distinguish observed facts from estimates and suggestions.
- Never silently reschedule, delete, or materially alter records.
- Present a preview/diff for multi-record changes.
- Require confirmation for consequential actions.
- Keep an auditable history of AI-applied changes.
- Allow users to disable AI access to specific areas or integrations.
- Make data retention and provider processing transparent.

## 7. MVP definition

MVP must deliver one coherent end-to-end workflow:
1. Create an account and persist user data.
2. Create and process Inbox items.
3. Create tasks with status, priority, due date, and life area.
4. Group tasks into projects.
5. See tasks and events in a usable Today/calendar view.
6. Use a responsive dashboard on desktop and mobile.
7. Search and filter core records.
8. Provide reliable sync, loading, empty, error, and offline states.

Do not ship finance, social networking, advanced automations, or broad health tracking in the first release.

## 8. Initial design system

- Background: Obsidian `#0B0B0F`
- Accent: Lavender `#A78BFA`
- Text: warm ivory / high-contrast neutral
- Surfaces: charcoal, subtle translucency, quiet borders
- Typography: Inter
- Shape language: restrained 14–20px radii
- Motion: subtle, purposeful, reduced-motion aware
- Avoid: excessive cards, noisy gradients, gamification, decorative charts, cramped dashboards

## 9. Open technical decisions

The following must be finalized before committing implementation architecture:
- Web/mobile strategy and shared-code boundaries
- Frontend framework and monorepo structure
- Backend/API and database
- Authentication provider
- Hosting and deployment
- Offline-first and synchronization strategy
- AI provider, model routing, and cost controls
- File storage and notification infrastructure
- Calendar integration strategy

Evaluate options against cross-platform quality, maintainability, privacy, cost, and the ability to ship a reliable MVP.
