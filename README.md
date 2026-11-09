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
├── app/                    # Existing Next.js web application
├── apps/
│   ├── api/                # Hono API on Cloudflare Workers
│   └── mobile/             # Expo / React Native application
├── packages/
│   └── contracts/          # Shared Zod schemas and TypeScript types
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PRODUCT_SPEC.md
│   └── ROADMAP.md
└── lib/                    # Existing web prototype utilities
```

The web prototype remains at the repository root for now so we can preserve the existing work while the monorepo foundation is established.

## Architecture

- Web: Next.js App Router
- Mobile: Expo + React Native
- API: Hono on Cloudflare Workers
- Database: Neon PostgreSQL
- ORM and migrations: Drizzle
- Authentication: Better Auth (web cookies + Expo secure session storage)
- Shared contracts: Zod + TypeScript
- File storage: local initially; free-quota storage only if needed
- Package manager: Bun workspaces

See [Technical Architecture](docs/ARCHITECTURE.md), [Product Specification](docs/PRODUCT_SPEC.md), [Roadmap](docs/ROADMAP.md), and [Zero-cost plan](docs/FREE_STACK.md).

## Development

Requirements: Bun, Node.js compatible with the installed Next.js version, and a Neon Free PostgreSQL database for authenticated API/database work.

Install dependencies:

```bash
bun install
```

Run the web app:

```bash
bun run dev:web
```

Run the API:

1. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`.
2. Add `DATABASE_URL` and a generated `BETTER_AUTH_SECRET`.
3. Run:

```bash
bun run dev:api
```

Run the native app:

```bash
bun run dev:mobile
```

Run all three applications together:

```bash
bun run dev:all
```

Run all three applications with `bun run dev:all`. This starts the root Next.js app, API Worker, and Expo development server concurrently.

The API health endpoint is `http://localhost:8787/health`.

Database migrations:

```bash
bun --cwd apps/api run db:generate
bun --cwd apps/api run db:migrate
```

Drizzle Kit runs from the API workspace. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL` before generating or applying migrations. Wrangler uses the separate `apps/api/.dev.vars` file.

## Environment and secrets

For a physical Android phone, copy `apps/mobile/.env.example` to `apps/mobile/.env` and set `EXPO_PUBLIC_API_URL` to your computer's LAN IP (for example `http://192.168.1.20:8787`). Keep the phone and computer on the same Wi-Fi network. The Android emulator uses `http://10.0.2.2:8787`.

The approved zero-cost stack and provider limits are documented in [FREE_STACK.md](docs/FREE_STACK.md).



See `.env.example` and `apps/api/.dev.vars.example`. Real credentials must never be committed. Production Cloudflare secrets and Neon resources must be configured separately.

## Current implementation status

- Web sign-up/sign-in UI is connected to Better Auth email/password sessions.
- Web tasks, projects, life areas, and Today dashboard read/write through the authenticated API.
- Universal Inbox supports capture, archive, and convert-to-task.
- Mobile sign-up/sign-in uses Better Auth and Expo SecureStore; Today tasks and Inbox capture use the same API.
- API CRUD exists for life areas, projects, tasks, and inbox items with validation and per-user ownership checks.
- Neon/Drizzle schema and Better Auth are scaffolded; migrations still need to be generated, reviewed, and applied against the user's database.
- Automated validation tests and GitHub Actions CI are configured but still need a successful run.
