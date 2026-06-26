"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { assertRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { applications, pipelineStage } from "@/lib/db/schema";
import { CANDIDATE_MANAGER_ROLES } from "@/lib/candidates/constants";
import { STAGE_VALUES } from "./constants";

type Stage = (typeof pipelineStage)[number];

export type ApplicationActionState = { error?: string; ok?: boolean };

const stageEnum = z.enum(STAGE_VALUES as [string, ...string[]]);

/** Đổi giai đoạn pipeline của một application (ghi lịch sử). */
export async function updateApplicationStage(
  applicationId: string,
  stage: string,
  interviewAt?: string | null,
  rejectReason?: string | null,
): Promise<ApplicationActionState> {
  const user = await assertRole([...CANDIDATE_MANAGER_ROLES]);
  const s = stageEnum.safeParse(stage);
  if (!s.success) return { error: "Giai đoạn không hợp lệ" };

  const [app] = await db
    .select({ history: applications.history, jobId: applications.jobId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return { error: "Không tìm thấy ứng tuyển" };

  const history = [
    ...(app.history ?? []),
    { stage: s.data, at: new Date().toISOString(), by: user.id },
  ];
  const updates: Partial<typeof applications.$inferInsert> = {
    stage: s.data as Stage,
    history,
  };
  // Lưu thời gian PV khi chuyển sang giai đoạn PV khách hàng.
  if (s.data === "client_iv" && interviewAt) {
    updates.interviewAt = new Date(interviewAt);
  }
  // Lưu lý do khi chuyển sang "Không phù hợp".
  if (s.data === "rejected") {
    updates.rejectReason = rejectReason?.trim() || null;
  }
  await db.update(applications).set(updates).where(eq(applications.id, applicationId));

  revalidatePath("/pipeline");
  revalidatePath(`/jobs/${app.jobId}`);
  return { ok: true };
}

/** Cập nhật thời gian phỏng vấn của một application. */
export async function updateInterviewAt(
  applicationId: string,
  interviewAt: string | null,
): Promise<ApplicationActionState> {
  await assertRole([...CANDIDATE_MANAGER_ROLES]);
  const [app] = await db
    .select({ jobId: applications.jobId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return { error: "Không tìm thấy ứng tuyển" };

  await db
    .update(applications)
    .set({ interviewAt: interviewAt ? new Date(interviewAt) : null })
    .where(eq(applications.id, applicationId));
  revalidatePath(`/jobs/${app.jobId}`);
  revalidatePath("/pipeline");
  return { ok: true };
}

/** Đánh dấu ứng viên đã đến / chưa đến buổi phỏng vấn. */
export async function setInterviewAttended(
  applicationId: string,
  attended: boolean,
): Promise<ApplicationActionState> {
  await assertRole([...CANDIDATE_MANAGER_ROLES]);
  const [app] = await db
    .select({ jobId: applications.jobId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return { error: "Không tìm thấy ứng tuyển" };

  await db
    .update(applications)
    .set({ interviewAttended: attended })
    .where(eq(applications.id, applicationId));
  revalidatePath(`/jobs/${app.jobId}`);
  revalidatePath("/pipeline");
  return { ok: true };
}

/** Gỡ ứng viên khỏi pipeline của vị trí (xóa application). */
export async function removeApplication(
  applicationId: string,
): Promise<ApplicationActionState> {
  await assertRole([...CANDIDATE_MANAGER_ROLES]);
  const [app] = await db
    .select({ jobId: applications.jobId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return { error: "Không tìm thấy ứng tuyển" };

  await db.delete(applications).where(eq(applications.id, applicationId));
  revalidatePath(`/jobs/${app.jobId}`);
  revalidatePath("/pipeline");
  return { ok: true };
}

/** Thêm ứng viên vào một vị trí (tạo application ở giai đoạn "new"). */
export async function addCandidateToJob(
  jobId: string,
  candidateId: string,
): Promise<ApplicationActionState> {
  await assertRole([...CANDIDATE_MANAGER_ROLES]);

  // Mỗi ứng viên chỉ thuộc 1 vị trí (giai đoạn chưa "Không phù hợp").
  const [existing] = await db
    .select({ jobId: applications.jobId })
    .from(applications)
    .where(
      and(eq(applications.candidateId, candidateId), ne(applications.stage, "rejected")),
    )
    .limit(1);
  if (existing) {
    return {
      error:
        existing.jobId === jobId
          ? "Ứng viên đã có trong vị trí này."
          : "Ứng viên đang thuộc một vị trí khác (mỗi ứng viên chỉ ở 1 vị trí).",
    };
  }

  await db.insert(applications).values({
    jobId,
    candidateId,
    stage: "new",
    history: [{ stage: "new", at: new Date().toISOString() }],
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}
