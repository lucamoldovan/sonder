# Sonder — Roadmap

This roadmap is ordered by dependencies and user value. Each phase should ship a coherent, testable experience.

## Phase 0 — Product & technical foundation
- [x] Confirm product name and visual direction
- [x] Define product vision and principles
- [x] Define feature catalogue and MVP boundary
- [x] Confirm web/mobile strategy: Next.js + Expo + shared TypeScript packages
- [x] Define backend: Hono on Cloudflare Workers
- [x] Define database: Neon PostgreSQL + Drizzle
- [x] Define authentication: Better Auth with Expo support
- [x] Scaffold API Worker and health endpoint
- [x] Add initial PostgreSQL schema for auth, life areas, projects, and tasks
- [x] Add shared task contracts
- [x] Scaffold Expo mobile application
- [ ] Install dependencies and verify all workspaces
- [ ] Generate and review initial Drizzle migration
- [ ] Configure a development Neon database and local secrets
- [ ] Run API and auth smoke tests
- [ ] Establish CI, formatting, and automated tests

## Phase 1 — Core workspace (MVP)
- [ ] App shell and responsive navigation
- [ ] Authentication UI and verified account flows
- [x] Life areas CRUD API and ownership enforcement
- [ ] Life areas web/mobile UI
- [ ] Universal Inbox and triage
- [x] Initial tasks API CRUD with validation and ownership checks
- [x] Projects API CRUD with life-area ownership validation
- [x] Shared contract tests and workspace typecheck scripts
- [x] GitHub Actions CI workflow
- [ ] Tasks web/mobile UI with priorities, status, dates, recurrence, and filters
- [ ] Projects CRUD with linked tasks and milestones
- [ ] Today dashboard backed by the API
- [ ] Calendar with events and task time blocks
- [ ] Global search
- [ ] Reliable sync and loading/error/empty states
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
