-- Danh mục ngành nghề/lĩnh vực + gán cho ứng viên & job.
CREATE TABLE IF NOT EXISTS "industries" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       text NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "industries" ("name") VALUES
  ('CNTT - Phần mềm'),
  ('Kế toán - Tài chính'),
  ('Ngân hàng - Bảo hiểm'),
  ('Bán hàng - Kinh doanh'),
  ('Marketing - Truyền thông'),
  ('Nhân sự'),
  ('Hành chính - Văn phòng'),
  ('Sản xuất'),
  ('Xây dựng'),
  ('Bất động sản'),
  ('Logistics - Vận tải'),
  ('Cơ khí - Tự động hóa'),
  ('Điện - Điện tử'),
  ('Y tế - Dược'),
  ('Giáo dục - Đào tạo'),
  ('Nhà hàng - Khách sạn (F&B)'),
  ('Du lịch'),
  ('Thiết kế - Sáng tạo'),
  ('Pháp lý'),
  ('Bán lẻ - Tiêu dùng')
ON CONFLICT ("name") DO NOTHING;

ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "industry" text;
ALTER TABLE "jobs"       ADD COLUMN IF NOT EXISTS "industry" text;
