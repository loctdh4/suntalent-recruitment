import { todayVN } from "@/lib/format";

/** Ngưỡng cảnh báo job "chậm/cần chú ý" (ngày, tính từ ngày kí hợp đồng). */
export const JOB_STALE_DAYS = 30; // kí lâu mà chưa đủ người
export const JOB_EMPTY_PIPELINE_DAYS = 7; // kí lâu nhưng chưa có ứng viên
export const JOB_NO_HR_DAYS = 3; // kí rồi mà chưa giao HR

/**
 * Số ngày dương lịch (giờ VN) từ ngày kí hợp đồng tới hôm nay.
 * `signedAt` là chuỗi "YYYY-MM-DD"; so hai mốc cùng cách parse nên ra số
 * ngày tròn, không lệch do múi giờ máy chủ.
 */
export function daysSinceSigned(signedAt: string): number {
  const from = Date.parse(signedAt);
  if (Number.isNaN(from)) return 0;
  return Math.max(0, Math.floor((Date.parse(todayVN()) - from) / 86_400_000));
}

/**
 * Trả về danh sách lý do job cần chú ý (rỗng = bình thường).
 * Chỉ xét job đang mở.
 */
export function getJobAlertReasons(input: {
  status: string;
  /** Ngày kí hợp đồng, dạng "YYYY-MM-DD". */
  signedAt: string;
  headcount: number;
  totalApps: number;
  hired: number;
  hrCount: number;
}): string[] {
  if (input.status !== "open") return [];
  const age = daysSinceSigned(input.signedAt);
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
