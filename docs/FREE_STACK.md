# Sonder — Zero-cost development and hosting plan

Sonder is intended for private use by the owner and a few friends. Keep all services on free tiers. Never enable a paid plan, trial, or usage-based billing without explicit approval.

## Approved free stack

| Need | Provider / tool | Cost target | Important limits |
|---|---|---:|---|
| Source control and CI | GitHub Free | $0 | Public repository Actions minutes are free. |
| Web + API hosting | Cloudflare Workers Free | $0 | 100,000 requests/day; 10 ms CPU per request. |
| Database connectivity | Cloudflare Hyperdrive Free | $0 | 100,000 database statements/day; approximately 20 origin connections per configuration. |
| PostgreSQL | Supabase Free | $0 | 500 MB database, 5 GB egress; direct connection is IPv6. Low-activity projects can pause after 7 days. |
| Native development | Expo SDK + Expo Go | $0 | Local development; cloud builds are optional and quota-limited. |
| AI (future) | Ollama with a local model | $0 | Uses the user's own computer; no hosted inference or API key. |

Do not add R2, paid analytics, paid observability, hosted vector databases, paid AI providers, or paid email services to the default setup. Keep attachments disabled until a free option is verified.

## Authentication policy

- Use Better Auth email/password.
- Keep email verification disabled for the private MVP until a free transactional email provider is selected.
- Use secure, HTTP-only same-origin web cookies and Expo SecureStore on native.
- Sonder uses native Node.js scrypt with Better Auth's default parameters and hash format to avoid the pure-JavaScript scrypt path on Workers Free. Monitor Worker CPU metrics after signup and sign-in tests; do not assume the 10 ms CPU limit is automatically sufficient.
- Do not promise password reset by email until outbound email is configured.
- Google OAuth is optional and remains disabled until configured.

## Database and connection setup

- Supabase hosts PostgreSQL.
- Cloudflare Hyperdrive connects to Supabase using the **direct connection string**. Hyperdrive handles pooling, so do not use the Supabase pooler as the Hyperdrive origin.
- For local Drizzle migrations, use the Supabase session pooler if the local network does not support IPv6.
- Production Worker requests use the `HYPERDRIVE` binding; no production `DATABASE_URL` variable is required.

## Cloudflare Workers Builds

Set:

- Root directory: `/`
- Production branch: `main`
- Build command: `bunx opennextjs-cloudflare build`
- Deploy command:

```bash
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://placeholder:placeholder@127.0.0.1:5432/placeholder bunx opennextjs-cloudflare deploy -- --keep-vars
```

The placeholder is used only by the OpenNext deployment command to satisfy Wrangler's local Hyperdrive platform proxy. It is not a database password and is not used by the deployed Worker. The Worker uses the real Hyperdrive binding.

Set the following in **Worker Settings → Variables and Secrets** (runtime, not build variables):

- Secret `BETTER_AUTH_SECRET`: generate a high-entropy secret of at least 32 characters.
- Variable `BETTER_AUTH_URL`: the production Worker origin, for example `https://sonder.<your-subdomain>.workers.dev`.
- Variable `WEB_APP_URL`: the same production Worker origin.
- Variable `ENVIRONMENT`: `production`.
- Optional Google OAuth variables if enabled.

The deploy command includes `--keep-vars` so dashboard-configured runtime variables are preserved.

## Local setup

1. Copy root `.env.example` to `.env.local`.
2. Set `DATABASE_URL` to a Supabase connection string and generate `BETTER_AUTH_SECRET`.
3. Copy `apps/api/.env.example` to `apps/api/.env` and set the database URL there too.
4. Generate and apply the database schema:

```bash
cd apps/api
bun run db:generate
bun run db:migrate
```

5. Run `bun run dev:web` and `bun run dev:mobile`.

For a physical Android phone, set `EXPO_PUBLIC_API_URL` to your computer's LAN IP on port 3000. For production, use the Cloudflare Worker origin.

## Avoiding surprise charges

- Do not upgrade Cloudflare Workers or Supabase.
- Do not enable pay-as-you-go billing.
- Treat free quotas as hard ceilings. If a quota is exhausted, pause the feature until it resets or replace it with a local option.
- No custom domain is required; use the free `workers.dev` subdomain.
- App-store publishing is not zero-cost. Use Expo Go or locally built Android APKs for private testing.

Generate a Better Auth secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Never commit `.env.local`, `.env`, or `apps/mobile/.env`.
