import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  candidates,
  jobs,
  clients,
  profiles,
  jobRecruiters,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/user";
import { CANDIDATE_MANAGER_ROLES } from "@/lib/candidates/constants";
import {
  InterviewsTable,
  type InterviewRow,
} from "@/components/interviews/interviews-table";
import { InterviewFilters } from "@/components/interviews/interview-filters";
import { FiltersPendingProvider, PendingArea } from "@/components/filters-pending";
import { TableSkeleton } from "@/components/table-skeleton";
import { formatJobCode } from "@/lib/format";

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; q?: string }>;
}) {
  const { day, q } = await searchParams;
  const user = await getCurrentUser();
  const canManage = CANDIDATE_MANAGER_ROLES.includes(
    (user?.role ?? "") as (typeof CANDIDATE_MANAGER_ROLES)[number],
  );
  // HR: chỉ lịch PV của job mình được giao; Sale: chỉ job mình tạo.
  const role = user?.role ?? "";
  const hrOnly = role === "recruiter" || role === "recruiter_intern";
  const salesOnly = role === "sales" || role === "sales_intern";

  const raw = await db
    .select({
      appId: applications.id,
      interviewAt: applications.interviewAt,
      attended: applications.interviewAttended,
      candidateId: candidates.id,
      name: candidates.fullName,
      email: candidates.email,
      phone: candidates.phone,
      desiredPosition: candidates.desiredPosition,
      candidateLocation: candidates.location,
      jobId: jobs.id,
      jobCode: jobs.code,
      jobTitle: jobs.title,
      jobLocation: jobs.location,
      clientName: clients.name,
      saleName: profiles.fullName,
      saleEmail: profiles.email,
    })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .leftJoin(profiles, eq(jobs.ownerId, profiles.id))
    .where(
      hrOnly && user
        ? and(
            isNotNull(applications.interviewAt),
            inArray(
              jobs.id,
              db
                .select({ jobId: jobRecruiters.jobId })
                .from(jobRecruiters)
                .where(eq(jobRecruiters.recruiterId, user.id)),
            ),
          )
        : salesOnly && user
          ? and(
              isNotNull(applications.interviewAt),
              eq(jobs.ownerId, user.id),
            )
          : isNotNull(applications.interviewAt),
    )
    .orderBy(desc(applications.interviewAt));

  // HR phụ trách theo từng job.
  const jobIds = [...new Set(raw.map((r) => r.jobId))];
  const recRows = jobIds.length
    ? await db
        .select({
          jobId: jobRecruiters.jobId,
          name: profiles.fullName,
          email: profiles.email,
        })
        .from(jobRecruiters)
        .innerJoin(profiles, eq(jobRecruiters.recruiterId, profiles.id))
        .where(inArray(jobRecruiters.jobId, jobIds))
    : [];
  const hrMap = new Map<string, string[]>();
  for (const r of recRows) {
    const arr = hrMap.get(r.jobId) ?? [];
    arr.push(r.name ?? r.email);
    hrMap.set(r.jobId, arr);
  }

  // Sắp xếp: PV sắp tới gần nhất lên đầu; đã qua xuống dưới (ân hạn 1 giờ).
  const nowMs = Date.now();
  const pastThreshold = nowMs - 3_600_000;
  const ymdFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = ymdFmt.format(new Date(nowMs));
  const todayKey = Date.parse(today);
  const relDaysOf = (d: Date) =>
    Math.round((Date.parse(ymdFmt.format(d)) - todayKey) / 86_400_000);

  const qNorm = (q ?? "").trim().toLowerCase();
  const qDigits = (q ?? "").replace(/\D/g, "");
  const sorted = raw
    .filter((r) => r.interviewAt)
    // Lọc theo ngày (giờ VN) nếu có chọn.
    .filter((r) => !day || ymdFmt.format(r.interviewAt!) === day)
    // Tìm theo mã job / tên ứng viên / vị trí.
    .filter((r) => {
      if (!qNorm) return true;
      const name = (r.name ?? r.email ?? "").toLowerCase();
      const title = r.jobTitle.toLowerCase();
      const codeStr = formatJobCode(r.jobCode);
      return (
        name.includes(qNorm) ||
        title.includes(qNorm) ||
        (!!qDigits && codeStr.includes(qDigits))
      );
    })
    .sort((a, b) => {
      const ta = a.interviewAt!.getTime();
      const tb = b.interviewAt!.getTime();
      const aUp = ta >= pastThreshold;
      const bUp = tb >= pastThreshold;
      if (aUp !== bUp) return aUp ? -1 : 1;
      return aUp ? ta - tb : tb - ta;
    });

  const rows: InterviewRow[] = sorted.map((r) => ({
    appId: r.appId,
    candidateId: r.candidateId,
    name: r.name ?? r.email ?? "Ứng viên",
    phone: r.phone,
    email: r.email,
    desiredPosition: r.desiredPosition,
    candidateLocation: r.candidateLocation,
    interviewAt: r.interviewAt!.toISOString(),
    relDays: relDaysOf(r.interviewAt!),
    isPast: r.interviewAt!.getTime() < pastThreshold,
    attended: r.attended,
    jobId: r.jobId,
    jobCode: r.jobCode,
    jobTitle: r.jobTitle,
    clientName: r.clientName,
    jobLocation: r.jobLocation,
    saleName: r.saleName ?? r.saleEmail,
    hrNames: hrMap.get(r.jobId) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lịch phỏng vấn</h1>
        <p className="text-sm text-muted-foreground">
          Toàn bộ lịch phỏng vấn khách hàng của tất cả vị trí.
        </p>
      </div>
      <FiltersPendingProvider>
        <InterviewFilters today={today} />
        <PendingArea fallback={<TableSkeleton cols={8} />}>
          <InterviewsTable rows={rows} canManage={canManage} />
        </PendingArea>
      </FiltersPendingProvider>
    </div>
  );
}
