# Sonder — Technical Architecture

## Decision

Sonder is a TypeScript monorepo with a Next.js web application, an Expo native application, one Hono API, and one PostgreSQL database.

### Applications

- **Web:** Next.js App Router at the repository root.
- **Mobile:** Expo + React Native in `apps/mobile`.
- **API:** Hono in `apps/api`, mounted by `app/api/[[...path]]/route.ts` and executed through the OpenNext Node.js compatibility runtime on Cloudflare Workers.

### Backend services

- **Hosting:** Cloudflare Workers Free, using the OpenNext Cloudflare adapter.
- **Database:** Supabase Free PostgreSQL.
- **Database connectivity:** Cloudflare Hyperdrive, bound as `HYPERDRIVE`. Production uses Supabase's direct database connection string; Hyperdrive provides connection pooling.
- **ORM/migrations:** Drizzle ORM + Drizzle Kit, using `pg@8.16.3`.
- **Authentication:** Better Auth email/password with the Expo client plugin.
- **File storage:** not enabled yet.
- **AI:** optional local Ollama integration after core workflows exist. No paid inference API.

The app uses one public origin for web and API. Native clients call the same Worker URL. Clients never connect directly to PostgreSQL and never receive database credentials.

## Cloudflare constraints

Workers Free currently allows 100,000 requests per day and 10 ms CPU time per HTTP request. Hyperdrive Free currently allows 100,000 database statements per day and approximately 20 origin database connections per configuration. Network waits do not count toward Worker CPU time, but CPU-heavy authentication and server rendering do.

Better Auth's default pure-JavaScript scrypt fallback can exceed the Workers Free CPU budget. Sonder therefore explicitly uses Node's native `node:crypto.scryptSync` with Better Auth's default scrypt parameters and compatible stored-hash format. This avoids the pure-JavaScript fallback, but actual signup/sign-in CPU usage must still be measured in the deployed Worker.

Do not silently switch to a paid Workers plan. If real-world CPU metrics show the free limit is insufficient, stop and discuss the trade-off before enabling billing.

## Request flow

1. Web calls same-origin `/api/*` routes.
2. Native calls the same Worker origin configured by `EXPO_PUBLIC_API_URL`.
3. The Next.js catch-all route obtains Cloudflare bindings using `getCloudflareContext({ async: true })` and passes them to Hono.
4. Hono validates inputs and derives user identity from the verified Better Auth session.
5. Drizzle queries PostgreSQL through a fresh `pg.Client` connected to Hyperdrive.
6. Hyperdrive manages pooled origin connections to Supabase.

Create database clients inside each Worker request. Do not keep clients or pools in module scope. Hyperdrive cleans up the Worker-side connection at the end of the invocation; local Node development explicitly closes its client.

## Authentication and sessions

- Better Auth owns `user`, `session`, `account`, and `verification` records.
- Web uses secure, HTTP-only same-origin cookies.
- Native uses Better Auth Expo and Expo SecureStore.
- The Expo deep-link scheme is `sonder://`.
- `BETTER_AUTH_SECRET` is a Cloudflare Worker Secret and must be at least 32 characters of high entropy.
- `BETTER_AUTH_URL` and `WEB_APP_URL` are the production Worker origin.
- Email verification and password reset are not enabled until a free transactional email provider is selected.
- Google OAuth is optional and disabled until configured.

## Database conventions

- UUID primary keys for product records.
- Better Auth user IDs remain text IDs.
- Every user-owned table has a non-null `user_id` foreign key.
- Use timestamptz for instants and date for date-only values.
- Keep created/updated timestamps; update `updated_at` on writes.
- Use explicit enums for task status and priority.
- Generate, review, and apply migrations with Drizzle Kit before using the app.

## Initial schema

- Better Auth: user, session, account, verification.
- Product: life_areas, projects, tasks, inbox_items.
- Later: goals, milestones, habits, notes, calendar_events, time_blocks, attachments, focus_sessions, reminders, activity_events, AI proposals.

## API conventions

- API base path: `/api`.
- `GET /api/health` — API health.
- `GET /api/health/database` — database connectivity and initial auth-schema readiness.
- Better Auth endpoints: `/api/auth/*`.
- Product endpoints under `/api/v1/*`:
  - `GET /api/v1/me` — current authenticated user.
  - Life areas, tasks, projects, and inbox CRUD.
- Validate request bodies and route params.
- Return predictable JSON errors; do not expose stack traces or secrets.
- Add pagination and rate limiting before broad public release.

## Local development

Copy the root `.env.example` to `.env.local` and set:

- `DATABASE_URL` — Supabase PostgreSQL connection string.
- `BETTER_AUTH_SECRET` — at least 32 characters of high-entropy random data.
- `BETTER_AUTH_URL=http://localhost:3000`.
- `WEB_APP_URL=http://localhost:3000`.
- `ENVIRONMENT=development`.

Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL` for Drizzle Kit. If the local network is IPv4-only, use Supabase's shared session pooler for local migrations. Hyperdrive itself should be configured with Supabase's direct connection string.

Apply the committed initial migration:

```bash
cd apps/api
bun run db:migrate
cd ../..
```

For future schema changes, run `bun run db:generate` from `apps/api`, review and commit the SQL/snapshot, then run `bun run db:migrate`.

For local web development, run `bun run dev:web`. For native, run `bun run dev:mobile`. Android emulator API URL: `http://10.0.2.2:3000`; physical device: the computer's LAN IP and port 3000.

## Cloudflare Workers Builds

Configure:

- Root directory: `/`
- Production branch: `main`
- Build command: `bunx opennextjs-cloudflare build`
- Deploy command:

```bash
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://placeholder:placeholder@127.0.0.1:5432/placeholder bunx opennextjs-cloudflare deploy -- --keep-vars
```

OpenNext's deploy command initializes a local platform proxy while preparing the remote deployment. The placeholder local connection string prevents Wrangler from failing before deployment; it is only set for the deploy command. The production Worker still receives the real `HYPERDRIVE` binding from `wrangler.jsonc`.

Set runtime variables in the Cloudflare dashboard, not build variables:

- Secret `BETTER_AUTH_SECRET`.
- Variables `BETTER_AUTH_URL`, `WEB_APP_URL`, and `ENVIRONMENT=production`.
- Optional Google OAuth credentials.

The `--keep-vars` flag preserves dashboard-configured runtime values during deployments.

## Cost policy

Stay on Cloudflare Workers Free, Hyperdrive Free, and Supabase Free. Their quotas are hard ceilings. Pause a feature rather than enabling paid billing. Cloudflare Workers Free's 10 ms CPU limit is the main runtime constraint and must be monitored.

## Security requirements

- Enforce user ownership on every data query and mutation.
- Never accept a client-supplied user ID as proof of ownership.
- Keep secrets out of source control and client bundles.
- Use HTTPS in production.
- Configure Better Auth trusted origins explicitly.
- Validate inputs at the API boundary.
- Add audit history for consequential AI-assisted changes.
- Provide data export and account deletion before broad release.
