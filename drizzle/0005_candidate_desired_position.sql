-- Incremental migration: vị trí công việc ứng viên đang tìm.
-- Chạy trong Supabase SQL Editor.

ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "desired_position" text;
