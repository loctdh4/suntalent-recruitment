# SETUP — Phase 1 (Nền tảng)

Làm theo các bước dưới rồi điền `.env.local`. Sau khi xong, báo lại để tôi `migrate` + test đăng nhập.

> Tạo file môi trường: `cp .env.example .env.local`

---

## 1. Supabase (DB + Auth + Storage)
1. Tạo project tại https://supabase.com (chọn region gần VN, vd Singapore).
2. **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (bấm Reveal) → `SUPABASE_SERVICE_ROLE_KEY` (SECRET, chỉ server)
3. **Connect (thanh trên) → Connection string → Transaction pooler** (port `6543`) → `DATABASE_URL`.
   Thay `[YOUR-PASSWORD]` bằng Database Password lúc tạo project.
4. Bật xác thực email/password: **Authentication → Providers → Email** (mặc định đã bật). Có thể tắt "Confirm email" khi dev để đăng nhập ngay.
5. **Tắt đăng ký công khai** (chỉ admin tạo user): **Authentication → Sign In / Providers** → tắt **"Allow new users to sign up"** (hoặc bật **Disable signup**). Sau đó người dùng chỉ được tạo qua `pnpm seed:admin` hoặc trang Admin (sẽ làm sau).

## 2. Supabase Storage (file CV — dùng trước mắt thay R2)
1. **Storage → New bucket** → tên `cvs` → để **Private** → Create.
2. Không cần cấu hình thêm: app thao tác storage bằng `service_role` key ở tầng server.
3. Đặt `STORAGE_BUCKET=cvs` trong `.env.local` (đã có sẵn trong `.env.example`).
> R2 để dành cho sau (khi cần >1GB) — bỏ trống các biến `R2_*`.

## 3. AI (đều free, không cần thẻ)
- **Groq** (trích xuất CV): https://console.groq.com/keys → `GROQ_API_KEY`. Model mặc định `openai/gpt-oss-20b` (hỗ trợ structured output).
- **Jina** (embedding cho matching ngữ nghĩa, đa ngôn ngữ): https://jina.ai/embeddings → `JINA_API_KEY`.
  Sau khi có key: vào **Ứng viên → "Tạo embedding"** để backfill cho dữ liệu đã có.

## 4. Inngest (để sau — Phase 2)
Chưa cần ở Phase 1. Khi tới phần parse CV: chạy `npx inngest-cli@latest dev` cho local.

---

## 5. Tạo bảng + RLS (sau khi có `DATABASE_URL`)

**Cách A — dán SQL (đơn giản, không lo connection mode):**
Mở **Supabase → SQL Editor**, dán & chạy lần lượt:
1. Nội dung `drizzle/0000_loving_scorpion.sql` (tạo bảng + bật pgvector)
2. Nội dung `drizzle/0001_jobs_commercial_fields.sql` (thêm headcount + contract_value)
3. Nội dung `supabase/rls.sql` (RLS + trigger tạo profile)

> **Đã chạy 0000 từ trước rồi?** Chỉ cần chạy thêm `drizzle/0001_jobs_commercial_fields.sql`
> (có `IF NOT EXISTS` nên an toàn). Role `sales` không cần SQL.

**Cách B — dùng Drizzle CLI:**
```bash
# tạm dùng Direct connection (5432) cho DATABASE_URL khi migrate
pnpm db:migrate
# rồi vẫn cần chạy supabase/rls.sql trong SQL Editor (RLS + trigger)
```

## 6. Tạo tài khoản admin (qua env)
Điền vào `.env.local`:
```
ADMIN_EMAIL=admin@suntalent.vn
ADMIN_PASSWORD=matkhau-manh
ADMIN_NAME=Administrator
```
Rồi chạy:
```bash
pnpm seed:admin
```
Script tạo user trên Supabase Auth (email đã xác nhận sẵn) và gán `role = admin`.
Chạy lại sẽ cập nhật mật khẩu — an toàn để chạy nhiều lần.

---

## 7. Chạy thử
```bash
pnpm dev
```
- Vào http://localhost:3000 → bị chuyển tới `/login`.
- Đăng nhập bằng user vừa tạo → vào `/overview`.
- Nút **Đăng xuất** ở header.

✅ Xong Phase 1. Báo tôi để chuyển **Phase 2 — Talent DB + upload CV + parse**.
