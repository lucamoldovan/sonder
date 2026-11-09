# Sonder — Technical Architecture

## Decision

Sonder uses a TypeScript monorepo with a Next.js web application, an Expo native application, one Hono API, and a shared PostgreSQL database.

### Applications
- **Web:** Next.js App Router at the repository root.
- **Mobile:** Expo + React Native in `apps/mobile`.
- **API:** Hono in `apps/api`, mounted by a Next.js catch-all route at `app/api/[[...path]]/route.ts` and executed in the Node.js runtime.

### Shared packages
- **`@sonder/contracts`:** Zod request schemas and inferred TypeScript types.
- Shared API response types and UI primitives can be extracted when the same implementation is genuinely used by both apps.

### Backend services
- **Hosting:** Vercel Hobby for the personal, non-commercial app; web pages and API routes share one deployment and origin.
- **Database:** Neon Free PostgreSQL, accessed with the Neon serverless HTTP driver from the Node.js API runtime.
- **ORM/migrations:** Drizzle ORM + Drizzle Kit. The Neon HTTP driver is used for independent queries; Better Auth's Drizzle adapter has `transaction: false`. Use a transaction-capable driver if future workflows require multi-statement transactions.
- **Authentication:** Better Auth email/password with the Expo client plugin.
- **File storage:** local-only initially; add a free-quota provider only when attachments are implemented.
- **AI:** optional local Ollama integration after core workflows exist. No paid inference API.

Cloudflare Workers are intentionally not part of the selected runtime. Better Auth's default scrypt password hashing is CPU-intensive; the free Workers CPU budget is too tight to make sign-up reliability a safe assumption. The Node.js runtime uses the native Node password-hashing implementation instead.

## Request flow

1. Web calls same-origin `/api/*` routes on the Next.js deployment.
2. Native calls the same deployment URL configured by `EXPO_PUBLIC_API_URL`.
3. The Next catch-all route passes the request to Hono.
4. Hono validates input using shared Zod contracts and derives user identity from the verified Better Auth session.
5. Drizzle queries Neon PostgreSQL.
6. Responses use predictable JSON shapes.

Clients must never connect directly to PostgreSQL or receive database credentials. Never trust a client-supplied `userId`; derive ownership from the authenticated session.

## Authentication and sessions

- Better Auth owns user, session, account, and verification records.
- Web uses secure, HTTP-only same-origin cookies.
- Native uses the Better Auth Expo client and Expo SecureStore for session persistence.
- The Expo deep-link scheme is `sonder://`.
- `BETTER_AUTH_URL` and `WEB_APP_URL` should both be the deployed Vercel origin in production.
- Email verification and email password reset are not enabled until a free transactional email provider is configured.
- Google OAuth is optional and enabled only when client credentials are configured; Apple Sign In is deferred to preserve the zero-cost requirement.

## Database conventions

- UUID primary keys for product records.
- Better Auth user IDs remain text IDs as required by its adapter schema.
- Every user-owned table has a non-null `user_id` foreign key.
- Ownership is checked in the API for every read/write.
- Use timestamptz for instants and date for date-only values.
- Keep created/updated timestamps; update `updated_at` on writes.
- Use explicit enums for task status and priority.
- Generate and review migrations with Drizzle Kit before applying them.

## Initial schema

- Better Auth: user, session, account, verification.
- Product: life_areas, projects, tasks, inbox_items.
- Later: goals, milestones, habits, notes, calendar_events, time_blocks, attachments, focus_sessions, reminders, activity_events, AI proposals.

## API conventions

- API base path: `/api`.
- Health endpoint: `GET /api/health`.
- Better Auth endpoint prefix: `/api/auth/*`.
- Product endpoints live under `/api/v1/*`:
  - `GET /api/v1/me` — current authenticated user.
  - `GET|POST /api/v1/life-areas` and `PATCH|DELETE /api/v1/life-areas/:id`.
  - `GET|POST /api/v1/tasks` and `PATCH|DELETE /api/v1/tasks/:id`.
  - `GET|POST /api/v1/projects` and `PATCH|DELETE /api/v1/projects/:id`.
  - `GET|POST /api/v1/inbox`, `PATCH|DELETE /api/v1/inbox/:id`, and `POST /api/v1/inbox/:id/convert-to-task`.
- Validate all request bodies and route params.
- Return predictable JSON errors; do not expose stack traces or secrets.
- Add pagination and rate limiting before broad public release.

## Local development

Copy root `.env.example` to `.env.local` and set:
- `DATABASE_URL` — Neon pooled connection string.
- `BETTER_AUTH_SECRET` — at least 32 characters of high-entropy random data.
- `BETTER_AUTH_URL=http://localhost:3000`.
- `WEB_APP_URL=http://localhost:3000`.
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`.

Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL` before running Drizzle Kit. Never commit either environment file.

For an Android emulator, set `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`. For a physical phone, use the computer's LAN IP and keep both devices on the same Wi-Fi network. For production, use the free Vercel app URL.

## Deployment and cost policy

- Web + API: Vercel Hobby, $0 for personal, non-commercial use and within included quotas.
- Database: Neon Free, $0 within compute, storage, and egress quotas.
- Mobile development: Expo SDK + Expo Go, $0; use local builds when cloud build quotas are exhausted.
- CI: GitHub Actions on the public repository.
- AI: local Ollama only unless a future free option is verified.
- No custom domain, paid add-on, paid AI API, paid email provider, or paid app-store account is required for development.

See [FREE_STACK.md](./FREE_STACK.md) for the strict zero-cost policy and current provider limits.

## Security requirements

- Enforce user ownership on every data query and mutation.
- Never accept a user ID from an untrusted client as proof of ownership.
- Keep secrets out of source control and client bundles.
- Use HTTPS in production.
- Configure Better Auth trusted origins explicitly.
- Validate inputs at the API boundary.
- Add audit history for consequential AI-assisted changes.
- Provide data export and account deletion before broad release.

## Architecture evolution

Start with one Next.js deployment, one Hono API surface, and one PostgreSQL database. Avoid premature microservices. Keep domain modules separated inside the API so they can be extracted only if real scale or operational needs justify it.
