ALTER TABLE "tasks" ADD COLUMN "scheduled_at" timestamptz;
CREATE INDEX "tasks_scheduled_at_idx" ON "tasks" ("user_id", "scheduled_at");
