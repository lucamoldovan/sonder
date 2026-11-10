import { Hono } from "hono";
import type { AppEnv } from "../env";
import { lifeAreaRoutes } from "./life-areas";
import { taskRoutes } from "./tasks";
import { projectRoutes } from "./projects";
import { inboxRoutes } from "./inbox";
import { goalRoutes } from "./goals";
import { habitRoutes } from "./habits";
import { calendarRoutes } from "./calendar";
import { noteRoutes } from "./notes";

export const v1Routes = new Hono<AppEnv>();

v1Routes.route("/life-areas", lifeAreaRoutes);
v1Routes.route("/tasks", taskRoutes);
v1Routes.route("/projects", projectRoutes);
v1Routes.route("/inbox", inboxRoutes);
v1Routes.route("/goals", goalRoutes);
v1Routes.route("/habits", habitRoutes);
v1Routes.route("/calendar", calendarRoutes);
v1Routes.route("/notes", noteRoutes);
