-- Incremental migration: ngày kí hợp đồng của vị trí tuyển dụng.
-- Doanh thu theo tháng của sale tính theo cột này thay vì ngày tạo bản ghi.
-- Job cũ backfill bằng ngày tạo (quy về giờ VN).
-- Chạy trong Supabase SQL Editor.

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "signed_at" date;
--> statement-breakpoint
UPDATE "jobs"
SET "signed_at" = ("created_at" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
WHERE "signed_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "signed_at" SET DEFAULT CURRENT_DATE;
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "signed_at" SET NOT NULL;
