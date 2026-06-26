import { redirect } from "next/navigation";
import { getCurrentUser } from "./user";

export type Role =
  | "recruiter"
  | "recruiter_intern"
  | "sales"
  | "sales_intern"
  | "admin";

/** Dùng trong Server Component/page: chuyển về /overview nếu không đủ quyền. */
export async function requireRole(roles: Role[]) {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role as Role)) {
    redirect("/overview");
  }
  return user;
}

/** Dùng trong Server Action: ném lỗi nếu không đủ quyền. */
export async function assertRole(roles: Role[]) {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role as Role)) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
  return user;
}
