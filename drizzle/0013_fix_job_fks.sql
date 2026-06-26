-- Sửa khóa ngoại đang trỏ nhầm sang "job_positions" về lại "jobs".
-- Idempotent — chạy lại nhiều lần an toàn. ⚠ Tắt app (pnpm dev) trước khi chạy.
SET statement_timeout = '5min';

-- 1) Bỏ TẤT CẢ FK cũ trên job_id (cả bản trỏ job_positions lẫn jobs) để gắn lại sạch.
ALTER TABLE "applications"   DROP CONSTRAINT IF EXISTS "applications_job_id_job_positions_fk";
ALTER TABLE "applications"   DROP CONSTRAINT IF EXISTS "applications_job_id_jobs_id_fk";
ALTER TABLE "job_recruiters" DROP CONSTRAINT IF EXISTS "job_recruiters_job_id_job_positions_fk";
ALTER TABLE "job_recruiters" DROP CONSTRAINT IF EXISTS "job_recruiters_job_id_jobs_id_fk";

-- 2) Dọn dòng "mồ côi" (job_id không có trong jobs) để bước 3 không lỗi.
DELETE FROM "applications"   WHERE "job_id" NOT IN (SELECT "id" FROM "jobs");
DELETE FROM "job_recruiters" WHERE "job_id" NOT IN (SELECT "id" FROM "jobs");

-- 3) Gắn lại FK trỏ đúng sang jobs.
ALTER TABLE "applications"
  ADD CONSTRAINT "applications_job_id_jobs_id_fk"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE;

ALTER TABLE "job_recruiters"
  ADD CONSTRAINT "job_recruiters_job_id_jobs_id_fk"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE;

-- 4) (Tùy chọn) Xóa bảng thừa không còn dùng.
DROP TABLE IF EXISTS "job_positions";
