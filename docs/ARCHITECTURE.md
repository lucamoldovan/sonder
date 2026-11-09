# Sonder — Technical Architecture

## Decision

Sonder uses a TypeScript monorepo with separate web and native applications, a shared contracts/domain layer, and one API/backend.

### Applications
- **Web:** existing Next.js App Router application at the repository root (kept in place initially to preserve the prototype).
- **Mobile:** Expo + React Native in `apps/mobile`.
- **API:** Hono on Cloudflare Workers in `apps/api`.

### Shared packages
- **`@sonder/contracts`:** Zod request/response schemas and inferred TypeScript types.
- Future packages may include domain logic, API client, design tokens, and shared UI primitives. Only add a package when real code is shared.

### Backend services
- **Database:** Neon managed PostgreSQL.
- **ORM/migrations:** Drizzle ORM + Drizzle Kit.
- **Authentication:** Better Auth, hosted by the Hono API. Email/password first; Google and Apple OAuth after provider credentials and callback URLs are configured.
- **File storage:** Cloudflare R2, introduced when attachment workflows are implemented.
- **AI:** provider-independent server-side service, introduced after core data workflows exist.

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
- Email verification and password reset require a configured transactional email provider before public launch.
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
- Product: life_areas, projects, tasks.
- Later: inbox_items, goals, milestones, habits, notes, calendar_events, time_blocks, attachments, focus_sessions, reminders, activity_events, AI proposals.

## API conventions

- API base URL is configured per environment.
- Health endpoint: `GET /health`.
- Better Auth endpoint prefix: `/api/auth/*`.
- Product endpoints live under `/api/v1/*`.
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

Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars` for Wrangler local secrets. Copy `.env.example` to `.env` for Drizzle CLI commands. Never commit real values.

## Deployment

- Web: deploy the existing Next.js app separately; choose the final hosting target after the first production build.
- API: Cloudflare Workers.
- Database: Neon PostgreSQL.
- Files: Cloudflare R2.
- Mobile: Expo EAS builds and app stores.

Production domains, database project, R2 bucket, OAuth applications, email provider, and secrets must be created/configured by the project owner. No production resource or credential is assumed to exist.

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
