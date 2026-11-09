import { createAuthClient } from "better-auth/react";

const appOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: appOrigin,
  fetchOptions: {
    credentials: "include"
  }
});
