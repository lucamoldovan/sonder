CREATE TABLE "notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "parent_id" uuid REFERENCES "notes"("id") ON DELETE CASCADE,
  "life_area_id" uuid REFERENCES "life_areas"("id") ON DELETE SET NULL,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL,
  "title" text DEFAULT 'Untitled' NOT NULL,
  "content" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "icon" text DEFAULT '📝',
  "tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "favorite" boolean DEFAULT false NOT NULL,
  "archived_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "notes_user_updated_idx" ON "notes" ("user_id", "updated_at");--> statement-breakpoint
CREATE INDEX "notes_parent_id_idx" ON "notes" ("parent_id");--> statement-breakpoint
CREATE INDEX "notes_project_id_idx" ON "notes" ("project_id");--> statement-breakpoint
CREATE INDEX "notes_life_area_id_idx" ON "notes" ("life_area_id");--> statement-breakpoint
