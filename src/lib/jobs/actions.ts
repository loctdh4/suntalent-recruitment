"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { assertRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { jobs, jobRecruiters } from "@/lib/db/schema";
import { embedText, jobProfileText } from "@/lib/ai/embeddings";
import { presignUpload } from "@/lib/storage";
import { todayVN } from "@/lib/format";
import { JOB_MANAGER_ROLES, JOB_STATUS_EDITOR_ROLES } from "./constants";

export type JobActionState = { error?: string; ok?: boolean } | undefined;

/** Tạo embedding cho job (best-effort) để phục vụ matching ngữ nghĩa. */
async function embedJob(
  jobId: string,
  title: string,
  requiredSkills: string[],
  description?: string,
) {
  try {
    const text = jobProfileText({
      title,
      requiredSkills,
      description: description?.replace(/<[^>]*>/g, " "),
    });
    const embedding = await embedText(text);
    await db.update(jobs).set({ embedding }).where(eq(jobs.id, jobId));
  } catch {
    // Bỏ qua nếu chưa có embedding provider — matching fallback theo kỹ năng.
  }
}

/** Chuỗi rỗng → undefined; số có dấu phân cách → number. */
function toInt(v: FormDataEntryValue | null): number | undefined {
  if (v == null) return undefined;
  const digits = String(v).replace(/[^\d]/g, "");
  return digits ? Number(digits) : undefined;
}

const schema = z.object({
  title: z.string().min(1, "Nhập tên vị trí"),
  clientId: z.string().uuid().optional(),
  location: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  remote: z.boolean().default(false),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
  minYears: z.number().int().nonnegative().optional(),
  description: z.string().trim().optional(),
  requiredSkills: z.array(z.string()).default([]),
  jdUrl: z.string().trim().optional(),
  headcount: z.number().int().positive().default(1),
  contractValue: z.number().int().nonnegative().optional(),
  warrantyMonths: z.number().int().positive().max(60).default(1),
  signedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kí hợp đồng không hợp lệ"),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
});

function parseJobForm(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    clientId: formData.get("clientId") || undefined,
    location: formData.get("location") ?? undefined,
    industry: formData.get("industry") ?? undefined,
    remote: formData.get("remote") === "true",
    priority: formData.get("priority") || "normal",
    minYears: toInt(formData.get("minYears")),
    description: formData.get("description") ?? undefined,
    requiredSkills: String(formData.get("requiredSkills") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    jdUrl: formData.get("jdUrl") ?? undefined,
    headcount: toInt(formData.get("headcount")) ?? 1,
    contractValue: toInt(formData.get("contractValue")),
    warrantyMonths: toInt(formData.get("warrantyMonths")) ?? 1,
    signedAt: String(formData.get("signedAt") ?? "") || todayVN(),
    salaryMin: toInt(formData.get("salaryMin")),
    salaryMax: toInt(formData.get("salaryMax")),
  });
}

export async function createJob(
  _prev: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  const user = await assertRole([...JOB_MANAGER_ROLES]);

  const parsed = parseJobForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const d = parsed.data;

  const [created] = await db
    .insert(jobs)
    .values({
      title: d.title,
      clientId: d.clientId ?? null,
      ownerId: user.id,
      location: d.location,
      industry: d.industry,
      remote: d.remote,
      priority: d.priority,
      minYears: d.minYears,
      headcount: d.headcount,
      contractValue: d.contractValue,
      warrantyMonths: d.warrantyMonths,
      signedAt: d.signedAt,
      salaryMin: d.salaryMin,
      salaryMax: d.salaryMax,
      description: d.description,
      jdUrl: d.jdUrl || null,
      requiredSkills: d.requiredSkills,
    })
    .returning({ id: jobs.id });

  await embedJob(created.id, d.title, d.requiredSkills, d.description);

  revalidatePath("/jobs");
  redirect(`/jobs/${created.id}`);
}

/** Cập nhật thông tin vị trí (sales/manager/admin). */
export async function updateJob(
  _prev: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  await assertRole([...JOB_MANAGER_ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã vị trí" };

  const parsed = parseJobForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const d = parsed.data;

  await db
    .update(jobs)
    .set({
      title: d.title,
      clientId: d.clientId ?? null,
      location: d.location,
      industry: d.industry,
      remote: d.remote,
      priority: d.priority,
      minYears: d.minYears,
      headcount: d.headcount,
      contractValue: d.contractValue,
      warrantyMonths: d.warrantyMonths,
      signedAt: d.signedAt,
      salaryMin: d.salaryMin,
      salaryMax: d.salaryMax,
      description: d.description,
      jdUrl: d.jdUrl || null,
      requiredSkills: d.requiredSkills,
    })
    .where(eq(jobs.id, id));

  await embedJob(id, d.title, d.requiredSkills, d.description);

  revalidatePath(`/jobs/${id}`);
  revalidatePath("/jobs");
  redirect(`/jobs/${id}`);
}

type JdPresign = {
  error?: string;
  fileKey?: string;
  token?: string;
  path?: string;
  bucket?: string;
};

/** Tạo link tải file JD lên storage. */
export async function presignJdUpload(
  fileName: string,
  contentType: string,
): Promise<JdPresign> {
  await assertRole([...JOB_MANAGER_ROLES]);
  try {
    const fileKey = `jd/${crypto.randomUUID()}-${fileName}`;
    const { token, path, bucket } = await presignUpload(
      fileKey,
      contentType || "application/pdf",
    );
    return { fileKey, token, path, bucket };
  } catch {
    return { error: "Không tạo được link tải JD" };
  }
}

/** Lưu file JD đính kèm cho job. */
export async function setJobJd(
  jobId: string,
  fileKey: string,
): Promise<JobActionState> {
  await assertRole([...JOB_MANAGER_ROLES]);
  await db.update(jobs).set({ jdUrl: fileKey }).where(eq(jobs.id, jobId));
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

/** Gỡ file JD khỏi job. */
export async function removeJobJd(jobId: string): Promise<JobActionState> {
  await assertRole([...JOB_MANAGER_ROLES]);
  await db.update(jobs).set({ jdUrl: null }).where(eq(jobs.id, jobId));
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

/** Gán recruiter phụ trách job. */
export async function assignRecruiter(
  jobId: string,
  recruiterId: string,
): Promise<JobActionState> {
  await assertRole([...JOB_MANAGER_ROLES]);
  await db
    .insert(jobRecruiters)
    .values({ jobId, recruiterId })
    .onConflictDoNothing();
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

const jobPriorityEnum = z.enum(["high", "normal", "low"]);

/** Cập nhật mức ưu tiên vị trí (admin/sale). */
export async function updateJobPriority(
  jobId: string,
  priority: string,
): Promise<JobActionState> {
  await assertRole(["admin", "sales"]);
  const p = jobPriorityEnum.safeParse(priority);
  if (!p.success) return { error: "Mức ưu tiên không hợp lệ" };
  await db.update(jobs).set({ priority: p.data }).where(eq(jobs.id, jobId));
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

const jobStatusEnum = z.enum(["open", "on_hold", "closed", "filled"]);

/** Cập nhật trạng thái vị trí (admin/sales/recruiter). */
export async function updateJobStatus(
  jobId: string,
  status: string,
): Promise<JobActionState> {
  await assertRole([...JOB_STATUS_EDITOR_ROLES]);
  const s = jobStatusEnum.safeParse(status);
  if (!s.success) return { error: "Trạng thái không hợp lệ" };
  await db.update(jobs).set({ status: s.data }).where(eq(jobs.id, jobId));
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { ok: true };
}

/** Gỡ recruiter khỏi job. */
export async function removeRecruiter(
  jobId: string,
  recruiterId: string,
): Promise<JobActionState> {
  await assertRole([...JOB_MANAGER_ROLES]);
  await db
    .delete(jobRecruiters)
    .where(
      and(eq(jobRecruiters.jobId, jobId), eq(jobRecruiters.recruiterId, recruiterId)),
    );
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}
