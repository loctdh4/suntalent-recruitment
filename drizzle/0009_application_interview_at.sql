-- Thời gian phỏng vấn khách hàng cho mỗi ứng tuyển.
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "interview_at" timestamptz;
