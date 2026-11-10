import { Client } from "pg";
import { sql } from "drizzle-orm";
import { Hono, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";
import { createDatabase } from "./db";
import type { AppEnv } from "./env";
import { v1Routes } from "./routes";

const app = new Hono<AppEnv>();

app.use(
  "/api/*",
  cors({
    origin: (origin, context) => {
      const allowedOrigins = [
        context.env.WEB_APP_URL,
        "http://localhost:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081"
      ];
      return allowedOrigins.includes(origin) ? origin : "";
    },
    allowHeaders: ["Content-Type", "Authorization", "Cookie", "expo-origin"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Set-Cookie"],
    credentials: true,
    maxAge: 600
  })
);

const databaseMiddleware: MiddlewareHandler<AppEnv> = async (context, next) => {
  const connectionString = context.env.HYPERDRIVE?.connectionString ?? context.env.DATABASE_URL;
  if (!connectionString) {
    return context.json({ error: { code: "DATABASE_NOT_CONFIGURED", message: "Database connection is not configured." } }, 500);
  }

  // Hyperdrive pools origin connections for us. Create a fresh pg Client for
  // each Worker invocation; do not keep clients or pools in module scope.
  const client = new Client({ connectionString });
  let connected = false;

  try {
    await client.connect();
    connected = true;
    context.set("db", createDatabase(client));
    await next();
  } finally {
    // In the Workers runtime, Hyperdrive cleans up the per-invocation client
    // automatically. Close only ordinary local Node.js development clients.
    if (connected && (context.env.ENVIRONMENT === "development" || !context.env.HYPERDRIVE)) {
      await client.end().catch(() => undefined);
    }
  }
};

app.get("/api/health", (context) =>
  context.json({
    status: "ok",
    service: "sonder-api",
    timestamp: new Date().toISOString()
  })
);

// This endpoint confirms both the Hyperdrive connection and the initial
// Better Auth schema are available, without exposing database details.
app.get("/api/health/database", databaseMiddleware, async (context) => {
  const result = await context.get("db").execute(
    sql`SELECT count(*) = 12 AS schema_ready
      FROM pg_class
      WHERE relkind = 'r'
        AND relrowsecurity = true
        AND oid IN (
          to_regclass('public."user"'),
          to_regclass('public."session"'),
          to_regclass('public."account"'),
          to_regclass('public."verification"'),
          to_regclass('public.life_areas'),
          to_regclass('public.projects'),
          to_regclass('public.tasks'),
          to_regclass('public.inbox_items'),
          to_regclass('public.goals'),
          to_regclass('public.habits'),
          to_regclass('public.habit_entries'),
          to_regclass('public.calendar_events')
        )`
  );
  const row = result.rows[0] as { schema_ready?: boolean } | undefined;
  const schemaReady = Boolean(row?.schema_ready);

  return context.json({
    status: schemaReady ? "ok" : "schema_missing",
    database: "connected",
    schemaReady
  }, schemaReady ? 200 : 503);
});

// Better Auth uses more than GET and POST (for example, PATCH and DELETE).
app.use("/api/auth/*", databaseMiddleware);
app.use("/api/v1/*", databaseMiddleware);

app.all("/api/auth/*", (context) =>
  createAuth(context.env, context.get("db")).handler(context.req.raw)
);

app.route("/api/v1", v1Routes);

app.get("/api/v1/me", async (context) => {
  const session = await createAuth(context.env, context.get("db")).api.getSession({
    headers: context.req.raw.headers
  });

  if (!session) {
    return context.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in to continue." } },
      401
    );
  }

  return context.json({ user: session.user });
});

app.notFound((context) =>
  context.json(
    { error: { code: "NOT_FOUND", message: "Route not found." } },
    404
  )
);

app.onError((error, context) => {
  console.error("Unhandled API error", error);
  return context.json(
    { error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong." } },
    500
  );
});

export default app;
