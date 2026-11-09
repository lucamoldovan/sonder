import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";
import type { Bindings } from "./env";
import { v1Routes } from "./routes";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "/api/*",
  cors({
    origin: (origin, context) => {
      const env = context.env as Bindings;
      const allowedOrigins = [
        env.WEB_APP_URL,
        "http://localhost:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081"
      ];
      return allowedOrigins.includes(origin) ? origin : null;
    },
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Set-Cookie"],
    credentials: true,
    maxAge: 600
  })
);

app.get("/health", (context) =>
  context.json({
    status: "ok",
    service: "sonder-api",
    timestamp: new Date().toISOString()
  })
);

app.on(["GET", "POST"], "/api/auth/*", (context) =>
  createAuth(context.env).handler(context.req.raw)
);

app.route("/api/v1", v1Routes);

app.get("/api/v1/me", async (context) => {
  const auth = createAuth(context.env);
  const session = await auth.api.getSession({ headers: context.req.raw.headers });

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
