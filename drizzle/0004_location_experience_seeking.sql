-- Incremental migration: yếu tố matching bổ sung.
-- Chạy trong Supabase SQL Editor.

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "remote" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "min_years" integer;
--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "seeking_status" text DEFAULT 'unknown' NOT NULL;
