/** Vai trò được phép tạo/quản lý vị trí tuyển dụng. */
export const JOB_MANAGER_ROLES = ["sales", "sales_intern", "admin"] as const;

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

export const JOB_PRIORITY_LABEL: Record<string, string> = Object.fromEntries(
  JOB_PRIORITY_OPTIONS.map((o) => [o.value, o.label]),
);

/** Thứ tự sắp xếp (ưu tiên cao lên đầu). */
export const JOB_PRIORITY_RANK: Record<string, number> = {
  high: 0,
  normal: 1,
  low: 2,
};
