# Sonder — Zero-cost development and hosting plan

Sonder is being built so the owner can develop and use it without paying for subscriptions or usage-based services. Use free tiers only. Do not enable billing, paid add-ons, metered AI APIs, paid email services, or paid storage.

## Approved free stack

| Need | Provider / tool | Cost target | Important limits |
|---|---|---:|---|
| Source control and CI | GitHub Free | $0 | Public repository Actions minutes are free. |
| Web + API hosting | Vercel Hobby | $0 | Personal, non-commercial use only; usage is capped and deployments may pause at limits. |
| PostgreSQL | Neon Free | $0 | Free compute, storage, and egress quotas; compute suspends when monthly limits are reached. |
| Native development | Expo SDK + Expo Go | $0 | Build and run locally; EAS cloud builds are optional and quota-limited. |
| AI (future) | Ollama with a local model | $0 | Uses the user's own computer; no hosted inference or API key. |

Vercel Hobby is suitable for this personal project, not a commercial SaaS. If Sonder becomes a commercial product, we must move to a host whose free plan permits that use before launch.

Neon's current Free allowance includes 100 CU-hours and 1 GB of database storage per project, plus a monthly public network transfer allowance. The exact allowance can change; check the provider dashboard before relying on it.

Do not add Cloudflare Workers, R2, hosted vector databases, paid analytics, paid observability, paid automation platforms, or paid AI providers to the default setup. Keep attachments local until a free option is verified.

## Authentication policy

- Use Better Auth email/password authentication.
- Keep email verification disabled for the private MVP until a free transactional email provider is selected and checked.
- Do not add Apple Sign In or paid developer-program dependencies to the MVP.
- Google OAuth is optional and remains disabled until provider setup is confirmed free and configured.
- Do not promise password reset by email until outbound email is configured.
- Use secure HTTP-only same-origin web cookies and Expo SecureStore on native.

## One origin for web and API

The Hono API is mounted inside Next.js at `/api/*` and runs in the Node.js runtime. Web requests are same-origin, so auth cookies do not depend on third-party cookie behavior. The mobile app calls the same Vercel deployment URL.

## Avoiding surprise charges

- Never add a credit card or enable pay-as-you-go billing just to unlock a free tier.
- Do not select a paid plan or paid trial.
- Configure usage alerts where available, but treat quotas as hard ceilings.
- If a free quota is exhausted, pause that feature until the quota resets or replace it with a local/self-hosted option. Do not silently upgrade.
- No custom domain is required; use the free Vercel subdomain.
- Publishing to app stores can have separate developer fees. During development, use Expo Go or local Android builds instead.

## Local setup

1. Copy `.env.example` to `.env.local` and set the Neon connection string, a generated Better Auth secret, and local URLs.
2. Create a Neon Free project and use its pooled PostgreSQL connection string.
3. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL` for Drizzle Kit.
4. Generate and inspect migrations before applying them.
5. Run `bun run dev:all` for the web and native development servers.
6. For a physical Android phone, copy `apps/mobile/.env.example` to `apps/mobile/.env` and set `EXPO_PUBLIC_API_URL` to your computer's LAN IP on port 3000.

Generate a Better Auth secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Never commit `.env.local`, `.env`, or `apps/mobile/.env`.
