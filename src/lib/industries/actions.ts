"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { assertRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { industries } from "@/lib/db/schema";

export type IndustryActionState = { error?: string; ok?: boolean } | undefined;

/** Thêm ngành nghề (admin). */
export async function createIndustry(
  _prev: IndustryActionState,
  formData: FormData,
): Promise<IndustryActionState> {
  await assertRole(["admin"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nhập tên ngành nghề" };
  await db.insert(industries).values({ name }).onConflictDoNothing();
  revalidatePath("/industries");
  return { ok: true };
}

/** Xóa ngành nghề (admin). */
export async function deleteIndustry(id: string): Promise<IndustryActionState> {
  await assertRole(["admin"]);
  await db.delete(industries).where(eq(industries.id, id));
  revalidatePath("/industries");
  return { ok: true };
}
