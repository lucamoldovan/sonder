import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import type { Bindings } from "./env";
import type { Database } from "./db";
import * as schema from "./db/schema";

// Keep Better Auth's default scrypt parameters and storage format, but call
// Workers' native node:crypto implementation instead of the pure-JS fallback.
// This is important on the Workers Free plan's 10 ms CPU budget.
const SCRYPT_OPTIONS = {
  N: 16_384,
  r: 16,
  p: 1,
  maxmem: 64 * 1024 * 1024
};

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = scryptSync(password.normalize("NFKC"), salt, 64, SCRYPT_OPTIONS);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function verifyPassword({ password, hash }: { password: string; hash: string }) {
  const [saltHex, keyHex] = hash.split(":");
  if (!/^[0-9a-f]{32}$/i.test(saltHex ?? "") || !/^[0-9a-f]{128}$/i.test(keyHex ?? "")) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const actual = scryptSync(password.normalize("NFKC"), salt, 64, SCRYPT_OPTIONS);
  return timingSafeEqual(actual, expected);
}

export function createAuth(env: Bindings, db: Database) {
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
      requireEmailVerification: false,
      password: {
        hash: hashPassword,
        verify: verifyPassword
      }
    },
    socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET
      }
    } : {},
    trustedOrigins: [
      env.WEB_APP_URL,
      "sonder://",
      "sonder://*",
      ...(isDevelopment ? ["exp://", "exp://**", "exp://192.168.*.*:*/**"] : [])
    ],
    plugins: [expo()]
  });
}
