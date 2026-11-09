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
- File storage: Cloudflare R2 (planned when attachments are implemented)
- Package manager: Bun workspaces

See [Technical Architecture](docs/ARCHITECTURE.md), [Product Specification](docs/PRODUCT_SPEC.md), and [Roadmap](docs/ROADMAP.md).

## Development

Requirements: Bun, Node.js compatible with the installed Next.js version, and a Neon PostgreSQL database for authenticated API/database work.

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

See `.env.example` and `apps/api/.dev.vars.example`. Real credentials must never be committed. Production Cloudflare secrets and Neon resources must be configured separately.

## Current implementation status

- Existing web dashboard and local task prototype are preserved.
- API Worker scaffold and health endpoint are in place.
- Better Auth + Neon + Drizzle configuration is scaffolded; it needs a real database URL and generated/applied migrations before authentication can run.
- Initial product schema covers users, life areas, projects, and tasks.
- Authenticated CRUD APIs exist for life areas, projects, and tasks, with request validation and user-ownership checks.
- Expo native app shell is scaffolded.
- Shared Zod contracts and initial validation tests are in place.
- GitHub Actions CI checks workspace types, shared contracts, the web build, and API Worker bundling.
