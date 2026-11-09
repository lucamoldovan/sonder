import { getCloudflareContext } from "@opennextjs/cloudflare";
import app from "@/apps/api/src/index";
import type { Bindings } from "@/apps/api/src/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const { env: cloudflareEnv } = await getCloudflareContext({ async: true });
  const workerEnv = cloudflareEnv as unknown as {
    HYPERDRIVE?: { connectionString: string };
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    WEB_APP_URL?: string;
    ENVIRONMENT?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
  };

  const env: Bindings = {
    HYPERDRIVE: workerEnv.HYPERDRIVE,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: workerEnv.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET || "",
    BETTER_AUTH_URL: workerEnv.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || requestOrigin,
    WEB_APP_URL: workerEnv.WEB_APP_URL || process.env.WEB_APP_URL || requestOrigin,
    ENVIRONMENT: workerEnv.ENVIRONMENT || process.env.ENVIRONMENT || process.env.NODE_ENV || "production",
    GOOGLE_CLIENT_ID: workerEnv.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: workerEnv.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  };

  return app.fetch(request, env);
}

export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as PUT,
  handle as DELETE,
  handle as OPTIONS
};
