CREATE TABLE "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "life_area_id" uuid REFERENCES "life_areas"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'active' NOT NULL,
  "target_date" date,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "goals_user_id_idx" ON "goals" ("user_id");
CREATE INDEX "goals_life_area_id_idx" ON "goals" ("life_area_id");

CREATE TABLE "habits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "life_area_id" uuid REFERENCES "life_areas"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "description" text,
  "frequency" text DEFAULT 'daily' NOT NULL,
  "target_per_week" integer DEFAULT 7 NOT NULL,
  "archived_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "habits" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "habits_user_id_idx" ON "habits" ("user_id");

CREATE TABLE "habit_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "habit_id" uuid NOT NULL REFERENCES "habits"("id") ON DELETE CASCADE,
  "entry_date" date NOT NULL,
  "note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "habit_entries" ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX "habit_entries_habit_date_unique" ON "habit_entries" ("habit_id", "entry_date");
CREATE INDEX "habit_entries_user_date_idx" ON "habit_entries" ("user_id", "entry_date");

CREATE TABLE "calendar_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "life_area_id" uuid REFERENCES "life_areas"("id") ON DELETE SET NULL,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "description" text,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz,
  "all_day" boolean DEFAULT false NOT NULL,
  "location" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;
CREATE INDEX "calendar_events_user_start_idx" ON "calendar_events" ("user_id", "starts_at");
CREATE INDEX "calendar_events_project_id_idx" ON "calendar_events" ("project_id");
