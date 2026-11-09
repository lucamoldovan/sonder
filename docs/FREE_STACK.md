# Sonder — Zero-cost development and hosting plan

Sonder is being built so the owner can develop and use it without paying for subscriptions or usage-based services. Use free tiers only. Do not enable billing, paid add-ons, metered AI APIs, paid email services, or paid storage.

## Approved free stack

| Need | Provider / tool | Cost target | Important limits |
|---|---|---:|---|
| Source control and CI | GitHub Free | $0 | Public repository Actions minutes are free; private repositories have included monthly minutes. |
| Web hosting | Vercel Hobby | $0 | Personal, non-commercial use only; usage is capped and projects may pause at limits. |
| API hosting | Cloudflare Workers Free | $0 | 100,000 requests/day and 10 ms CPU per request on the Free plan. |
| PostgreSQL | Neon Free | $0 | Free compute, storage, and egress quotas; compute may suspend when monthly limits are reached. |
| Native development | Expo SDK + Expo Go | $0 | Build and run locally; EAS cloud builds are optional and quota-limited. |
| AI (future) | Ollama with a local model | $0 | Uses the user's own computer; no hosted inference or API key. |

Do not add Cloudflare R2, hosted vector databases, paid analytics, paid observability, paid automation platforms, or paid AI providers until a suitable free option is verified. Attachments can initially remain local.

## Authentication policy

- Use Better Auth email/password authentication.
- Keep email verification disabled for the private MVP until a free transactional email provider is selected and checked.
- Do not add Apple Sign In or paid developer-program dependencies to the MVP.
- Google OAuth is optional and remains disabled until provider setup is confirmed free and configured.
- Do not promise password reset by email until outbound email is configured.
- Use secure HTTP-only web cookies and Expo SecureStore on native.

## Web/API cookie routing

The browser calls the same-origin `/api/*` path. Next.js rewrites that path to the API Worker using the server-only `API_PROXY_URL`. This keeps browser auth cookies first-party and avoids third-party cookie dependencies or exposing the API origin in client code.

For local development, the default proxy target is `http://localhost:8787`. For Vercel, set `API_PROXY_URL` to the deployed Cloudflare Worker URL and set the API Worker's `WEB_APP_URL` to the Vercel app origin.

## Avoiding surprise charges

- Never add a credit card or enable pay-as-you-go billing just to unlock a free tier.
- Do not select a paid plan or paid trial.
- Configure provider usage alerts where available, but treat quotas as hard ceilings.
- If a free quota is exhausted, pause that feature until the quota resets or replace it with a local/self-hosted option. Do not silently upgrade.
- No custom domain is required; use free provider subdomains.
- Publishing to app stores can have separate developer fees. During development, use Expo Go or local Android builds instead.

## Local setup

1. Copy `.env.example` to `.env.local` for Next.js and set `API_PROXY_URL`.
2. Create a Neon Free project and copy its pooled PostgreSQL connection string.
3. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL` for Drizzle Kit.
4. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`, then set `DATABASE_URL` and a random `BETTER_AUTH_SECRET`.
5. Generate and inspect migrations before applying them.
6. Run the web, API, and mobile development servers locally.

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Never commit `.env.local`, `.env`, or `.dev.vars`.
