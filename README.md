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

## Repository structure

```text
.
├── app/                    # Next.js web application and same-origin API route
├── apps/
│   ├── api/                # Hono API, Better Auth, Drizzle schema
│   └── mobile/             # Expo / React Native application
├── packages/
│   └── contracts/          # Shared Zod schemas and TypeScript types
├── docs/
│   ├── ARCHITECTURE.md
│   ├── FREE_STACK.md
│   ├── PRODUCT_SPEC.md
│   └── ROADMAP.md
└── lib/                    # Web API and auth clients
```

## Architecture

- Web + API hosting: Next.js on Vercel Hobby (personal, non-commercial use).
- API: Hono mounted at `app/api/[[...path]]/route.ts`, Node.js runtime.
- Mobile: Expo + React Native.
- Database: Neon Free PostgreSQL.
- ORM and migrations: Drizzle.
- Authentication: Better Auth (web cookies + Expo SecureStore).
- Shared contracts: Zod + TypeScript.
- AI: local Ollama only, planned after core workflows.
- Package manager: Bun workspaces.

See [Technical Architecture](docs/ARCHITECTURE.md), [Product Specification](docs/PRODUCT_SPEC.md), [Roadmap](docs/ROADMAP.md), and [Zero-cost plan](docs/FREE_STACK.md).

## Development

Requirements: Bun, Node.js compatible with the installed Next.js version, and a Neon Free PostgreSQL database.

Install dependencies:

```bash
bun install
```

Environment:

1. Copy `.env.example` to `.env.local`.
2. Create a Neon Free project and set `DATABASE_URL` to its pooled PostgreSQL connection string.
3. Generate a random `BETTER_AUTH_SECRET` (32+ bytes).
4. Keep `BETTER_AUTH_URL`, `WEB_APP_URL`, and `NEXT_PUBLIC_APP_URL` set to `http://localhost:3000` for local development.
5. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL` before running Drizzle Kit.

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Run the web app:

```bash
bun run dev:web
```

Run the native app:

```bash
bun run dev:mobile
```

Run web and mobile together:

```bash
bun run dev:all
```

The API is served by Next.js on the same origin. Health endpoint: `http://localhost:3000/api/health`.

Database migrations:

```bash
bun --cwd apps/api run db:generate
bun --cwd apps/api run db:migrate
```

For a physical Android phone, copy `apps/mobile/.env.example` to `apps/mobile/.env` and set `EXPO_PUBLIC_API_URL` to your computer's LAN IP on port 3000. Keep both devices on the same Wi-Fi network. The Android emulator uses `http://10.0.2.2:3000`.

## Current implementation status

- Web sign-up/sign-in UI is connected to Better Auth email/password sessions.
- Web tasks, projects, life areas, and Today dashboard read/write through the authenticated API.
- Universal Inbox supports capture, archive, and convert-to-task on web and mobile.
- Mobile sign-up/sign-in uses Better Auth and Expo SecureStore; Today tasks and Inbox triage use the same API.
- API CRUD exists for life areas, projects, tasks, and inbox items with validation and per-user ownership checks.
- Neon/Drizzle schema is scaffolded; migrations still need to be generated, reviewed, and applied against the user's database.
- Automated validation tests and GitHub Actions CI are configured but still need a successful run.

Real credentials must never be committed. Never enable a paid plan or usage-based billing for this project.
