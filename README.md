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

## Repository structure

```text
.
├── app/                    # Next.js web application and same-origin API route
├── apps/
│   ├── api/                # Hono API, Better Auth, Drizzle schema
│   └── mobile/             # Expo / React Native
├── packages/
│   └── contracts/          # Shared Zod schemas and TypeScript types
├── docs/                   # Product, architecture, roadmap, and free-stack docs
└── lib/                    # Web API and auth clients
```

## Architecture

- Web + API: Next.js 15 App Router + Hono, deployed to Cloudflare Workers with OpenNext.
- Database: Supabase Free PostgreSQL, accessed in production through Cloudflare Hyperdrive.
- ORM: Drizzle ORM + Drizzle Kit.
- Authentication: Better Auth email/password with Expo support.
- Mobile: Expo SDK 55 + React Native.
- Shared contracts: Zod + TypeScript.
- AI: local Ollama only, planned after core workflows.
- Package manager: Bun workspaces.

The web app and API share one origin. The mobile app calls the same Cloudflare Worker URL. Production database credentials stay inside Hyperdrive and are never shipped to clients.

## Development

Requirements: Bun 1.2.15, Node.js 24, and a Supabase PostgreSQL project.

Install dependencies:

```bash
bun install
```

Local environment:

1. Copy the root `.env.example` to `.env.local`.
2. Set `DATABASE_URL` to your Supabase connection string and generate a random `BETTER_AUTH_SECRET`.
3. Keep `BETTER_AUTH_URL` and `WEB_APP_URL` set to `http://localhost:3000`.
4. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL` there too. Use Supabase's session pooler if your local network does not support IPv6.

Generate and apply the initial database migrations:

```bash
bun --cwd apps/api run db:generate
bun --cwd apps/api run db:migrate
```

Run the web app:

```bash
bun run dev:web
```

Run the native app:

```bash
bun run dev:mobile
```

Run both:

```bash
bun run dev:all
```

The API is served from the web app's same origin. Health endpoints:

- `/api/health` — Worker/API is responding.
- `/api/health/database` — Hyperdrive can reach PostgreSQL and the Better Auth user table exists.

## Cloudflare deployment

The repository is configured for Cloudflare Workers Builds:

- Root directory: `/`
- Production branch: `main`
- Build command: `bunx opennextjs-cloudflare build`
- Deploy command:

```bash
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://placeholder:placeholder@127.0.0.1:5432/placeholder bunx opennextjs-cloudflare deploy -- --keep-vars
```

The placeholder connection string is only used by OpenNext's deployment-time local binding proxy. It is not a production database credential. The deployed Worker uses the real Hyperdrive binding configured in `wrangler.jsonc`.

Set these runtime values in Cloudflare **Settings → Variables and Secrets**:

- Secret: `BETTER_AUTH_SECRET` (at least 32 characters of high-entropy random data).
- Variable: `BETTER_AUTH_URL` = the production Worker origin.
- Variable: `WEB_APP_URL` = the same production Worker origin.
- Variable: `ENVIRONMENT` = `production`.
- Optional Google OAuth: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Do not put database passwords in build variables or source control. Production database access is through the `HYPERDRIVE` binding.

## Current implementation status

- Web sign-up/sign-in UI is connected to Better Auth email/password sessions.
- Web tasks, projects, life areas, and Today dashboard use the authenticated API.
- Universal Inbox supports capture, archive, and convert-to-task on web and mobile.
- API CRUD exists for life areas, projects, tasks, and inbox items with validation and per-user ownership checks.
- Cloudflare/OpenNext build succeeds in Workers Builds; production deployment and live database/auth smoke tests still need to be confirmed.
- The initial Drizzle migration must be generated and applied to the Supabase database before sign-up can work.

Real credentials must never be committed. Never enable a paid plan or usage-based billing for this project.
