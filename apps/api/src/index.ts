import { Client } from "pg";
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

  const client = new Client({ connectionString });
  await client.connect();

  try {
    context.set("db", createDatabase(client));
    await next();
  } finally {
    await client.end();
  }
};

app.use("/api/auth/*", databaseMiddleware);
app.use("/api/v1/*", databaseMiddleware);

app.get("/api/health", (context) =>
  context.json({
    status: "ok",
    service: "sonder-api",
    timestamp: new Date().toISOString()
  })
);

app.on(["GET", "POST"], "/api/auth/*", (context) =>
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
