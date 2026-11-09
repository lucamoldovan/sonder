import type { Context } from "hono";
import { createAuth } from "../auth";
import type { AppEnv } from "../env";

export async function getSessionUser(context: Context<AppEnv>) {
  const session = await createAuth(context.env, context.get("db")).api.getSession({
    headers: context.req.raw.headers
  });

  return session?.user ?? null;
}
