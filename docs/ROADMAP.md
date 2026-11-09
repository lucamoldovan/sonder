# Sonder — Roadmap

This roadmap is ordered by dependencies and user value. Each phase should ship a coherent, testable experience.

## Phase 0 — Product & technical foundation
- [x] Confirm product name and visual direction
- [x] Define product vision and principles
- [x] Define feature catalogue and MVP boundary
- [ ] Confirm technical architecture
- [ ] Establish repository structure, linting, formatting, tests, and CI
- [ ] Establish design tokens and reusable UI primitives
- [ ] Define data model and migration strategy
- [ ] Define authentication, authorization, and privacy model

## Phase 1 — Core workspace (MVP)
- [ ] App shell and responsive navigation
- [ ] Authentication and user profile
- [ ] Life areas
- [ ] Universal Inbox and triage
- [ ] Tasks with priorities, status, dates, recurrence, and filters
- [ ] Projects with linked tasks and milestones
- [ ] Today dashboard
- [ ] Calendar with events and task time blocks
- [ ] Global search
- [ ] Persistence, sync, empty/error/loading states
- [ ] Import/export and account deletion

**Exit criteria:** A user can capture an item, turn it into a task, assign it to a life area/project, schedule it, complete it, and see the result reflected throughout the app on both desktop and mobile.

## Phase 2 — Personal systems
- [ ] Goals and milestones
- [ ] Habits and routines
- [ ] Notes and linked knowledge
- [ ] Focus sessions
- [ ] Reminders and notifications
- [ ] Weekly review and basic insights
- [ ] Dashboard customization

## Phase 3 — Sonder Intelligence
- [ ] AI natural-language capture
- [ ] Context-aware search and Q&A
- [ ] Daily plan proposals
- [ ] Workload and conflict detection
- [ ] Goal breakdown and project summaries
- [ ] Weekly review assistant
- [ ] Approval flow, change preview, and audit history
- [ ] AI privacy and usage controls

## Phase 4 — Integrations & automation
- [ ] Google Calendar sync
- [ ] Gmail capture
- [ ] Google Drive attachments
- [ ] Push notifications
- [ ] Health platform integrations
- [ ] Automation rules and triggers
- [ ] Voice capture
- [ ] Offline improvements and conflict resolution

## Phase 5 — Expansion
- [ ] Personal finance
- [ ] Subscription manager
- [ ] Reading and learning tracker
- [ ] Travel planner
- [ ] People / follow-up manager
- [ ] Document vault
- [ ] Life timeline and archive
- [ ] Optional sharing and accountability (only if product direction supports it)

## Delivery rule

Build vertically: complete one user workflow across UI, domain logic, persistence, validation, and tests before starting another large module. Avoid placeholder screens that look finished but do not work.
