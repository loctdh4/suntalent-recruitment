-- Lý do khi chuyển ứng tuyển sang "Không phù hợp".
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "reject_reason" text;
