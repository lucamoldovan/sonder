import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import type { Bindings } from "./env";
import { createDatabase } from "./db";
import * as schema from "./db/schema";

export function createAuth(env: Bindings) {
  const db = createDatabase(env.DATABASE_URL);
  const isDevelopment = env.ENVIRONMENT === "development";

  return betterAuth({
    appName: "Sonder",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
      transaction: false
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false
    },
    trustedOrigins: [
      env.WEB_APP_URL,
      "sonder://",
      "sonder://*",
      ...(isDevelopment ? ["exp://", "exp://**", "exp://192.168.*.*:*/**"] : [])
    ],
    plugins: [expo()]
  });
}
