import type { Context } from "hono";
import { createAuth } from "../auth";
import type { Bindings } from "../env";

export async function getSessionUser(context: Context<{ Bindings: Bindings }>) {
  const session = await createAuth(context.env).api.getSession({
    headers: context.req.raw.headers
  });

  return session?.user ?? null;
}
