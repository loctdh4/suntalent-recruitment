# Kiến Trúc & Tech Stack — SunTalent

> Mục tiêu thiết kế: **chi phí ~0đ** (ưu tiên free tier), **deploy miễn phí**, dùng
> **Next.js full-stack** làm trung tâm (không tách backend riêng cho MVP).
> Tham chiếu yêu cầu: [requirement-v2.md](requirement-v2.md).

---

## 1. Nguyên Tắc Thiết Kế
1. **Một codebase Next.js** (App Router) lo cả frontend + backend (Server Actions / Route Handlers). Không dựng API server riêng.
2. **Quy mô mục tiêu: ~5000 CV.** Ở quy mô này Supabase (DB 500MB + Auth built-in) là đủ và gọn nhất; chỉ tách **file CV sang Cloudflare R2 (10GB)** vì storage 1GB của Supabase không đủ dư địa cho 5000 PDF.
3. **Auth dùng built-in của Supabase** (kèm RLS) → không cần thêm thư viện auth.
4. **AI dùng free tier** (Gemini / Groq) cho parsing & embeddings; có đường nâng cấp lên model trả phí (Claude) khi cần chất lượng cao hơn.
5. **Ưu tiên thư viện có sẵn:** tận dụng thư viện/component đã được kiểm chứng thay vì tự viết lại; UI dùng **shadcn/ui** + Tailwind.
6. **Tránh khóa cứng (lock-in):** lớp AI và lớp DB tách qua interface để đổi nhà cung cấp dễ dàng.

---

## 2. Sơ Đồ Tổng Quan

```
                    ┌─────────────────────────────────────────┐
                    │            Next.js (App Router)           │
                    │   Cloudflare Pages / Vercel (free)        │
   Browser  ───────►│                                           │
   (Recruiter)      │  ┌─ UI (React Server + Client Components)  │
                    │  ┌─ Server Actions / Route Handlers        │
                    │  ┌─ Supabase Auth (RBAC + RLS)             │
                    │  └─ kiểm quyền ở tầng server               │
                    └──┬──────────┬──────────┬──────────────────┘
                       │          │          │
            ┌──────────▼──┐  ┌────▼──────┐  ┌▼───────────────────┐
            │  Supabase   │  │ R2 (10GB) │  │  Inngest (free)    │
            │ - Postgres  │  │  file CV  │  │  background jobs:  │
            │ - pgvector  │  │  gốc      │  │  parse CV + embed  │
            │ - Auth+RLS  │  └───────────┘  └──────┬─────────────┘
            │  (500MB DB) │                        │
            └─────────────┘                 ┌──────▼─────────────┐
                                            │  LLM API (free)    │
                                            │  Gemini / Groq     │
                                            │  - trích xuất CV   │
                                            │  - tạo embeddings  │
                                            └────────────────────┘
              ┌────────────────┐
              │  Resend (free) │  email/thông báo (giai đoạn 2)
              └────────────────┘
```

---

## 3. Tech Stack Chi Tiết

| Lớp | Lựa chọn | Vì sao / Free tier (kiểm tra lại trước khi chốt) |
|---|---|---|
| **Framework** | **Next.js 15 (App Router) + TypeScript** | Full-stack một codebase; Server Actions thay cho REST API. |
| **UI** | **Tailwind CSS + shadcn/ui** | Miễn phí, không phụ thuộc dịch vụ; component sẵn. |
| **Hosting** | **Cloudflare Pages** (chính) hoặc **Vercel Hobby** | Deploy Next.js miễn phí, CI/CD từ Git sẵn. Ưu tiên Cloudflare vì free cho cả thương mại; Vercel Hobby về lý thuyết *không cho dùng thương mại* — xem mục 9. |
| **Database** | **Supabase Postgres** | Free **500MB** — dư cho ~5000 hồ sơ + embeddings. |
| **Vector search** | **pgvector** (trong Supabase) | Có sẵn; lưu embeddings cùng Postgres, không cần vector DB riêng. |
| **Auth + RBAC** | **Supabase Auth + RLS** | Built-in, free ~50K MAU; không phải thêm thư viện auth. RLS thực thi quyền ngay ở DB. |
| **File CV** | **Cloudflare R2** | Free **10GB storage**, 1M Class A / 10M Class B ops/tháng, **egress miễn phí**. Tách riêng vì 5000 PDF vượt trần 1GB của Supabase Storage. |
| **Trích text từ CV** | `pdf-parse` / `unpdf` (PDF text); fallback **Gemini vision** cho PDF scan/ảnh | Chạy trong Node; OCR qua Gemini đa phương thức (free) khi PDF là ảnh. |
| **Trích cấu trúc + embeddings** | **Google Gemini API** (free tier) hoặc **Groq** (free) | Gemini Flash + text-embedding free tier rộng. |
| **Background jobs** | **Inngest** (free) hoặc Upstash QStash | Parse CV + gọi LLM vượt giới hạn thời gian serverless → đẩy nền. |
| **Email/Thông báo** | **Resend** (free ~3K email/tháng) | Giai đoạn 2. |
| **Validation** | **Zod** | Kiểm tra dữ liệu ở Server Actions. |
| **ORM/Client** | **Drizzle** hoặc `supabase-js` | Drizzle type-safe cho query; hoặc dùng `supabase-js` trực tiếp (kèm Auth/RLS). |

> 💡 **Vì sao gần như all-in-one?** Supabase lo DB + pgvector + Auth + RLS trong một dịch vụ.
> Chỉ tách **file CV sang R2** vì 5000 PDF vượt trần storage 1GB của Supabase. Đây là tổ hợp
> gọn nhất cho quy mô ~5000 CV. Nếu sau này DB phình to vượt 500MB → cân nhắc Neon hoặc Supabase Pro.

---

## 4. Cấu Trúc Thư Mục Next.js (đề xuất)

```
src/
  app/
    (auth)/login/                 # đăng nhập
    (dashboard)/
      candidates/                 # Talent DB: list, [id] hồ sơ
      jobs/                       # Job Management: list, [id], [id]/matches
      pipeline/                   # Recruitment Pipeline (kanban)
      insights/                   # Dashboard (giai đoạn 2)
    api/
      ingest/route.ts             # webhook nhận file → enqueue job
      inngest/route.ts            # endpoint cho Inngest
  lib/
    db/                           # Drizzle schema + queries
    ai/
      provider.ts                 # interface LLM (đổi Gemini↔Claude dễ)
      parse-cv.ts                 # CV text → JSON cấu trúc
      embeddings.ts               # tạo vector
    matching/
      engine.ts                   # lõi matching (mục 6)
      explain.ts                  # sinh giải thích điểm số
    auth/                         # helper RBAC
  inngest/
    functions/parse-candidate.ts  # job nền: parse + embed + de-dup
```

---

## 5. Data Model (rút gọn — bảng chính)

```
candidates        (id, full_name, email, phone, location, years_exp,
                   summary, raw_cv_url, source, status, embedding vector(768),
                   created_by, created_at)
candidate_skills  (candidate_id, skill_id, level, years)
skills            (id, name, canonical_name)          -- skill taxonomy
work_experiences  (id, candidate_id, company, title, start, end, description)

jobs              (id, title, client_id, owner_id, location, salary_range,
                   description, required_skills[], status, embedding vector(768))
clients           (id, name, ...)

applications      (id, candidate_id, job_id, stage, history jsonb, created_at)
                  -- stage: new|screening|internal_iv|client_iv|offer|hired|rejected

interactions      (id, candidate_id, type, note, contacted_at, by)  -- CRM
match_scores      (candidate_id, job_id, score, breakdown jsonb, computed_at) -- cache
audit_log         (id, actor_id, action, entity, entity_id, at)
```

- **De-dup:** so khớp email/phone + similarity tên → hợp nhất hoặc đánh dấu trùng.
- **Phân quyền:** dùng **RLS policy** của Supabase theo `created_by`/team để thực thi quyền chia sẻ dữ liệu ngay ở DB (chốt mô hình chia sẻ ở [requirement-v2.md](requirement-v2.md) mục 2).

---

## 6. Matching Engine (lõi sản phẩm)

Kết hợp **3 tín hiệu** để vừa chính xác vừa giải thích được:

1. **Hard filter (SQL):** loại nhanh theo điều kiện cứng — địa điểm, năm KN tối thiểu, trạng thái tìm việc. Giảm tập ứng viên trước khi tính nặng.
2. **Semantic similarity (pgvector):** cosine giữa `embedding` của job và candidate → bắt được sự phù hợp ngữ nghĩa dù từ ngữ khác nhau.
3. **Skill overlap (rule-based, có trọng số):** so khớp kỹ năng yêu cầu vs. kỹ năng ứng viên → ra danh sách **kỹ năng đáp ứng** và **điểm còn thiếu**.

```
score = w1 * semantic_sim + w2 * skill_match_ratio + w3 * experience_fit
```

- **Explainability:** `breakdown` lưu rõ từng thành phần + danh sách skill khớp/thiếu → hiển thị "vì sao 85%".
- **Use case (cùng engine, khác bộ lọc):**
  - *Rediscovery:* chạy Job→Candidate ngay khi tạo job.
  - *Hidden Talent:* thêm filter "chưa từng được giới thiệu / từng bị loại ở vòng trước".
  - *Candidate→Job:* đảo chiều, query embedding ứng viên vào tập jobs đang mở.
- **Cache** `match_scores` để tránh tính lại; chỉ tính lại khi job/candidate đổi.

---

## 7. Luồng Nhập CV (bất đồng bộ)

```
Upload file → Cloudflare R2 (presigned URL)
   → /api/ingest tạo candidate (status=parsing) + enqueue Inngest
      → Inngest job:
         1. tải file từ R2, trích text (pdf-parse; nếu PDF scan → Gemini vision OCR)
         2. LLM trích cấu trúc → JSON (Zod validate)
         3. tạo embedding → lưu pgvector (Supabase)
         4. de-dup check
         5. status=ready
   → UI cập nhật realtime (Supabase Realtime) khi xong
```

Lý do tách job nền: parse + gọi LLM thường vượt giới hạn thời gian function của Vercel Hobby (~10s).

---

## 8. Auth & RBAC
- **Supabase Auth** (email/password hoặc magic link — đều free), built-in không cần thêm thư viện.
- 3 vai trò: `recruiter`, `manager`, `admin` (lưu trong bảng `profiles`).
- **RLS policy** thực thi ở tầng DB → an toàn kể cả khi gọi trực tiếp từ client.
- **Audit log** ghi mọi hành động xem/sửa/xuất hồ sơ (yêu cầu pháp lý).

---

## 9. Giới Hạn Free Tier & Khi Nào Cần Nâng Cấp

*(Số liệu xác minh từ trang pricing tháng 6/2026 — vẫn nên kiểm lại trước khi chốt vì các hãng đổi gói thường xuyên.)*

| Vấn đề | Giới hạn free (đã kiểm chứng) | Khi nào "đụng trần" → giải pháp |
|---|---|---|
| **Hosting thương mại** | Cloudflare Pages: free cho cả thương mại. Vercel Hobby: chỉ phi thương mại | Dùng Cloudflare Pages ngay từ đầu nếu là sản phẩm công ty; hoặc Vercel Pro (~$20) |
| **Supabase DB** | **500 MB** | Dư cho ~5000 hồ sơ + embeddings; vượt → Supabase Pro (~$25) hoặc chuyển DB sang Neon |
| **Supabase pause** | Pause sau **1 tuần** không hoạt động | Team dùng hằng ngày thì vô hại; nếu dùng ngắt quãng → cron ping giữ sống |
| **R2 storage (file CV)** | **10 GB**, egress miễn phí | ~20K–50K CV (thừa cho mục tiêu 5000); vượt → R2 trả phí (~$0.015/GB/tháng) |
| **LLM free quota** | Gemini/Groq giới hạn request/phút & /ngày | Bulk import 5000 CV sẽ chậm → xếp hàng job nền + cache; nâng Gemini paid hoặc **Claude** (Haiku rẻ) cho chất lượng |
| **Function timeout** | Vercel Hobby ~10s | Đã xử lý bằng Inngest (job nền) |

> Về AI: **free** dùng Gemini/Groq là hợp lý cho MVP. Nếu cần chất lượng trích xuất/đánh giá
> cao hơn (CV phức tạp, đa ngôn ngữ), đường nâng cấp là **Claude** (vd Haiku cho rẻ/nhanh,
> Opus cho khó) — nhờ lớp `lib/ai/provider.ts` nên đổi không phải sửa nhiều.

---

## 10. Lộ Trình Triển Khai (khớp MVP ở requirement-v2)
1. **Tuần 1–2:** scaffold Next.js + Supabase (DB + Auth + RLS) + R2 + schema cơ bản.
2. **Tuần 3–4:** Talent DB CRUD + upload CV + parsing pipeline (Inngest + Gemini).
3. **Tuần 5–6:** Matching Engine (filter + pgvector + skill overlap) + explainability + trang Job→Candidate.
4. **Tuần 7:** Recruitment Pipeline (kanban) + Job Management.
5. **Tuần 8:** Search/Filter, audit log, hoàn thiện & deploy.
6. *Sau MVP:* CRM, Hidden Talent, Notifications, Dashboard đầy đủ, tích hợp nguồn ngoài.

---

## 11. Tóm Tắt Chi Phí
- **MVP / 5000 CV: ~0đ/tháng** — Next.js trên Cloudflare Pages + Supabase + R2 + Gemini/Groq + Inngest, tất cả free tier.
- **Khi cần nâng: ~$25–40/tháng** — chủ yếu Supabase Pro (~$25, khi vượt 500MB DB hoặc cần bỏ pause) + LLM trả phí cho bulk parsing.
- **Chi phí phát sinh** chủ yếu từ: nâng Supabase Pro, model AI trả phí, hoặc hosting thương mại trên Vercel (tránh được bằng Cloudflare Pages).
```
