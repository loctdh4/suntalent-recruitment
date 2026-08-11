/** Vai trò được phép tạo/quản lý vị trí tuyển dụng. */
export const JOB_MANAGER_ROLES = ["sales", "sales_intern", "admin"] as const;

/**
 * Xóa vị trí: admin xóa được mọi vị trí; sales chỉ xóa vị trí do chính mình tạo.
 * Dùng chung cho cả UI (ẩn nút) lẫn server action (chặn thật).
 */
export function canDeleteJob(
  role: string | undefined,
  userId: string | undefined,
  ownerId: string | null | undefined,
) {
  if (!role || !userId) return false;
  if (role === "admin") return true;
  if (!JOB_MANAGER_ROLES.includes(role as (typeof JOB_MANAGER_ROLES)[number]))
    return false;
  return !!ownerId && ownerId === userId;
}

/** Vai trò được phép cập nhật trạng thái vị trí (hr = recruiter). */
export const JOB_STATUS_EDITOR_ROLES = [
  "admin",
  "sales",
  "sales_intern",
  "recruiter",
  "recruiter_intern",
] as const;

export const JOB_STATUS_OPTIONS = [
  { value: "open", label: "Đang mở" },
  { value: "on_hold", label: "Tạm dừng" },
  { value: "closed", label: "Đã đóng" },
  { value: "filled", label: "Đã tuyển" },
] as const;

export const JOB_PRIORITY_OPTIONS = [
  { value: "high", label: "Ưu tiên cao" },
  { value: "normal", label: "Ưu tiên trung bình" },
  { value: "low", label: "Ưu tiên thấp" },
] as const;

/** Gói bảo hành (tháng) — tính từ ngày ứng viên cuối cùng onboard. */
export const WARRANTY_OPTIONS = [
  { value: 1, label: "1 tháng" },
  { value: 2, label: "2 tháng" },
  { value: 3, label: "3 tháng" },
  { value: 6, label: "6 tháng" },
  { value: 12, label: "12 tháng" },
] as const;

export function warrantyLabel(months: number) {
  return `${months} tháng`;
}

export const JOB_PRIORITY_LABEL: Record<string, string> = Object.fromEntries(
  JOB_PRIORITY_OPTIONS.map((o) => [o.value, o.label]),
);

/** Thứ tự sắp xếp (ưu tiên cao lên đầu). */
export const JOB_PRIORITY_RANK: Record<string, number> = {
  high: 0,
  normal: 1,
  low: 2,
};
