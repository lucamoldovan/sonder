import { createAuthClient } from "better-auth/react";

// The web app and API share an origin. Let Better Auth use the current origin
// instead of baking localhost:3000 into the production client bundle.
export const authClient = createAuthClient({
  fetchOptions: {
    credentials: "include"
  }
});
