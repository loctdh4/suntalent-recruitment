"use server";

import { revalidatePath } from "next/cache";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { assertRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { clients, jobs } from "@/lib/db/schema";
import { CLIENT_MANAGER_ROLES } from "./constants";

export type ClientActionState = { error?: string; ok?: boolean } | undefined;

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || z.string().email().safeParse(v).success, "Email không hợp lệ");

const schema = z.object({
  name: z.string().trim().min(1, "Nhập tên đối tác"),
  type: z.enum(["business", "individual"]).default("business"),
  phone: z.string().trim().optional(),
  email: optionalEmail,
  location: z.string().trim().optional(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") || "business",
    phone: formData.get("phone") ?? undefined,
    email: formData.get("email") ?? undefined,
    location: formData.get("location") ?? undefined,
  });
}

export async function createClient(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const user = await assertRole([...CLIENT_MANAGER_ROLES]);
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  await db.insert(clients).values({
    name: parsed.data.name,
    type: parsed.data.type,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    location: parsed.data.location || null,
    createdBy: user.id,
  });
  revalidatePath("/clients");
  return { ok: true };
}

export type QuickClientState =
  | { error?: string; client?: { id: string; name: string } }
  | undefined;

/** Tạo nhanh đối tác (dùng trong form tạo job) và trả về bản ghi mới. */
export async function quickCreateClient(
  _prev: QuickClientState,
  formData: FormData,
): Promise<QuickClientState> {
  const user = await assertRole([...CLIENT_MANAGER_ROLES]);
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const [created] = await db
    .insert(clients)
    .values({
      name: parsed.data.name,
      type: parsed.data.type,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      location: parsed.data.location || null,
      createdBy: user.id,
    })
    .returning({ id: clients.id, name: clients.name });
  revalidatePath("/clients");
  return { client: created };
}

export async function updateClient(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  await assertRole([...CLIENT_MANAGER_ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã đối tác" };
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  await db
    .update(clients)
    .set({
      name: parsed.data.name,
    type: parsed.data.type,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      location: parsed.data.location || null,
    })
    .where(eq(clients.id, id));
  revalidatePath("/clients");
  return { ok: true };
}

export async function deleteClient(id: string): Promise<ClientActionState> {
  await assertRole([...CLIENT_MANAGER_ROLES]);
  const [{ value: jobCount }] = await db
    .select({ value: count() })
    .from(jobs)
    .where(eq(jobs.clientId, id));
  if (jobCount > 0) {
    return { error: "Đối tác đang gắn với vị trí tuyển dụng — không thể xóa." };
  }
  await db.delete(clients).where(eq(clients.id, id));
  revalidatePath("/clients");
  return { ok: true };
}
