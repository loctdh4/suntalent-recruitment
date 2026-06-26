@AGENTS.md

# SunTalent

SunTalent — nền tảng quản lý và khai thác nguồn ứng viên cho công ty tuyển dụng/headhunt (AI là tính năng hỗ trợ, không phải điểm nhấn marketing).
Yêu cầu & kiến trúc: `docs/requirement-v2.md`, `docs/architecture.md`. Quy mô mục tiêu: ~5000 CV.

## Stack
Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 · shadcn/ui ·
Supabase (Postgres + pgvector + Auth) · Drizzle ORM · Cloudflare R2 (file CV) ·
Inngest (job nền) · Google Gemini qua Vercel AI SDK (`ai` + `@ai-sdk/google`).

## Lệnh
- `pnpm dev` — chạy dev
- `pnpm build` / `pnpm typecheck` — build / kiểm type
- `pnpm db:generate` / `pnpm db:push` — sinh & đẩy migration (Drizzle)
- Cài secrets theo `.env.example` trước khi chạy có DB/AI/R2.

## Cấu trúc chính
- `src/lib/db/` — Drizzle schema + client (lazy)
- `src/lib/ai/` — provider (đổi Gemini↔Claude tại đây), parse-cv, embeddings
- `src/lib/matching/` — engine (filter + semantic + skill overlap) + explain
- `src/lib/storage/r2.ts` — presigned upload/download R2
- `src/lib/supabase/` — server/client Auth helpers
- `src/inngest/` — client + functions (parse-candidate)
- `src/app/(dashboard)/` — candidates, jobs, pipeline, insights
- `src/app/api/ingest` — tạo ứng viên + presign + enqueue parse

## Lưu ý
- Next 16 có breaking changes (xem AGENTS.md) — `cookies()` là async.
- Phân quyền thực thi bằng Supabase RLS; ghi audit_log cho thao tác trên hồ sơ.
