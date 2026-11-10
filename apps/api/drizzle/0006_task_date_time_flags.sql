ALTER TABLE "tasks"
  ADD COLUMN "scheduled_has_time" boolean NOT NULL DEFAULT false,
  ADD COLUMN "due_has_time" boolean NOT NULL DEFAULT false;
