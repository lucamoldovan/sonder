import app from "@/apps/api/src/index";
import type { Bindings } from "@/apps/api/src/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const env: Bindings = {
    DATABASE_URL: process.env.DATABASE_URL || "",
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || requestOrigin,
    WEB_APP_URL: process.env.WEB_APP_URL || requestOrigin,
    ENVIRONMENT: process.env.NODE_ENV || "production"
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
