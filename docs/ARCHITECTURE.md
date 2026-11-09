# Sonder — Technical Architecture

## Decision

Sonder uses a TypeScript monorepo with separate web and native applications, a shared contracts/domain layer, and one API/backend.

### Applications
- **Web:** Next.js App Router at the repository root; deploy on Vercel Hobby for personal, non-commercial use, or run locally.
- **Mobile:** Expo + React Native in `apps/mobile`.
- **API:** Hono on Cloudflare Workers in `apps/api`.

### Shared packages
- **`@sonder/contracts`:** Zod request/response schemas and inferred TypeScript types.
- Future packages may include domain logic, API client, design tokens, and shared UI primitives. Only add a package when real code is shared.

### Backend services
- **Database:** Neon Free PostgreSQL, accessed through the serverless HTTP driver from Cloudflare Workers.
- **ORM/migrations:** Drizzle ORM + Drizzle Kit. The HTTP driver is intended for independent queries; Better Auth's Drizzle adapter explicitly runs without interactive transactions. If future workflows require multi-statement interactive transactions, switch that path to a transaction-capable Neon WebSocket driver or Cloudflare Hyperdrive.
- **Authentication:** Better Auth, hosted by the Hono API. Email/password first; social OAuth is deferred to avoid unnecessary provider setup.
- **File storage:** local files initially; evaluate free-quota object storage only when attachment workflows are implemented.
- **AI:** optional local Ollama integration after core workflows exist; no paid inference API.

## Request flow

1. Web and mobile clients call the same HTTPS API.
2. The API validates inputs using shared Zod contracts.
3. The API authenticates the request and derives the user identity from the verified session.
4. Domain services apply ownership checks and business rules.
5. Drizzle queries Neon PostgreSQL.
6. Responses use shared contracts.

Clients must never connect directly to PostgreSQL or receive database credentials. Never trust a client-supplied `userId`; derive ownership from the authenticated session.

## Authentication and sessions

- Better Auth owns user, session, account, and verification records.
- Web uses secure, HTTP-only cookies.
- Native uses the Better Auth Expo client and Expo SecureStore for session persistence.
- The Expo deep-link scheme is `sonder://`.
- Configure trusted origins explicitly for production and local development.
- Secrets are environment variables / Cloudflare Worker secrets, never committed.
- Email verification and email password reset are not enabled until a free transactional email provider is configured.
- OAuth requires separately configured Google/Apple credentials.

## Database conventions

- UUID primary keys for product records.
- Better Auth user IDs remain text IDs as required by its adapter schema.
- Every user-owned table has a non-null `user_id` foreign key.
- Ownership is checked in the API for every read/write.
- Use timestamptz for instants and date for date-only values.
- Keep created/updated timestamps; update `updated_at` on writes.
- Use explicit enums for task status and priority.
- Migrations are generated and applied with Drizzle Kit; do not edit production schema manually.

## Initial schema

- Better Auth: user, session, account, verification.
- Product: life_areas, projects, tasks, inbox_items.
- Later: inbox_items, goals, milestones, habits, notes, calendar_events, time_blocks, attachments, focus_sessions, reminders, activity_events, AI proposals.

## API conventions

- API base URL is configured per environment.
- Health endpoint: `GET /health`.
- Better Auth endpoint prefix: `/api/auth/*`.
- Product endpoints live under `/api/v1/*`:
  - `GET /api/v1/me` — current authenticated user.
  - `GET|POST /api/v1/life-areas` and `PATCH|DELETE /api/v1/life-areas/:id`.
  - `GET|POST /api/v1/tasks` and `PATCH|DELETE /api/v1/tasks/:id`.
  - `GET|POST /api/v1/projects` and `PATCH|DELETE /api/v1/projects/:id`.
  - `GET|POST /api/v1/inbox`, `PATCH|DELETE /api/v1/inbox/:id`, and `POST /api/v1/inbox/:id/convert-to-task`.
- Validate all request bodies, params, and query strings.
- Return predictable JSON errors; do not expose stack traces or secrets.
- Add pagination to list endpoints before datasets grow.
- Use rate limiting for authentication and sensitive operations before public launch.

## Local development

Required environment variables:
- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (at least 32 characters, high entropy)
- `BETTER_AUTH_URL` (local API URL, normally http://localhost:8787)
- `WEB_APP_URL` (local web URL, normally http://localhost:3000)

Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars` for Wrangler local secrets. Copy `apps/api/.env.example` to `apps/api/.env` for Drizzle CLI commands. Never commit real values.

## Deployment

- Web: Vercel Hobby for personal, non-commercial use; Next.js rewrites `/api/*` to the API Worker using server-only `API_PROXY_URL` so web auth cookies remain same-origin.
- API: Cloudflare Workers Free, within the published request and CPU quotas.
- Database: Neon Free PostgreSQL, within the published compute, storage, and egress quotas.
- Files: local initially; no paid object storage.
- Mobile: Expo SDK + Expo Go and local builds; cloud builds are optional and quota-limited.

Free accounts and credentials must be created by the project owner. No paid tier, custom domain, app-store account, or external AI provider is required for development.

## Security requirements

- Enforce user ownership on every data query and mutation.
- Never accept a user ID from an untrusted client as proof of ownership.
- Keep secrets out of source control and client bundles.
- Use HTTPS in production.
- Configure CORS and Better Auth trusted origins explicitly.
- Validate inputs at the API boundary.
- Add audit history for consequential AI-assisted changes.
- Provide data export and account deletion before broad release.

## Architecture evolution

Start with a single API Worker and a single PostgreSQL database. Avoid premature microservices. Keep domain modules separated inside the API so they can be extracted only if real scale or operational needs justify it.
