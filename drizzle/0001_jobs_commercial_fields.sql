-- Incremental migration: thêm trường thương mại cho bảng jobs.
-- DÙNG KHI: bạn ĐÃ chạy migration 0000 trước đó (DB đã có bảng jobs).
-- (Role 'sales' không cần SQL vì cột "role" là text — chấp nhận giá trị mới ngay.)
-- Chạy trong Supabase SQL Editor.

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "headcount" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "contract_value" bigint;
