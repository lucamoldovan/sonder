ALTER TABLE "projects"
  ADD COLUMN "goal_id" uuid REFERENCES "goals"("id") ON DELETE SET NULL;
CREATE INDEX "projects_goal_id_idx" ON "projects" ("goal_id");

ALTER TABLE "tasks"
  ADD COLUMN "goal_id" uuid REFERENCES "goals"("id") ON DELETE SET NULL,
  ADD COLUMN "parent_task_id" uuid REFERENCES "tasks"("id") ON DELETE SET NULL,
  ADD COLUMN "reminder_at" timestamptz,
  ADD COLUMN "recurrence_frequency" text,
  ADD COLUMN "recurrence_interval" integer DEFAULT 1 NOT NULL,
  ADD COLUMN "recurrence_until" date;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_recurrence_frequency_check"
  CHECK ("recurrence_frequency" IS NULL OR "recurrence_frequency" IN ('daily', 'weekly', 'monthly')),
  ADD CONSTRAINT "tasks_no_self_parent_check"
  CHECK ("parent_task_id" IS NULL OR "parent_task_id" <> "id");

CREATE INDEX "tasks_goal_id_idx" ON "tasks" ("goal_id");
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks" ("parent_task_id");

ALTER TABLE "habits"
  ADD COLUMN "goal_id" uuid REFERENCES "goals"("id") ON DELETE SET NULL;
CREATE INDEX "habits_goal_id_idx" ON "habits" ("goal_id");

CREATE TABLE "task_dependencies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "depends_on_task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_dependencies_no_self_check" CHECK ("task_id" <> "depends_on_task_id"),
  CONSTRAINT "task_dependencies_unique" UNIQUE ("task_id", "depends_on_task_id")
);
ALTER TABLE "task_dependencies" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "task_dependencies_user_idx" ON "task_dependencies" ("user_id", "task_id");

CREATE TABLE "activity_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "action" text NOT NULL,
  "summary" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "activity_log" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "activity_log_user_created_idx" ON "activity_log" ("user_id", "created_at");
CREATE INDEX "activity_log_entity_idx" ON "activity_log" ("entity_type", "entity_id");

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "body" text,
  "href" text,
  "source_key" text,
  "read_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "notifications_user_created_idx" ON "notifications" ("user_id", "created_at");
CREATE INDEX "notifications_user_unread_idx" ON "notifications" ("user_id", "read_at");

CREATE UNIQUE INDEX "notifications_user_source_unique" ON "notifications" ("user_id", "source_key");
