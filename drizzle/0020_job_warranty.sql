-- Incremental migration: gói bảo hành cho vị trí tuyển dụng.
-- Dùng cho bảng doanh thu theo sale (cột "Gói bảo hành" + suy ra tình trạng).
-- Chạy trong Supabase SQL Editor.

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "warranty_months" integer NOT NULL DEFAULT 1;
