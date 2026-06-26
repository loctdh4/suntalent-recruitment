# SunTalent

Nền tảng quản lý và khai thác nguồn ứng viên cho công ty tuyển dụng/headhunt.
Quản lý toàn bộ quy trình tuyển dụng, đồng thời tìm và xếp hạng ứng viên phù hợp cho từng
vị trí dựa trên dữ liệu đã tích lũy (có hỗ trợ gợi ý thông minh).

- Yêu cầu sản phẩm: [docs/requirement-v2.md](docs/requirement-v2.md)
- Kiến trúc & tech stack: [docs/architecture.md](docs/architecture.md)

## Tech stack
Next.js 16 (App Router) · TypeScript · Tailwind 4 · shadcn/ui · Supabase (Postgres + pgvector + Auth) ·
Drizzle ORM · Cloudflare R2 · Inngest · Google Gemini (Vercel AI SDK).

## Bắt đầu

```bash
pnpm install
cp .env.example .env.local   # điền secrets Supabase / R2 / Gemini
pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Lệnh

| Lệnh | Mô tả |
|---|---|
| `pnpm dev` | Chạy dev server |
| `pnpm build` | Build production |
| `pnpm typecheck` | Kiểm tra TypeScript |
| `pnpm db:generate` | Sinh migration từ Drizzle schema |
| `pnpm db:push` | Đẩy schema lên DB |

## Cấu trúc
Xem [CLAUDE.md](CLAUDE.md) để biết tổng quan thư mục và quy ước.
