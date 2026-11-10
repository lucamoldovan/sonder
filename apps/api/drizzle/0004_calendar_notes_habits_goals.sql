CREATE TABLE "time_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "time_blocks_valid_range_check" CHECK ("ends_at" > "starts_at")
);
ALTER TABLE "time_blocks" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "time_blocks_user_start_idx" ON "time_blocks" ("user_id", "starts_at");
CREATE INDEX "time_blocks_task_idx" ON "time_blocks" ("task_id");

CREATE TABLE "note_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "content" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "note_templates_user_name_unique" UNIQUE ("user_id", "name")
);
ALTER TABLE "note_templates" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "note_templates_user_idx" ON "note_templates" ("user_id");

CREATE TABLE "goal_milestones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "goal_id" uuid NOT NULL REFERENCES "goals"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "target_date" date,
  "status" text DEFAULT 'pending' NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "goal_milestones_status_check" CHECK ("status" IN ('pending', 'completed'))
);
ALTER TABLE "goal_milestones" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "goal_milestones_goal_position_idx" ON "goal_milestones" ("goal_id", "position");
CREATE INDEX "goal_milestones_user_idx" ON "goal_milestones" ("user_id", "goal_id");
