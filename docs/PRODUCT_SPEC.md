# Sonder — Product Specification

This document is the concise implementation-facing summary. The complete product rationale and experience rules live in PRODUCT_BLUEPRINT.md.

## Vision

Sonder is a personal life system that helps people understand what matters, organize what needs doing, and make room for the life they are building.

**Product promise:** Everything important has a place, relevant things are connected, and planning feels lighter—not like another job.

## Product principles

1. Clarity before completeness.
2. One life, connected records.
3. Action over reporting.
4. Human pace; no shame mechanics.
5. Progressive disclosure.
6. User agency and explicit consent.
7. Evidence before interpretation.
8. Privacy by default.
9. Quiet visual craft.
10. Desktop and mobile are first-class.

## Information architecture

### Primary destinations
- **Today:** daily briefing, agenda, next actions, quick capture, optional habits, relevant context.
- **Calendar:** events, deadlines, and scheduled work.
- **Organize:** Inbox, Tasks, Projects, Goals, Habits, and Life Areas.
- **Notes:** personal knowledge, pages, links, and references.

Global capabilities: search / command palette, quick capture, actionable notifications, profile and settings.

This is a navigation simplification, not removal of existing modules. Advanced areas remain discoverable inside Organize.

## Feature requirements

### Today
- Personal greeting and date.
- Quick capture without mandatory categorization.
- Factual day context: scheduled commitments, tasks due today, overdue items when relevant.
- Chronological agenda of events and time blocks.
- Short next-action list based on overdue, due-today, and urgent/high-priority tasks.
- Optional habits that are due today.
- Small upcoming-events and active-goals previews.
- Useful empty states; never fabricate work or insights.

### Inbox
- Fast capture of tasks, ideas, notes, links, and reminders.
- Convert to canonical records without losing content.
- Archive and process later.

### Tasks
- Title, description, status, priority, due date, recurrence, reminder.
- Optional relationships to project, goal, life area, parent task, and time block.
- Search, filters, and useful list/agenda views.
- No mandatory metadata.

### Projects
- Status, dates, life area, optional goal.
- Linked tasks, notes, events, milestones, and activity.
- Explainable progress; archive and restore.

### Calendar
- Month, week, and day views.
- Date-range loading for the visible period.
- Events, deadlines, and time blocks visually distinguished.
- Time-zone-safe event creation and editing.
- Never infer free capacity from incomplete data.

### Goals
- Long-term direction, target dates, milestones, and linked work.
- Progress must be explainable and must not double-count.

### Habits
- Flexible schedules, optional links to goals and life areas.
- Reversible check-ins and neutral history.
- No punitive streaks or failure states.

### Life Areas
- User-defined organizational contexts.
- Optional metadata, never mandatory folders.
- Task counts are not a measure of life balance.

### Notes
- Quick capture, pages, hierarchy, tags, favorites, templates, backlinks, search, and links to other records.
- Notes remain useful without relationships.

### Well-being and insights
Deferred until core data is reliable. Any future well-being experience is optional, non-medical, user-controlled, and explicit about self-reported versus imported data. Insights must show period, evidence, uncertainty, and useful context. No wellness score, diagnosis, AI therapist, or unsupported causal claim.

## Design system

- Obsidian #0B0B0F, lavender #A78BFA, warm neutral text.
- Existing DM Sans / Manrope typography.
- Restrained surfaces, quiet dividers, whitespace-led hierarchy.
- Avoid excessive cards, decorative charts, gamification, noisy gradients, and cramped dashboards.
- Purposeful motion; respect reduced-motion preferences.
- Accessible names, visible focus, readable contrast, usable touch targets.

## Technical constraints

- Preserve existing user data and current working modules.
- No new tables without a complete workflow and migration rationale.
- Enforce ownership on every read and mutation.
- Separate user-entered data from derived observations.
- Use date-only values for dates and timezone-aware instants for moments.
- Loading, empty, error, and retry states are required.
- No AI feature in this milestone.

## Definition of done

A feature needs a documented purpose, clear interaction, coherent relationships, validation, ownership checks, responsive behavior, accessible states, tests, and a review against PRODUCT_BLUEPRINT.md. Rendering successfully is not enough.
