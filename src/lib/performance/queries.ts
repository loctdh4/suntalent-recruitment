import { and, count, gte, lt, min } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  candidates,
  clients,
  jobRecruiters,
  jobs,
  profiles,
} from "@/lib/db/schema";
import { HR_WEIGHTS, currentVnMonth, type Period } from "./constants";
import { hiredDate } from "./deal";

const SALES_ROLES = ["sales", "sales_intern"];
const HR_ROLES = ["recruiter", "recruiter_intern"];

type Member = { id: string; name: string; email: string; role: string };

export type SalesRow = Member & {
  /** Đối tác mang về trong kỳ. */
  newClients: number;
  /** Vị trí kí hợp đồng trong kỳ. */
  newJobs: number;
  /** Tổng nhu cầu tuyển của các vị trí đó. */
  headcount: number;
  /** Ứng viên được đưa vào pipeline của các vị trí mình phụ trách. */
  apps: number;
  /** Buổi PV khách hàng đã diễn ra trong kỳ. */
  interviews: number;
  hired: number;
  /**
   * Doanh thu ước tính hợp đồng kí trong kỳ = giá hợp đồng × số lượng.
   * Không tính vị trí đã đóng (khách hủy) vì không thu được tiền.
   */
  revenue: number;
  /** hired / headcount (chỉ tính vị trí kí trong kỳ). */
  fillRate: number | null;
};

export type HrRow = Member & {
  /** Vị trí được giao phụ trách trong kỳ. */
  assignedJobs: number;
  /** CV tự thêm vào hệ thống. */
  newCvs: number;
  /** Ứng viên vào pipeline của vị trí mình phụ trách. */
  apps: number;
  interviews: number;
  /** Ứng viên thực sự đến buổi PV. */
  attended: number;
  hired: number;
  /** hired / apps. */
  convRate: number | null;
  score: number;
};

export type PerformanceData = {
  period: Period;
  sales: SalesRow[];
  hr: HrRow[];
  totals: {
    newClients: number;
    newJobs: number;
    newCvs: number;
    apps: number;
    interviews: number;
    hired: number;
    revenue: number;
  };
};

type HistoryEntry = { stage: string; at: string; by?: string };

/** Thời điểm ứng viên nhận việc — xem `hiredDate` (ưu tiên ngày onboard đã nhập). */
function hiredAt(app: {
  stage: string;
  createdAt: Date;
  onboardAt: Date | null;
  history: HistoryEntry[] | null;
}): Date | null {
  return app.stage === "hired" ? hiredDate(app) : null;
}

/** Chuẩn hóa theo giá trị lớn nhất trong nhóm rồi nhân trọng số → điểm 0–100. */
function scoreOf(
  row: Record<string, number>,
  max: Record<string, number>,
  weights: Record<string, number>,
) {
  let s = 0;
  for (const [key, w] of Object.entries(weights)) {
    const top = max[key] ?? 0;
    if (top > 0) s += (row[key] / top) * w;
  }
  return Math.round(s * 100);
}

/**
 * Tổng hợp hiệu suất team Sales & HR (gồm cả intern) trong một kỳ.
 *
 * Quy tắc quy công:
 * - Sales: theo vị trí mình sở hữu (`jobs.owner_id`, tính vào tháng kí hợp
 *   đồng) + đối tác mình tạo. Xếp hạng theo doanh thu ước tính, không chấm điểm.
 * - HR: theo vị trí được giao (`job_recruiters`) + CV mình thêm.
 *   Vị trí giao cho nhiều HR thì mỗi người được tính đủ (công dùng chung).
 */
export async function getPerformance(period: Period): Promise<PerformanceData> {
  const { since, until, sinceDate, untilDate } = period;
  const now = new Date();
  const inRange = (d: Date | null | undefined) => !!d && d >= since && d < until;
  // Vị trí tính theo ngày kí hợp đồng (cột `date`, so chuỗi "YYYY-MM-DD").
  const signedInRange = (d: string) => d >= sinceDate && d < untilDate;
  // Buổi PV chỉ tính khi đã diễn ra (lịch tương lai trong tháng chưa tính công).
  const happened = (d: Date | null | undefined) => inRange(d) && d! <= now;

  const [memberRows, jobRows, assignRows, appRows, clientRows, cvRows] =
    await Promise.all([
      db
        .select({
          id: profiles.id,
          name: profiles.fullName,
          email: profiles.email,
          role: profiles.role,
        })
        .from(profiles),
      db
        .select({
          id: jobs.id,
          ownerId: jobs.ownerId,
          headcount: jobs.headcount,
          contractValue: jobs.contractValue,
          status: jobs.status,
          signedAt: jobs.signedAt,
        })
        .from(jobs),
      db
        .select({
          jobId: jobRecruiters.jobId,
          recruiterId: jobRecruiters.recruiterId,
          assignedAt: jobRecruiters.assignedAt,
        })
        .from(jobRecruiters),
      db
        .select({
          jobId: applications.jobId,
          stage: applications.stage,
          interviewAt: applications.interviewAt,
          attended: applications.interviewAttended,
          createdAt: applications.createdAt,
          onboardAt: applications.onboardAt,
          history: applications.history,
        })
        .from(applications),
      db
        .select({ createdBy: clients.createdBy, n: count() })
        .from(clients)
        .where(and(gte(clients.createdAt, since), lt(clients.createdAt, until)))
        .groupBy(clients.createdBy),
      db
        .select({ createdBy: candidates.createdBy, n: count() })
        .from(candidates)
        .where(and(gte(candidates.createdAt, since), lt(candidates.createdAt, until)))
        .groupBy(candidates.createdBy),
    ]);

  const jobById = new Map(jobRows.map((j) => [j.id, j]));
  const hrByJob = new Map<string, string[]>();
  for (const a of assignRows) {
    const arr = hrByJob.get(a.jobId) ?? [];
    arr.push(a.recruiterId);
    hrByJob.set(a.jobId, arr);
  }

  const blank = () => ({
    newClients: 0,
    newJobs: 0,
    headcount: 0,
    assignedJobs: 0,
    newCvs: 0,
    apps: 0,
    interviews: 0,
    attended: 0,
    hired: 0,
    revenue: 0,
  });
  const acc = new Map<string, ReturnType<typeof blank>>();
  const bump = (id: string | null | undefined) => {
    if (!id) return null;
    let v = acc.get(id);
    if (!v) acc.set(id, (v = blank()));
    return v;
  };

  for (const r of clientRows) {
    const v = bump(r.createdBy);
    if (v) v.newClients += r.n;
  }
  for (const r of cvRows) {
    const v = bump(r.createdBy);
    if (v) v.newCvs += r.n;
  }
  for (const j of jobRows) {
    if (!signedInRange(j.signedAt)) continue;
    const v = bump(j.ownerId);
    if (v) {
      v.newJobs += 1;
      v.headcount += j.headcount;
      // Doanh thu ước tính = giá hợp đồng × số lượng của hợp đồng kí trong kỳ.
      // Bỏ vị trí đã đóng (khách hủy) vì không thu được tiền.
      if (j.status !== "closed") {
        v.revenue += (j.contractValue ?? 0) * j.headcount;
      }
    }
  }
  for (const a of assignRows) {
    if (!inRange(a.assignedAt)) continue;
    const v = bump(a.recruiterId);
    if (v) v.assignedJobs += 1;
  }

  const totals = {
    newClients: 0,
    newJobs: 0,
    newCvs: 0,
    apps: 0,
    interviews: 0,
    hired: 0,
    revenue: 0,
  };
  for (const r of clientRows) totals.newClients += r.n;
  for (const r of cvRows) totals.newCvs += r.n;
  for (const j of jobRows) {
    if (!signedInRange(j.signedAt)) continue;
    totals.newJobs += 1;
    if (j.status !== "closed") {
      totals.revenue += (j.contractValue ?? 0) * j.headcount;
    }
  }

  for (const app of appRows) {
    const job = jobById.get(app.jobId);
    if (!job) continue;
    // Người hưởng công: sale sở hữu vị trí + tất cả HR được giao vị trí đó.
    const owners = [job.ownerId, ...(hrByJob.get(app.jobId) ?? [])].filter(
      (x): x is string => !!x,
    );

    const applied = inRange(app.createdAt);
    const interviewed = happened(app.interviewAt);
    const hiredOn = hiredAt(app);
    const hired = inRange(hiredOn);

    if (applied) totals.apps += 1;
    if (interviewed) totals.interviews += 1;
    if (hired) totals.hired += 1;

    for (const id of owners) {
      const v = bump(id);
      if (!v) continue;
      if (applied) v.apps += 1;
      if (interviewed) {
        v.interviews += 1;
        if (app.attended) v.attended += 1;
      }
      if (hired) v.hired += 1;
    }
  }

  const member = (m: (typeof memberRows)[number]): Member => ({
    id: m.id,
    name: m.name ?? m.email,
    email: m.email,
    role: m.role,
  });
  const has = (v: ReturnType<typeof blank>) =>
    v.newClients + v.newJobs + v.assignedJobs + v.newCvs + v.apps + v.hired > 0;

  // Admin chỉ xuất hiện khi thực sự có hoạt động trong kỳ (họ vẫn tạo job/CV được).
  const salesMembers = memberRows.filter(
    (m) =>
      SALES_ROLES.includes(m.role) ||
      (m.role === "admin" && has(acc.get(m.id) ?? blank())),
  );
  const hrMembers = memberRows.filter(
    (m) =>
      HR_ROLES.includes(m.role) ||
      (m.role === "admin" && has(acc.get(m.id) ?? blank())),
  );

  const salesRaw = salesMembers.map((m) => {
    const v = acc.get(m.id) ?? blank();
    return {
      ...member(m),
      newClients: v.newClients,
      newJobs: v.newJobs,
      headcount: v.headcount,
      apps: v.apps,
      interviews: v.interviews,
      hired: v.hired,
      revenue: v.revenue,
      fillRate: v.headcount > 0 ? v.hired / v.headcount : null,
    };
  });
  const hrRaw = hrMembers.map((m) => {
    const v = acc.get(m.id) ?? blank();
    return {
      ...member(m),
      assignedJobs: v.assignedJobs,
      newCvs: v.newCvs,
      apps: v.apps,
      interviews: v.interviews,
      attended: v.attended,
      hired: v.hired,
      convRate: v.apps > 0 ? v.hired / v.apps : null,
    };
  });

  const maxOf = <T extends Record<string, unknown>>(rows: T[], keys: string[]) =>
    Object.fromEntries(
      keys.map((k) => [k, Math.max(0, ...rows.map((r) => Number(r[k]) || 0))]),
    );

  const hrMax = maxOf(hrRaw, Object.keys(HR_WEIGHTS));

  // Sales xếp theo doanh thu ước tính đem về trong kỳ, không chấm điểm.
  const sales: SalesRow[] = salesRaw.sort(
    (a, b) => b.revenue - a.revenue || b.hired - a.hired,
  );
  const hr: HrRow[] = hrRaw
    .map((r) => ({
      ...r,
      score: scoreOf(r as unknown as Record<string, number>, hrMax, HR_WEIGHTS),
    }))
    .sort((a, b) => b.score - a.score || b.hired - a.hired);

  return { period, sales, hr, totals };
}

/** Năm có thể chọn: từ năm có dữ liệu sớm nhất tới năm hiện tại (mới nhất trước). */
export async function getSelectableYears(): Promise<number[]> {
  const rows = await Promise.all([
    db.select({ v: min(candidates.createdAt) }).from(candidates),
    db.select({ v: min(jobs.signedAt) }).from(jobs),
    db.select({ v: min(clients.createdAt) }).from(clients),
    db.select({ v: min(applications.createdAt) }).from(applications),
  ]);
  const thisYear = currentVnMonth().year;
  const years = rows
    .map(([r]) => r?.v)
    .filter((v): v is NonNullable<typeof v> => v != null)
    // `signed_at` là cột date → trả về chuỗi "YYYY-MM-DD"; đọc năm trực tiếp
    // để không lệch khi server chạy ở múi giờ âm.
    .map((v) => (typeof v === "string" ? Number(v.slice(0, 4)) : v.getFullYear()))
    .filter((y) => Number.isFinite(y));
  const earliest = years.length ? Math.min(...years, thisYear) : thisYear;
  return Array.from({ length: thisYear - earliest + 1 }, (_, i) => thisYear - i);
}
