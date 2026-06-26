"use server";

import { revalidatePath } from "next/cache";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { assertRole } from "@/lib/auth/guard";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { db } from "@/lib/db";
import { profiles, candidates, jobs } from "@/lib/db/schema";

const roleEnum = z.enum([
  "recruiter",
  "recruiter_intern",
  "sales",
  "sales_intern",
  "admin",
]);

export type TeamActionState = { error?: string; ok?: boolean } | undefined;

const createSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  fullName: z.string().min(1, "Nhập tên thành viên"),
  role: roleEnum,
});

/** Admin tạo thành viên mới (không qua self sign-up). */
export async function createTeamMember(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  await assertRole(["admin"]);

  const parsed = createSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const { email, password, fullName, role } = parsed.data;

  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) {
    return { error: error?.message ?? "Không tạo được tài khoản" };
  }

  await svc
    .from("profiles")
    .upsert({ id: data.user.id, email, full_name: fullName, role });

  revalidatePath("/team");
  return { ok: true };
}

/** Đổi vai trò thành viên. */
export async function updateMemberRole(
  id: string,
  role: string,
): Promise<TeamActionState> {
  await assertRole(["admin"]);
  const r = roleEnum.safeParse(role);
  if (!r.success) return { error: "Vai trò không hợp lệ" };

  await db.update(profiles).set({ role: r.data }).where(eq(profiles.id, id));
  revalidatePath("/team");
  return { ok: true };
}

/** Xóa thành viên (chặn nếu đang gắn dữ liệu hoặc tự xóa mình). */
export async function deleteMember(id: string): Promise<TeamActionState> {
  const admin = await assertRole(["admin"]);
  if (admin.id === id) return { error: "Không thể xóa chính tài khoản đang đăng nhập." };

  const [{ value: candCount }] = await db
    .select({ value: count() })
    .from(candidates)
    .where(eq(candidates.createdBy, id));
  const [{ value: jobCount }] = await db
    .select({ value: count() })
    .from(jobs)
    .where(eq(jobs.ownerId, id));
  if (candCount > 0 || jobCount > 0) {
    return { error: "Thành viên đang gắn với ứng viên/vị trí — không thể xóa." };
  }

  await db.delete(profiles).where(eq(profiles.id, id));
  const svc = createSupabaseServiceClient();
  const { error } = await svc.auth.admin.deleteUser(id);
  if (error) return { error: error.message };

  revalidatePath("/team");
  return { ok: true };
}
