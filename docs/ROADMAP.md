# Sonder — Roadmap

This roadmap is ordered by dependencies and user value. Each phase should ship a coherent, testable experience.

## Phase 0 — Product & technical foundation
- [x] Confirm product name and visual direction
- [x] Define product vision and principles
- [x] Define feature catalogue and MVP boundary
- [x] Confirm web/mobile strategy: Next.js + Expo + shared TypeScript packages
- [x] Define backend: Hono API mounted in Next.js
- [x] Select Cloudflare Workers Free + OpenNext for web/API hosting
- [x] Select Supabase Free PostgreSQL + Cloudflare Hyperdrive
- [x] Define authentication: Better Auth with Expo support
- [x] Scaffold Hono API and health endpoints
- [x] Add PostgreSQL schema for auth, life areas, projects, tasks, and inbox
- [x] Add shared task contracts
- [x] Scaffold Expo mobile application
- [ ] Commit Bun lockfile and verify frozen installs
- [x] Generate and commit initial Drizzle migration\n- [ ] Apply initial Drizzle migration to Supabase
- [ ] Configure Cloudflare runtime variables and Better Auth secret
- [ ] Complete first production deployment
- [ ] Run production database, signup, signin, session, and CRUD smoke tests
- [ ] Verify Worker CPU usage stays within the Free plan limit
- [x] Configure GitHub Actions CI and shared contract tests

## Phase 1 — Core workspace (MVP)
- [x] Responsive web workspace shell and native Today workspace
- [x] Email/password sign-up and sign-in UI on web and mobile
- [ ] Email verification and password reset (requires free email setup or a later decision)
- [x] Life areas CRUD API and ownership enforcement
- [x] Web default life-area setup and life-area API CRUD
- [ ] Native life-area navigation and project views
- [x] Universal Inbox API, web capture, archive, and convert-to-task flow
- [x] Mobile quick capture, archive, convert-to-task, and shared inbox sync
- [x] Initial tasks API CRUD with validation and ownership checks
- [x] Projects API CRUD with life-area ownership validation
- [x] Shared contract tests and workspace typecheck scripts
- [x] GitHub Actions CI workflow
- [x] Zero-cost provider policy documented
- [x] Web task creation, completion, deletion, priorities, and due dates
- [x] Native Today task list, completion toggle, and shared cloud data
- [x] Basic project creation/listing UI backed by the API
- [x] Today dashboard backed by the API on web and mobile
- [ ] Project editing, archive, milestones, and linked-task management
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
