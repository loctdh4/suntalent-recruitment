import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  date,
  timestamp,
  jsonb,
  vector,
  real,
  primaryKey,
  index,
  serial,
} from "drizzle-orm/pg-core";

// Embedding dimension — phải khớp với model embedding đang dùng (Gemini text-embedding-004 = 768).
export const EMBEDDING_DIM = 768;

/** Người dùng hệ thống — vai trò recruiter | manager | admin (liên kết Supabase Auth user id). */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id của Supabase
  email: text("email").notNull(),
  fullName: text("full_name"),
  role: text("role", {
    enum: ["recruiter", "recruiter_intern", "sales", "sales_intern", "admin"],
  })
    .notNull()
    .default("recruiter"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Đối tác / khách hàng (công ty cần tuyển). */
export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  // Loại đối tác: doanh nghiệp (mặc định) hoặc cá nhân.
  type: text("type", { enum: ["business", "individual"] })
    .notNull()
    .default("business"),
  phone: text("phone"),
  email: text("email"),
  location: text("location"),
  note: text("note"),
  // Người đưa đối tác về (nhân viên tạo bản ghi).
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Danh mục ngành nghề / lĩnh vực (admin quản lý). */
export const industries = pgTable("industries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Skill taxonomy — chuẩn hóa kỹ năng để matching. */
export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  canonicalName: text("canonical_name").notNull(),
});

export const candidateStatus = [
  "parsing",
  "ready",
  "error",
] as const;

/** Ứng viên — hồ sơ lõi của Talent Database. */
export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: text("full_name"),
    email: text("email"),
    phone: text("phone"),
    location: text("location"),
    industry: text("industry"), // ngành nghề / lĩnh vực
    yearsExp: real("years_exp"),
    desiredPosition: text("desired_position"), // vị trí công việc ứng viên đang tìm
    summary: text("summary"),
    rawText: text("raw_text"), // text trích từ CV
    rawCvUrl: text("raw_cv_url"), // key file gốc trên R2
    source: text("source"),
    // Trạng thái tìm việc (recruiter cập nhật): unknown | looking | not_looking
    seekingStatus: text("seeking_status", {
      enum: ["unknown", "looking", "not_looking"],
    })
      .notNull()
      .default("unknown"),
    status: text("status", { enum: candidateStatus }).notNull().default("parsing"),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIM }),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("candidates_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
    index("candidates_email_idx").on(t.email),
  ],
);

export const candidateSkills = pgTable(
  "candidate_skills",
  {
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    level: text("level"),
    years: real("years"),
  },
  (t) => [primaryKey({ columns: [t.candidateId, t.skillId] })],
);

export const workExperiences = pgTable("work_experiences", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  company: text("company"),
  title: text("title"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  description: text("description"),
});

export const jobStatus = ["open", "on_hold", "closed", "filled"] as const;

/** Vị trí tuyển dụng. */
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: serial("code").notNull(), // mã job tự tăng (hiển thị 00001, 00002…)
    title: text("title").notNull(),
    clientId: uuid("client_id").references(() => clients.id),
    ownerId: uuid("owner_id").references(() => profiles.id),
    location: text("location"),
    industry: text("industry"), // ngành nghề / lĩnh vực
    remote: boolean("remote").notNull().default(false), // job remote → bỏ lọc địa điểm
    priority: text("priority", { enum: ["high", "normal", "low"] })
      .notNull()
      .default("normal"), // mức ưu tiên tuyển
    minYears: integer("min_years"), // số năm kinh nghiệm tối thiểu yêu cầu
    headcount: integer("headcount").notNull().default(1), // số lượng cần tuyển
    contractValue: bigint("contract_value", { mode: "number" }), // giá hợp đồng cho 1 vị trí (VND)
    // Ngày kí hợp đồng — mốc ghi nhận doanh thu theo tháng của sale.
    // Ngày dương lịch (không giờ) nên lưu `date`, tránh lệch múi giờ.
    signedAt: date("signed_at", { mode: "string" })
      .notNull()
      .default(sql`CURRENT_DATE`),
    // Gói bảo hành (tháng) — hết hạn kể từ ngày ứng viên cuối cùng onboard.
    warrantyMonths: integer("warranty_months").notNull().default(1),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    description: text("description"),
    jdUrl: text("jd_url"), // file JD đính kèm (key trên storage)
    requiredSkills: jsonb("required_skills").$type<string[]>().default([]),
    status: text("status", { enum: jobStatus }).notNull().default("open"),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIM }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("jobs_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const pipelineStage = [
  "new",
  "screening",
  "client_iv",
  "hired",
  "rejected",
] as const;

/** Liên kết ứng viên ↔ job + trạng thái pipeline. */
export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  stage: text("stage", { enum: pipelineStage }).notNull().default("new"),
  // Thời gian phỏng vấn khách hàng (khi chuyển sang giai đoạn PV khách hàng).
  interviewAt: timestamp("interview_at", { withTimezone: true }),
  // Ứng viên đã đến buổi phỏng vấn hay chưa.
  interviewAttended: boolean("interview_attended").default(false).notNull(),
  // Ngày ứng viên chính thức nhận việc (nhập khi chuyển sang "Đã nhận việc").
  // Là mốc chuẩn để tính bảo hành & doanh thu, thay cho ngày kéo thẻ.
  onboardAt: timestamp("onboard_at", { withTimezone: true }),
  // Lý do khi chuyển sang "Không phù hợp".
  rejectReason: text("reject_reason"),
  history: jsonb("history").$type<{ stage: string; at: string; by?: string }[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Gán recruiter phụ trách job (nhiều-nhiều). Sales/manager/admin gán. */
export const jobRecruiters = pgTable(
  "job_recruiters",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    recruiterId: uuid("recruiter_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.recruiterId] })],
);

/** CRM — lịch sử tương tác với ứng viên. */
export const interactions = pgTable("interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  type: text("type"),
  note: text("note"),
  contactedAt: timestamp("contacted_at", { withTimezone: true }).defaultNow().notNull(),
  by: uuid("by").references(() => profiles.id),
});

/** Cache điểm matching để tránh tính lại. */
export const matchScores = pgTable(
  "match_scores",
  {
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    breakdown: jsonb("breakdown").$type<Record<string, unknown>>(),
    computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.candidateId, t.jobId] })],
);

/** Audit log — yêu cầu pháp lý. */
export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => profiles.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});
