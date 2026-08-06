/** Lệch múi giờ VN so với UTC — mốc đầu/cuối tháng tính theo giờ VN. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** 00:00 ngày 1 của tháng (giờ VN) quy về UTC. Tháng 13 → tháng 1 năm sau. */
export function vnMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1) - VN_OFFSET_MS);
}

/** Tháng/năm hiện tại theo giờ VN. */
export function currentVnMonth(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const [y, m] = parts.split("-").map(Number);
  return { year: y, month: m };
}

export const MONTH_OPTIONS = [
  { value: "all", label: "Cả năm" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `Tháng ${i + 1}`,
  })),
];

export type Period = {
  year: number;
  /** `null` = cả năm. */
  month: number | null;
  since: Date;
  until: Date;
  label: string;
};

/** Chuẩn hóa searchParams `month`/`year` thành kỳ đánh giá; sai/thiếu → tháng hiện tại. */
export function resolvePeriod(
  rawMonth: string | undefined,
  rawYear: string | undefined,
): Period {
  const now = currentVnMonth();
  const y = Number(rawYear);
  const year = Number.isInteger(y) && y >= 2000 && y <= now.year + 1 ? y : now.year;

  if (rawMonth === "all") {
    return {
      year,
      month: null,
      since: vnMonthStart(year, 1),
      until: vnMonthStart(year + 1, 1),
      label: `Năm ${year}`,
    };
  }
  const m = Number(rawMonth);
  const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : now.month;
  return {
    year,
    month,
    since: vnMonthStart(year, month),
    until: vnMonthStart(year, month + 1),
    label: `Tháng ${month}/${year}`,
  };
}

export const ROLE_LABEL: Record<string, string> = {
  recruiter: "HR",
  recruiter_intern: "HR intern",
  sales: "Sales",
  sales_intern: "Sale intern",
  admin: "Manager",
};

/** Vai trò intern — hiển thị badge riêng. */
export function isIntern(role: string) {
  return role === "sales_intern" || role === "recruiter_intern";
}

/**
 * Trọng số điểm hiệu suất. Mỗi chỉ số được chuẩn hóa theo người dẫn đầu nhóm
 * rồi nhân trọng số, quy về thang 0–100 (100 = dẫn đầu mọi chỉ số).
 */
export const SALES_WEIGHTS = {
  hired: 0.35,
  revenue: 0.25,
  newClients: 0.2,
  newJobs: 0.2,
};

export const HR_WEIGHTS = {
  hired: 0.35,
  newCvs: 0.25,
  interviews: 0.2,
  apps: 0.2,
};
