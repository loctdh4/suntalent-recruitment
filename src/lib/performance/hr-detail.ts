import { and, asc, desc, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  candidates,
  clients,
  jobRecruiters,
  jobs,
} from "@/lib/db/schema";
import type { Period } from "./constants";
import { type DealStatus, dealStatus, hiredDate, jobEventLog } from "./deal";
import { getMember, type MemberInfo } from "./detail";

export type HrJobRow = {
  jobId: string;
  jobCode: number;
  title: string;
  clientId: string | null;
  clientName: string;
  assignedAt: Date;
  headcount: number;
  /** Ứng viên HR đưa vào pipeline trong kỳ. */
  apps: number;
  /** Buổi PV khách hàng đã diễn ra trong kỳ / số ứng viên có mặt. */
  interviews: number;
  attended: number;
  /** Nhận việc trong kỳ. */
  hired: number;
  /** Nhận việc lũy kế (dùng cho tiến độ lấp đầy). */
  hiredTotal: number;
  status: DealStatus;
  notes: string[];
};

export type HrCvRow = {
  id: string;
  name: string;
  desiredPosition: string | null;
  industry: string | null;
  yearsExp: number | null;
  status: string;
  seekingStatus: string;
  createdAt: Date;
  /** Vị trí đang ứng tuyển (nếu đã đưa vào pipeline). */
  jobId: string | null;
  jobTitle: string | null;
  stage: string | null;
};

export type HrDetail = {
  member: MemberInfo;
  jobRows: HrJobRow[];
  cvRows: HrCvRow[];
  totals: {
    jobs: number;
    headcount: number;
    apps: number;
    interviews: number;
    attended: number;
    hired: number;
    newCvs: number;
  };
};


/**
 * Bảng công việc của một HR trong kỳ.
 *
 * Lấy các vị trí HR được giao mà **có hoạt động trong kỳ** (được giao mới, thêm
 * ứng viên, có buổi PV hoặc có người nhận việc) — chứ không chỉ vị trí giao
 * trong tháng, vì job giao tháng trước vẫn là việc của tháng này.
 */
export async function getHrDetail(
  memberId: string,
  period: Period,
): Promise<HrDetail | null> {
  const member = await getMember(memberId);
  if (!member) return null;

  const { since, until } = period;
  const now = new Date();
  const inRange = (d: Date | null | undefined) => !!d && d >= since && d < until;

  const assignedRows = await db
    .select({
      assignedAt: jobRecruiters.assignedAt,
      id: jobs.id,
      code: jobs.code,
      title: jobs.title,
      headcount: jobs.headcount,
      warrantyMonths: jobs.warrantyMonths,
      status: jobs.status,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(jobRecruiters)
    .innerJoin(jobs, eq(jobRecruiters.jobId, jobs.id))
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .where(eq(jobRecruiters.recruiterId, memberId))
    .orderBy(asc(jobRecruiters.assignedAt));

  const jobIds = assignedRows.map((j) => j.id);
  const appRows = jobIds.length
    ? await db
        .select({
          jobId: applications.jobId,
          stage: applications.stage,
          rejectReason: applications.rejectReason,
          interviewAt: applications.interviewAt,
          attended: applications.interviewAttended,
          createdAt: applications.createdAt,
          onboardAt: applications.onboardAt,
          history: applications.history,
          candidateName: candidates.fullName,
          candidateEmail: candidates.email,
        })
        .from(applications)
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .where(inArray(applications.jobId, jobIds))
    : [];

  const byJob = new Map(
    jobIds.map((id) => [
      id,
      { apps: 0, interviews: 0, attended: 0, hired: 0, hiredTotal: 0 },
    ]),
  );
  const lastHire = new Map<string, Date>();

  for (const a of appRows) {
    const agg = byJob.get(a.jobId);
    if (!agg) continue;
    if (inRange(a.createdAt)) agg.apps += 1;
    if (inRange(a.interviewAt) && a.interviewAt! <= now) {
      agg.interviews += 1;
      if (a.attended) agg.attended += 1;
    }
    if (a.stage === "hired") {
      const at = hiredDate(a);
      agg.hiredTotal += 1;
      if (inRange(at)) agg.hired += 1;
      const prev = lastHire.get(a.jobId);
      if (!prev || at > prev) lastHire.set(a.jobId, at);
    }
  }

  // Chỉ giữ vị trí thực sự có việc trong kỳ.
  const jobRows: HrJobRow[] = assignedRows
    .filter((j) => {
      const agg = byJob.get(j.id)!;
      return (
        inRange(j.assignedAt) || agg.apps > 0 || agg.interviews > 0 || agg.hired > 0
      );
    })
    .map((j) => {
      const agg = byJob.get(j.id)!;
      return {
        jobId: j.id,
        jobCode: j.code,
        title: j.title,
        clientId: j.clientId,
        clientName: j.clientName ?? "(Chưa gán đối tác)",
        assignedAt: j.assignedAt,
        headcount: j.headcount,
        apps: agg.apps,
        interviews: agg.interviews,
        attended: agg.attended,
        hired: agg.hired,
        hiredTotal: agg.hiredTotal,
        status: dealStatus({
          hired: agg.hiredTotal,
          headcount: j.headcount,
          jobStatus: j.status,
          lastHire: lastHire.get(j.id),
          warrantyMonths: j.warrantyMonths,
          now,
        }),
        notes: jobEventLog(appRows.filter((a) => a.jobId === j.id)),
      };
    });

  // CV do chính HR thêm vào hệ thống trong kỳ.
  const cvBase = await db
    .select({
      id: candidates.id,
      name: candidates.fullName,
      email: candidates.email,
      desiredPosition: candidates.desiredPosition,
      industry: candidates.industry,
      yearsExp: candidates.yearsExp,
      status: candidates.status,
      seekingStatus: candidates.seekingStatus,
      createdAt: candidates.createdAt,
    })
    .from(candidates)
    .where(
      and(
        eq(candidates.createdBy, memberId),
        gte(candidates.createdAt, since),
        lt(candidates.createdAt, until),
      ),
    )
    .orderBy(desc(candidates.createdAt));

  // Mỗi ứng viên chỉ nằm ở 1 vị trí đang hoạt động → map 1-1.
  const cvIds = cvBase.map((c) => c.id);
  const cvApps = cvIds.length
    ? await db
        .select({
          candidateId: applications.candidateId,
          stage: applications.stage,
          jobId: jobs.id,
          jobTitle: jobs.title,
        })
        .from(applications)
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .where(
          and(
            inArray(applications.candidateId, cvIds),
            ne(applications.stage, "rejected"),
          ),
        )
    : [];
  const appByCandidate = new Map(cvApps.map((a) => [a.candidateId, a]));

  const cvRows: HrCvRow[] = cvBase.map((c) => {
    const app = appByCandidate.get(c.id);
    return {
      id: c.id,
      name: c.name ?? c.email ?? "(Chưa trích xuất)",
      desiredPosition: c.desiredPosition,
      industry: c.industry,
      yearsExp: c.yearsExp,
      status: c.status,
      seekingStatus: c.seekingStatus,
      createdAt: c.createdAt,
      jobId: app?.jobId ?? null,
      jobTitle: app?.jobTitle ?? null,
      stage: app?.stage ?? null,
    };
  });

  return {
    member,
    jobRows,
    cvRows,
    totals: {
      jobs: jobRows.length,
      headcount: jobRows.reduce((a, r) => a + r.headcount, 0),
      apps: jobRows.reduce((a, r) => a + r.apps, 0),
      interviews: jobRows.reduce((a, r) => a + r.interviews, 0),
      attended: jobRows.reduce((a, r) => a + r.attended, 0),
      hired: jobRows.reduce((a, r) => a + r.hired, 0),
      newCvs: cvRows.length,
    },
  };
}
