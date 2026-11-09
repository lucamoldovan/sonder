# Sonder

**Your life, in perspective.**

Sonder is a personal life organization app designed to make it easier to see what matters without turning life into a productivity contest.

## Current milestone

- Responsive dark app shell
- Dashboard overview
- Task creation, editing, completion and deletion
- Life areas, priorities, due dates and recurring task settings
- Search and status/area filters
- Browser-local persistence

> Current task data is stored in the browser using localStorage. It is not synced between devices yet. Authentication and Cloudflare D1 sync are planned for a later milestone.

## Run locally

Requirements: Node.js 20.9+ (or a compatible current release) and npm, pnpm, yarn or Bun.

```bash
bun install
bun dev
```

Open http://localhost:3000.

## Stack

- Next.js App Router
- React + TypeScript
- CSS design system
- lucide-react icons

## Product principles

- Calm over noisy
- Useful over clever
- Flexible enough for real life
- Mobile and desktop are first-class
- AI should provide context, not another inbox