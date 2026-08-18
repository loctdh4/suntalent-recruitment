/** Suy ra tình trạng & nhật ký của một vị trí — dùng chung cho bảng Sale và HR. */

export type DealStatus = "done" | "warranty" | "running";

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  done: "Hoàn thành",
  warranty: "Bảo hành",
  running: "Đang tiến hành",
};

type HistoryEntry = { stage: string; at: string; by?: string };

/** "4/6" — ngày/tháng giờ VN, khớp cách ghi trong file doanh thu thủ công. */
const dayMonthFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "numeric",
  month: "numeric",
});

function addMonths(d: Date, months: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

/**
 * Chưa đủ người → đang tiến hành. Đủ người mà còn hạn bảo hành (tính từ ngày
 * người cuối onboard) → bảo hành. Hết hạn, hoặc vị trí đã đóng → hoàn thành.
 */
export function dealStatus({
  hired,
  headcount,
  jobStatus,
  lastHire,
  warrantyMonths,
  now,
}: {
  hired: number;
  headcount: number;
  jobStatus: string;
  lastHire: Date | undefined;
  warrantyMonths: number;
  now: Date;
}): DealStatus {
  if (hired >= headcount && lastHire) {
    return addMonths(lastHire, warrantyMonths) > now ? "warranty" : "done";
  }
  if (jobStatus === "closed" || jobStatus === "filled") return "done";
  return "running";
}

/**
 * Ngày ứng viên onboard. Ưu tiên `applications.onboard_at` (người dùng nhập khi
 * kéo sang "Đã nhận việc"); hồ sơ cũ chưa có cột này thì suy từ lịch sử, cuối
 * cùng mới lấy ngày tạo ứng tuyển.
 */
export function hiredDate(app: {
  onboardAt?: Date | null;
  createdAt: Date;
  history: unknown;
}): Date {
  if (app.onboardAt) return app.onboardAt;
  const entry = ((app.history ?? []) as HistoryEntry[])
    .filter((h) => h.stage === "hired")
    .pop();
  const d = entry?.at ? new Date(entry.at) : app.createdAt;
  return Number.isNaN(d.getTime()) ? app.createdAt : d;
}

type AppForLog = {
  stage: string;
  rejectReason: string | null;
  createdAt: Date;
  onboardAt?: Date | null;
  history: unknown;
  candidateName: string | null;
  candidateEmail: string | null;
};

/**
 * Nhật ký onboard / dừng hợp tác của một vị trí, dạng "29/6: Nhã Uyên Onboard".
 * Ứng viên trượt vòng sàng lọc không ghi — chỉ người đã onboard rồi nghỉ.
 */
export function jobEventLog(apps: AppForLog[]): string[] {
  const events: { at: Date; text: string }[] = [];

  for (const a of apps) {
    const who = a.candidateName ?? a.candidateEmail ?? "Ứng viên";
    const history = (a.history ?? []) as HistoryEntry[];
    const hiredEntry = history.filter((h) => h.stage === "hired").pop();

    if (a.stage === "hired") {
      events.push({ at: hiredDate(a), text: `${who} Onboard` });
    } else if (a.stage === "rejected") {
      const rejectEntry = history.filter((h) => h.stage === "rejected").pop();
      if (hiredEntry && rejectEntry?.at) {
        events.push({
          at: new Date(rejectEntry.at),
          text: `${who} — ${a.rejectReason ?? "dừng hợp tác"}`,
        });
      }
    }
  }

  return events
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((e) => `${dayMonthFmt.format(e.at)}: ${e.text}`);
}
