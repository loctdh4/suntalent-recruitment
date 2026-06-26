/** Ngưỡng cảnh báo job "chậm/cần chú ý" (ngày). */
export const JOB_STALE_DAYS = 30; // mở lâu mà chưa đủ người
export const JOB_EMPTY_PIPELINE_DAYS = 7; // mở lâu nhưng chưa có ứng viên
export const JOB_NO_HR_DAYS = 3; // mở mà chưa giao HR

function ageInDays(createdAt: Date | string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

/**
 * Trả về danh sách lý do job cần chú ý (rỗng = bình thường).
 * Chỉ xét job đang mở.
 */
export function getJobAlertReasons(input: {
  status: string;
  createdAt: Date | string;
  headcount: number;
  totalApps: number;
  hired: number;
  hrCount: number;
}): string[] {
  if (input.status !== "open") return [];
  const age = ageInDays(input.createdAt);
  const reasons: string[] = [];

  if (age > JOB_STALE_DAYS && input.hired < input.headcount) {
    reasons.push(
      `Mở ${age} ngày, chưa đủ người (${input.hired}/${input.headcount})`,
    );
  }
  if (age >= JOB_EMPTY_PIPELINE_DAYS && input.totalApps === 0) {
    reasons.push(`Mở ${age} ngày, chưa có ứng viên`);
  }
  if (age >= JOB_NO_HR_DAYS && input.hrCount === 0) {
    reasons.push("Chưa giao HR phụ trách");
  }
  return reasons;
}
