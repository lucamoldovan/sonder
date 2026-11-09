import type { Database } from "./db";

export type Bindings = {
  DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  WEB_APP_URL: string;
  ENVIRONMENT?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    db: Database;
  };
};
