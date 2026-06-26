"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { assertRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { candidates, candidateSkills, skills, applications } from "@/lib/db/schema";
import { presignUpload } from "@/lib/storage";
import { embedText, candidateProfileText } from "@/lib/ai/embeddings";
import { inngest, EVENTS } from "@/inngest/client";
import { processCandidate, markCandidateError } from "./process";
import { CANDIDATE_MANAGER_ROLES } from "./constants";

/**
 * Gửi job parse qua Inngest; nếu Inngest không khả dụng (dev server chưa chạy)
 * thì xử lý inline ngay để không cần chạy thêm tiến trình.
 */
async function enqueueOrProcess(candidateId: string, fileKey: string) {
  try {
    await inngest.send({
      name: EVENTS.candidateUploaded,
      data: { candidateId, fileKey },
    });
  } catch {
    try {
      await processCandidate(candidateId, fileKey);
    } catch {
      await markCandidateError(candidateId);
    }
  }
}

/** Gắn kỹ năng cho ứng viên (upsert vào skill taxonomy). */
async function linkSkills(candidateId: string, names: string[]) {
  for (const raw of names) {
    const name = raw.trim();
    const canonical = name.toLowerCase();
    if (!canonical) continue;
    const [existing] = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.canonicalName, canonical))
      .limit(1);
    const skillId =
      existing?.id ??
      (
        await db
          .insert(skills)
          .values({ name, canonicalName: canonical })
          .returning({ id: skills.id })
      )[0].id;
    await db
      .insert(candidateSkills)
      .values({ candidateId, skillId })
      .onConflictDoNothing();
  }
}

export type UploadInit = {
  candidateId: string;
  fileKey: string;
  token: string;
  path: string;
  bucket: string;
};

export type CandidateActionState = { error?: string; ok?: boolean };

const reqSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().default("application/pdf"),
  source: z.string().optional(),
});

export type PresignResult = {
  fileKey?: string;
  token?: string;
  path?: string;
  bucket?: string;
  error?: string;
};

/** Presign upload CV cho luồng thủ công (KHÔNG tạo record ứng viên). */
export async function presignCvUpload(
  fileName: string,
  contentType: string,
): Promise<PresignResult> {
  await assertRole([...CANDIDATE_MANAGER_ROLES]);
  try {
    const fileKey = `${crypto.randomUUID()}-${fileName}`;
    const { token, path, bucket } = await presignUpload(
      fileKey,
      contentType || "application/pdf",
    );
    return { fileKey, token, path, bucket };
  } catch {
    return { error: "Không tạo được link tải CV" };
  }
}

const manualSchema = z.object({
  fullName: z.string().trim().min(1, "Nhập họ tên"),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  desiredPosition: z.string().trim().optional(),
  yearsExp: z.number().nonnegative().optional(),
  skills: z.array(z.string()),
});

/** Lõi: tạo 1 ứng viên thủ công từ form, trả về id hoặc lỗi. */
async function createManualCandidate(
  formData: FormData,
  userId: string,
): Promise<{ id?: string; error?: string }> {
  const yearsRaw = String(formData.get("yearsExp") ?? "").replace(/[^\d.]/g, "");
  const parsed = manualSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    location: formData.get("location") || undefined,
    industry: formData.get("industry") || undefined,
    desiredPosition: formData.get("desiredPosition") || undefined,
    yearsExp: yearsRaw ? Number(yearsRaw) : undefined,
    skills: String(formData.get("skills") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const d = parsed.data;
  const rawCvUrl = String(formData.get("cvFileKey") ?? "").trim() || null;

  const [c] = await db
    .insert(candidates)
    .values({
      fullName: d.fullName,
      email: d.email,
      phone: d.phone,
      location: d.location,
      industry: d.industry,
      desiredPosition: d.desiredPosition,
      yearsExp: d.yearsExp,
      rawCvUrl,
      status: "ready",
      source: "manual",
      createdBy: userId,
    })
    .returning({ id: candidates.id });

  await linkSkills(c.id, d.skills);

  try {
    const embedding = await embedText(
      candidateProfileText({ desiredPosition: d.desiredPosition, skills: d.skills }),
    );
    await db.update(candidates).set({ embedding }).where(eq(candidates.id, c.id));
  } catch {
    // bỏ qua nếu chưa cấu hình embedding
  }
  return { id: c.id };
}

/** Tạo ứng viên thủ công (không cần CV) — vd lao động phổ thông. */
export async function createCandidateManual(
  _prev: CandidateActionState,
  formData: FormData,
): Promise<CandidateActionState> {
  const user = await assertRole([...CANDIDATE_MANAGER_ROLES]);
  const res = await createManualCandidate(formData, user.id);
  if (res.error) return { error: res.error };
  revalidatePath("/candidates");
  return { ok: true };
}

/** Cập nhật hồ sơ ứng viên từ trang chi tiết. */
export async function updateCandidate(
  _prev: CandidateActionState,
  formData: FormData,
): Promise<CandidateActionState> {
  await assertRole([...CANDIDATE_MANAGER_ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã ứng viên" };

  const yearsRaw = String(formData.get("yearsExp") ?? "").replace(/[^\d.]/g, "");
  const parsed = manualSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    location: formData.get("location") || undefined,
    industry: formData.get("industry") || undefined,
    desiredPosition: formData.get("desiredPosition") || undefined,
    yearsExp: yearsRaw ? Number(yearsRaw) : undefined,
    skills: String(formData.get("skills") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const d = parsed.data;
  const summary = String(formData.get("summary") ?? "").trim() || null;

  await db
    .update(candidates)
    .set({
      fullName: d.fullName,
      email: d.email ?? null,
      phone: d.phone ?? null,
      location: d.location ?? null,
      industry: d.industry ?? null,
      desiredPosition: d.desiredPosition ?? null,
      yearsExp: d.yearsExp ?? null,
      summary,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, id));

  // Cập nhật lại kỹ năng.
  await db.delete(candidateSkills).where(eq(candidateSkills.candidateId, id));
  await linkSkills(id, d.skills);

  // Re-embed (best-effort) vì hồ sơ đổi → matching chính xác hơn.
  try {
    const embedding = await embedText(
      candidateProfileText({
        desiredPosition: d.desiredPosition,
        summary,
        skills: d.skills,
      }),
    );
    await db.update(candidates).set({ embedding }).where(eq(candidates.id, id));
  } catch {
    // bỏ qua nếu chưa cấu hình embedding
  }

  revalidatePath(`/candidates/${id}`);
  revalidatePath("/candidates");
  return { ok: true };
}

/** Tạo ứng viên thủ công và thêm thẳng vào một vị trí. */
export async function createCandidateForJob(
  _prev: CandidateActionState,
  formData: FormData,
): Promise<CandidateActionState> {
  const user = await assertRole([...CANDIDATE_MANAGER_ROLES]);
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return { error: "Thiếu mã vị trí" };

  const res = await createManualCandidate(formData, user.id);
  if (res.error || !res.id) return { error: res.error ?? "Không tạo được ứng viên" };

  await db.insert(applications).values({
    jobId,
    candidateId: res.id,
    stage: "new",
    history: [{ stage: "new", at: new Date().toISOString(), by: user.id }],
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/candidates");
  return { ok: true };
}

/** Bước 1: tạo bản ghi ứng viên + presigned URL để client upload CV lên storage. */
export async function requestCvUpload(input: {
  fileName: string;
  contentType?: string;
  source?: string;
}): Promise<UploadInit> {
  const user = await assertRole([...CANDIDATE_MANAGER_ROLES]);
  const { fileName, contentType, source } = reqSchema.parse(input);

  const fileKey = `${crypto.randomUUID()}-${fileName}`;
  const [candidate] = await db
    .insert(candidates)
    .values({ rawCvUrl: fileKey, source, status: "parsing", createdBy: user.id })
    .returning({ id: candidates.id });

  const { token, path, bucket } = await presignUpload(
    fileKey,
    contentType ?? "application/pdf",
  );
  return { candidateId: candidate.id, fileKey, token, path, bucket };
}

/** Bước 3: sau khi client upload xong, enqueue job parse. */
export async function confirmCvUpload(
  candidateId: string,
  fileKey: string,
): Promise<CandidateActionState> {
  await assertRole([...CANDIDATE_MANAGER_ROLES]);
  await enqueueOrProcess(candidateId, fileKey);
  revalidatePath("/candidates");
  return { ok: true };
}

/** Parse lại CV (khi lỗi hoặc muốn cập nhật). */
export async function reprocessCandidate(
  candidateId: string,
): Promise<CandidateActionState> {
  await assertRole([...CANDIDATE_MANAGER_ROLES]);
  const [c] = await db
    .select({ fileKey: candidates.rawCvUrl })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!c?.fileKey) return { error: "Không tìm thấy file CV" };

  await db
    .update(candidates)
    .set({ status: "parsing" })
    .where(eq(candidates.id, candidateId));
  await enqueueOrProcess(candidateId, c.fileKey);
  revalidatePath(`/candidates/${candidateId}`);
  return { ok: true };
}

/** Cập nhật trạng thái tìm việc của ứng viên. */
export async function updateSeekingStatus(
  candidateId: string,
  status: string,
): Promise<CandidateActionState> {
  await assertRole([...CANDIDATE_MANAGER_ROLES]);
  const s = z.enum(["unknown", "looking", "not_looking"]).safeParse(status);
  if (!s.success) return { error: "Trạng thái không hợp lệ" };
  await db
    .update(candidates)
    .set({ seekingStatus: s.data, updatedAt: new Date() })
    .where(eq(candidates.id, candidateId));
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/candidates");
  return { ok: true };
}

/** Xóa ứng viên. */
export async function deleteCandidate(
  candidateId: string,
): Promise<CandidateActionState> {
  await assertRole([...CANDIDATE_MANAGER_ROLES]);
  await db.delete(candidates).where(eq(candidates.id, candidateId));
  revalidatePath("/candidates");
  return { ok: true };
}
