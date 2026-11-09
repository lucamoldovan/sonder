import { Hono } from "hono";
import type { AppEnv } from "../env";
import { lifeAreaRoutes } from "./life-areas";
import { taskRoutes } from "./tasks";
import { projectRoutes } from "./projects";
import { inboxRoutes } from "./inbox";

export const v1Routes = new Hono<AppEnv>();

v1Routes.route("/life-areas", lifeAreaRoutes);
v1Routes.route("/tasks", taskRoutes);
v1Routes.route("/projects", projectRoutes);
v1Routes.route("/inbox", inboxRoutes);
