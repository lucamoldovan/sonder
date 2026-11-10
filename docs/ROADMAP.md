# Sonder — Roadmap

This roadmap prioritizes user value and dependency order. It is intentionally selective: a smaller set of dependable workflows is better than a large set of disconnected features.

## Milestone A — Coherent daily experience (current)

- [x] Create isolated product branch from main
- [x] Review current product specification, architecture, web dashboard, API routes, and mobile entry point
- [x] Establish the product blueprint and feature non-goals
- [x] Redesign Today around agenda, next actions, quick capture, and relevant context
- [x] Load calendar data for the currently visible month/week/day range
- [x] Include earlier events from the current day in dashboard data
- [x] Make quick capture globally available on desktop and mobile
- [x] Replace mobile top tabs with persistent four-destination bottom navigation
- [x] Add a mobile day agenda with date navigation, event creation/deletion, and work-block scheduling
- [x] Add global mobile search across tasks, projects, goals, habits, events, and notes
- [x] Add task editing and status filters on desktop and mobile
- [x] Add project creation, editing, archive/restore, and linked-task workflows
- [x] Add goal editing and honest empty-progress states
- [x] Add mobile habit creation/archiving and preserve reversible weekly check-ins
- [x] Add mobile note editing and life-area creation/editing
- [ ] Review Today on narrow mobile and desktop breakpoints
- [ ] Verify event/time-block ordering and duplicate handling
- [ ] Verify calendar navigation across past and future periods
- [ ] Run the complete GitHub Actions quality gate on the final branch head
- [ ] Complete accessibility and interaction review

## Milestone B — Make existing modules feel like one product

- [x] Simplify navigation to Today, Calendar, Organize, and Notes without removing module capability
- [x] Make Organize a clear home for Inbox, Tasks, Projects, Goals, Habits, and Life Areas
- [ ] Ensure project, goal, task, habit, event, and note relationships are visible where useful
- [ ] Add project milestones and richer linked-work management
- [ ] Add saved task views and verify recurrence edge cases
- [x] Ensure note linking/backlinks are understandable and reliable
- [ ] Standardize loading, empty, error, retry, and success states
- [ ] Review mobile parity and touch interactions

## Milestone C — Trustworthy time and history

- [ ] Verify date-only versus timestamp semantics and daylight-saving transitions
- [ ] Ensure calendar range queries are bounded and indexed appropriately
- [ ] Review recurring task generation and reminder idempotency
- [ ] Make historical progress explainable and avoid double counting
- [ ] Add data export and account deletion workflows
- [ ] Add meaningful regression tests for cross-module relationships

## Milestone D — Personal context (only after data quality)

- [ ] Define reliable metrics and their evidence
- [ ] Build a weekly review based on real records
- [ ] Identify neglected goals without judgment
- [ ] Surface schedule patterns with time period and sample size
- [ ] Add optional, user-controlled well-being reflection only if it solves a clear user problem
- [ ] Keep self-reported and imported data separate
- [ ] Do not introduce scores, diagnoses, causal claims, or forced check-ins

## Milestone E — Intelligence and integrations (future)

- [ ] Revisit AI only after core workflows are excellent
- [ ] Any AI recommendation must explain source context and request approval before consequential changes
- [ ] Implement dedicated, read-only Google Calendar connection with shared-calendar selection and incremental sync
- [ ] Merge imported Google events into the agenda without duplicating native Sonder events
- [ ] Add mobile and web share targets that capture selected conversation content into Inbox
- [ ] Add safe task/event/note suggestions with confirmation and duplicate protection
- [ ] Evaluate platform integrations based on user demand and privacy
- [ ] No paid service or billing change without explicit product approval

## Release gate

A milestone is not ready for review until:
- The branch contains complete implementations, not placeholder UI.
- Existing functionality and user data are preserved.
- Tests, typechecks, lint, and builds have been run and results recorded.
- Key user workflows have been reviewed on web and mobile.
- Known limitations and required migrations are documented.
- The branch is pushed and available for review; it is not merged unless explicitly requested.

## Delivery rule

Build vertically. Finish a workflow across interface, API, validation, persistence, responsive behavior, and tests before expanding scope. Do not add features just because another application has them.
