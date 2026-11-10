CREATE TABLE "mood_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "entry_date" date NOT NULL,
  "mood" integer NOT NULL,
  "energy" integer NOT NULL,
  "stress" integer NOT NULL,
  "sleep_minutes" integer,
  "journal" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "mood_entries_mood_range_check" CHECK ("mood" BETWEEN 1 AND 5),
  CONSTRAINT "mood_entries_energy_range_check" CHECK ("energy" BETWEEN 1 AND 5),
  CONSTRAINT "mood_entries_stress_range_check" CHECK ("stress" BETWEEN 1 AND 5),
  CONSTRAINT "mood_entries_sleep_range_check" CHECK ("sleep_minutes" IS NULL OR "sleep_minutes" BETWEEN 0 AND 1440),
  CONSTRAINT "mood_entries_user_date_unique" UNIQUE ("user_id", "entry_date")
);

ALTER TABLE "mood_entries" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "mood_entries_user_date_idx" ON "mood_entries" ("user_id", "entry_date");

CREATE TABLE "focus_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "task_id" uuid REFERENCES "tasks"("id") ON DELETE SET NULL,
  "planned_minutes" integer NOT NULL,
  "actual_minutes" integer,
  "status" text DEFAULT 'active' NOT NULL,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "ended_at" timestamptz,
  "note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "focus_sessions_planned_range_check" CHECK ("planned_minutes" BETWEEN 1 AND 240),
  CONSTRAINT "focus_sessions_actual_range_check" CHECK ("actual_minutes" IS NULL OR "actual_minutes" BETWEEN 0 AND 1440),
  CONSTRAINT "focus_sessions_status_check" CHECK ("status" IN ('active', 'completed', 'abandoned'))
);

ALTER TABLE "focus_sessions" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "focus_sessions_user_started_idx" ON "focus_sessions" ("user_id", "started_at");
CREATE INDEX "focus_sessions_task_idx" ON "focus_sessions" ("task_id");
