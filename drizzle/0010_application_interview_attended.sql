-- Đánh dấu ứng viên đã đến buổi phỏng vấn.
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "interview_attended" boolean DEFAULT false NOT NULL;
