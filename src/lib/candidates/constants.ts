/** Vai trò được phép upload/quản lý ứng viên. */
export const CANDIDATE_MANAGER_ROLES = [
  "recruiter",
  "recruiter_intern",
  "admin",
] as const;

export const CANDIDATE_STATUS_LABEL: Record<string, string> = {
  parsing: "Đang xử lý",
  ready: "Sẵn sàng",
  error: "Lỗi",
};

export const SEEKING_LABEL: Record<string, string> = {
  unknown: "Chưa rõ",
  looking: "Đang tìm việc",
  not_looking: "Không tìm việc",
};
