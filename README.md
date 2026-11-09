# Sonder

**Your life, in perspective.**

Sonder is a personal life operating system: one calm, connected workspace for responsibilities, projects, time, habits, goals, notes, and personal growth.

## Product principles

- Calm by default: minimal, dark-first, and focused.
- Connected, not fragmented: tasks, projects, notes, goals, and events share context.
- Useful intelligence: AI helps plan and reason over a user's own context, with permission before consequential changes.
- Realistic productivity: support sustainable planning rather than maximizing task counts.
- Multi-device: desktop and mobile are first-class experiences.
- User-owned data: clear privacy controls, export, and deletion.

## Brand

- Name: Sonder
- Tagline: Your life, in perspective.
- Visual direction: clean, minimal, Apple-inspired
- Theme: dark-first
- Background: Obsidian `#0B0B0F`
- Accent: Lavender `#A78BFA`
- Typography: Inter
- Logo: abstract geometric symbol + wordmark

## Current implementation

The repository contains an early Next.js App Router + React + TypeScript prototype. It currently includes a responsive dashboard and task management backed by browser localStorage. Calendar, Insights, and Settings are preliminary views; cloud sync, authentication, projects, and the full product architecture are not implemented yet.

## Product documents

- [Product specification](docs/PRODUCT_SPEC.md)
- [Roadmap](docs/ROADMAP.md)

## Run locally

Requirements: Node.js 20.9+ and Bun (or npm/pnpm/yarn).

```bash
bun install
bun dev
```

Open http://localhost:3000.

## Current stack

- Next.js App Router
- React + TypeScript
- CSS design system
- lucide-react

The long-term web/mobile architecture, backend, database, authentication, hosting, sync, and AI provider are still to be finalized.
