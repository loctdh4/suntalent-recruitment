-- Loại đối tác: doanh nghiệp (mặc định) hoặc cá nhân.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'business';
