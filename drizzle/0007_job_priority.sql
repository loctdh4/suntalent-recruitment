-- Incremental migration: mức ưu tiên tuyển cho job (high/normal/low).
-- Chạy trong Supabase SQL Editor.

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'normal' NOT NULL;
