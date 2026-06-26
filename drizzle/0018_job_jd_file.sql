-- File JD đính kèm cho vị trí (key trên storage).
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "jd_url" text;
