import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  candidates,
  clients,
  jobRecruiters,
  jobs,
  profiles,
} from "@/lib/db/schema";
import type { Period } from "./constants";
import { type DealStatus, dealStatus, jobEventLog } from "./deal";

export type DealRow = {
  jobId: string;
  jobCode: number;
  clientId: string | null;
  /** Tên công ty; đối tác cá nhân thì là tên người. */
  clientName: string;
  /** business | individual → "Doanh nghiệp" | "Cá nhân". */
  clientType: string;
  /** Ngày kí hợp đồng, dạng "YYYY-MM-DD". */
  signedAt: string;
  headcount: number;
  title: string;
  /** Giá hợp đồng 1 vị trí; `null` = trả sau / chưa chốt. */
  unitValue: number | null;
  /** unitValue × headcount; `null` khi chưa chốt giá. */
  revenue: number | null;
  /** Doanh thu đã ghi nhận = unitValue × số ứng viên đã nhận việc. */
  earned: number;
  status: DealStatus;
  /** Nhật ký onboard/nghỉ việc sinh từ lịch sử pipeline. */
  notes: string[];
  phone: string | null;
  warrantyMonths: number;
  hired: number;
};

export type MemberInfo = { id: string; name: string; email: string; role: string };

export type SaleDetail = {
  member: MemberInfo;
  rows: DealRow[];
  totals: { headcount: number; revenue: number; earned: number; hired: number };
};

/** Thông tin thành viên cho trang chi tiết; `null` nếu id không tồn tại. */
export async function getMember(id: string): Promise<MemberInfo | null> {
  const [m] = await db
    .select({
      id: profiles.id,
      name: profiles.fullName,
      email: profiles.email,
      role: profiles.role,
    })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  return m ? { ...m, name: m.name ?? m.email } : null;
}

/**
 * Bảng doanh thu của một thành viên trong kỳ — tương đương file
 * "DOANH THU THÁNG x/yyyy" đang dùng thủ công.
 *
 * Lọc theo ngày kí hợp đồng (`jobs.signed_at`). Sale lấy vị trí mình sở hữu,
 * HR lấy vị trí được giao phụ trách.
 */
export async function getSaleDetail(
  memberId: string,
  period: Period,
): Promise<SaleDetail | null> {
  const member = await getMember(memberId);
  if (!member) return null;

  const isHr = member.role === "recruiter" || member.role === "recruiter_intern";
  const ownedByMember = isHr
    ? inArray(
        jobs.id,
        db
          .select({ jobId: jobRecruiters.jobId })
          .from(jobRecruiters)
          .where(eq(jobRecruiters.recruiterId, memberId)),
      )
    : eq(jobs.ownerId, memberId);

  const jobRows = await db
    .select({
      id: jobs.id,
      code: jobs.code,
      title: jobs.title,
      headcount: jobs.headcount,
      contractValue: jobs.contractValue,
      warrantyMonths: jobs.warrantyMonths,
      status: jobs.status,
      signedAt: jobs.signedAt,
      clientId: clients.id,
      clientName: clients.name,
      clientType: clients.type,
      clientPhone: clients.phone,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .where(
      and(
        ownedByMember,
        // Doanh thu ghi nhận theo ngày kí hợp đồng, không phải ngày tạo bản ghi.
        gte(jobs.signedAt, period.sinceDate),
        lt(jobs.signedAt, period.untilDate),
      ),
    )
    .orderBy(asc(jobs.signedAt), asc(jobs.code));

  const jobIds = jobRows.map((j) => j.id);
  const appRows = jobIds.length
    ? await db
        .select({
          jobId: applications.jobId,
          stage: applications.stage,
          rejectReason: applications.rejectReason,
          createdAt: applications.createdAt,
          history: applications.history,
          candidateName: candidates.fullName,
          candidateEmail: candidates.email,
        })
        .from(applications)
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .where(inArray(applications.jobId, jobIds))
    : [];

  const hiredByJob = new Map<string, number>();
  const lastHireByJob = new Map<string, Date>();

  for (const a of appRows) {
    if (a.stage !== "hired") continue;
    const entry = ((a.history ?? []) as { stage: string; at: string }[])
      .filter((h) => h.stage === "hired")
      .pop();
    const at = entry?.at ? new Date(entry.at) : a.createdAt;
    hiredByJob.set(a.jobId, (hiredByJob.get(a.jobId) ?? 0) + 1);
    const prev = lastHireByJob.get(a.jobId);
    if (!prev || at > prev) lastHireByJob.set(a.jobId, at);
  }

  const now = new Date();
  const rows: DealRow[] = jobRows.map((j) => {
    const hired = hiredByJob.get(j.id) ?? 0;
    const status = dealStatus({
      hired,
      headcount: j.headcount,
      jobStatus: j.status,
      lastHire: lastHireByJob.get(j.id),
      warrantyMonths: j.warrantyMonths,
      now,
    });

    return {
      jobId: j.id,
      jobCode: j.code,
      clientId: j.clientId,
      clientName: j.clientName ?? "(Chưa gán đối tác)",
      clientType: j.clientType ?? "business",
      signedAt: j.signedAt,
      headcount: j.headcount,
      title: j.title,
      unitValue: j.contractValue,
      revenue: j.contractValue == null ? null : j.contractValue * j.headcount,
      earned: (j.contractValue ?? 0) * hired,
      status,
      notes: jobEventLog(appRows.filter((a) => a.jobId === j.id)),
      phone: j.clientPhone,
      warrantyMonths: j.warrantyMonths,
      hired,
    };
  });

  return {
    member,
    rows,
    totals: {
      headcount: rows.reduce((a, r) => a + r.headcount, 0),
      revenue: rows.reduce((a, r) => a + (r.revenue ?? 0), 0),
      earned: rows.reduce((a, r) => a + r.earned, 0),
      hired: rows.reduce((a, r) => a + r.hired, 0),
    },
  };
}
