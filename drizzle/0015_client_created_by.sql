-- Người đưa đối tác về (nhân viên tạo bản ghi).
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "profiles"("id");
