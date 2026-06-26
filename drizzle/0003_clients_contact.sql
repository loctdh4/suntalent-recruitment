-- Incremental migration: thêm thông tin liên hệ cho đối tác/khách hàng.
-- Chạy trong Supabase SQL Editor.

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "phone" text;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "email" text;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "location" text;
