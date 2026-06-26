-- Incremental migration: bảng gán recruiter cho job (nhiều-nhiều).
-- Chạy trong Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS "job_recruiters" (
	"job_id" uuid NOT NULL REFERENCES "jobs"("id") ON DELETE cascade,
	"recruiter_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE cascade,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_recruiters_pk" PRIMARY KEY ("job_id", "recruiter_id")
);
