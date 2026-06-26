import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock } from "lucide-react";
import { count, desc, eq, gte, isNotNull, notInArray } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { RecruitmentTrendChart } from "@/components/charts/recruitment-trend-chart";
import {
  IndustryPieChart,
  type IndustrySlice,
} from "@/components/charts/industry-pie-chart";
import { db } from "@/lib/db";
import {
  candidates,
  jobs,
  clients,
  profiles,
  applications,
  jobRecruiters,
  candidateSkills,
  skills,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/user";
import { PIPELINE_STAGES } from "@/lib/applications/constants";
import { getJobAlertReasons } from "@/lib/jobs/alert";
import { formatDate, formatJobCode, formatTime } from "@/lib/format";

export default async function OverviewPage() {
  // Tổng quan chỉ dành cho quản lý (manager/admin); HR/sale chuyển sang Jobs.
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/jobs");
  }

  const [{ n: totalCand }] = await db.select({ n: count() }).from(candidates);
  const [{ n: openJobs }] = await db
    .select({ n: count() })
    .from(jobs)
    .where(eq(jobs.status, "open"));
  const [{ n: activeApps }] = await db
    .select({ n: count() })
    .from(applications)
    .where(notInArray(applications.stage, ["rejected", "hired"]));
  const [{ n: hiredApps }] = await db
    .select({ n: count() })
    .from(applications)
    .where(eq(applications.stage, "hired"));

  // Vị trí cần chú ý: xét job đang mở + đếm ứng viên/đã tuyển/HR đã giao.
  const openJobRows = await db
    .select({
      id: jobs.id,
      code: jobs.code,
      title: jobs.title,
      status: jobs.status,
      headcount: jobs.headcount,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .where(eq(jobs.status, "open"));
  const appByJob = await db
    .select({ jobId: applications.jobId, n: count() })
    .from(applications)
    .groupBy(applications.jobId);
  const hiredByJobRows = await db
    .select({ jobId: applications.jobId, n: count() })
    .from(applications)
    .where(eq(applications.stage, "hired"))
    .groupBy(applications.jobId);
  // HR phụ trách (tên) theo từng job — dùng cho cả cảnh báo và lịch PV.
  const hrRows = await db
    .select({
      jobId: jobRecruiters.jobId,
      name: profiles.fullName,
      email: profiles.email,
    })
    .from(jobRecruiters)
    .innerJoin(profiles, eq(jobRecruiters.recruiterId, profiles.id));
  const hrNamesMap = new Map<string, string[]>();
  for (const r of hrRows) {
    const arr = hrNamesMap.get(r.jobId) ?? [];
    arr.push(r.name ?? r.email);
    hrNamesMap.set(r.jobId, arr);
  }
  const appByJobMap = new Map(appByJob.map((r) => [r.jobId, r.n]));
  const hiredByJobMap = new Map(hiredByJobRows.map((r) => [r.jobId, r.n]));
  const alertJobs = openJobRows
    .map((j) => ({
      ...j,
      hr: hrNamesMap.get(j.id) ?? [],
      reasons: getJobAlertReasons({
        status: j.status,
        createdAt: j.createdAt,
        headcount: j.headcount,
        totalApps: appByJobMap.get(j.id) ?? 0,
        hired: hiredByJobMap.get(j.id) ?? 0,
        hrCount: hrNamesMap.get(j.id)?.length ?? 0,
      }),
    }))
    .filter((j) => j.reasons.length > 0);

  // Lịch phỏng vấn hôm nay (giờ VN).
  const ymdVN = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayVN = ymdVN.format(new Date());
  const interviewRows = await db
    .select({
      appId: applications.id,
      interviewAt: applications.interviewAt,
      candidateId: candidates.id,
      candidateName: candidates.fullName,
      candidateEmail: candidates.email,
      candidatePhone: candidates.phone,
      jobId: jobs.id,
      jobCode: jobs.code,
      jobTitle: jobs.title,
      clientName: clients.name,
    })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .where(isNotNull(applications.interviewAt));
  const todayInterviews = interviewRows
    .filter((r) => r.interviewAt && ymdVN.format(r.interviewAt) === todayVN)
    .sort((a, b) => a.interviewAt!.getTime() - b.interviewAt!.getTime());

  // Phân bố ngành nghề (top 5 + Khác) cho ứng viên và vị trí.
  function topWithOthers(
    rows: { name: string | null; n: number }[],
  ): IndustrySlice[] {
    const cleaned = rows
      .filter((r) => r.name)
      .map((r) => ({ name: r.name as string, value: r.n }))
      .sort((a, b) => b.value - a.value);
    const top = cleaned.slice(0, 5);
    const othersVal = cleaned.slice(5).reduce((a, r) => a + r.value, 0);
    if (othersVal > 0) top.push({ name: "Khác", value: othersVal });
    return top;
  }
  const candIndustry = topWithOthers(
    await db
      .select({ name: candidates.industry, n: count() })
      .from(candidates)
      .groupBy(candidates.industry),
  );
  const jobIndustry = topWithOthers(
    await db
      .select({ name: jobs.industry, n: count() })
      .from(jobs)
      .groupBy(jobs.industry),
  );

  // Xu hướng 6 tháng gần nhất: ứng tuyển & nhận việc theo tháng.
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: `Th${d.getMonth() + 1}` };
  });
  const sinceMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const appRows = await db
    .select({ createdAt: applications.createdAt, stage: applications.stage })
    .from(applications)
    .where(gte(applications.createdAt, sinceMonth));
  const bucket = new Map(months.map((m) => [m.key, { applied: 0, hired: 0 }]));
  for (const a of appRows) {
    const d = new Date(a.createdAt);
    const b = bucket.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (!b) continue;
    b.applied++;
    if (a.stage === "hired") b.hired++;
  }
  const trend = months.map((m) => ({ month: m.label, ...bucket.get(m.key)! }));

  // Phân bố pipeline theo giai đoạn.
  const stageRows = await db
    .select({ stage: applications.stage, n: count() })
    .from(applications)
    .groupBy(applications.stage);
  const stageMap = new Map(stageRows.map((r) => [r.stage, r.n]));
  const stageDist = PIPELINE_STAGES.map((s) => ({
    label: s.label,
    n: stageMap.get(s.value) ?? 0,
  }));
  const stageMax = Math.max(1, ...stageDist.map((s) => s.n));

  // Ứng viên mới nhất.
  const recentCandidates = await db
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      email: candidates.email,
      desiredPosition: candidates.desiredPosition,
      createdAt: candidates.createdAt,
    })
    .from(candidates)
    .orderBy(desc(candidates.createdAt))
    .limit(6);

  const topSkills = await db
    .select({ name: skills.name, count: count() })
    .from(candidateSkills)
    .innerJoin(skills, eq(candidateSkills.skillId, skills.id))
    .groupBy(skills.name)
    .orderBy(desc(count()))
    .limit(6);
  const skillMax = Math.max(1, ...topSkills.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">
          Bức tranh tuyển dụng theo thời gian thực.
        </p>
      </div>

      {/* Thẻ số liệu */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng ứng viên" value={String(totalCand)} />
        <StatCard label="Vị trí đang mở" value={String(openJobs)} />
        <StatCard label="Ứng viên trong pipeline" value={String(activeApps)} />
        <StatCard label="Đã nhận việc" value={String(hiredApps)} />
      </div>

      {/* Vị trí cần chú ý */}
      {alertJobs.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-500/40">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              Jobs đang cần chú ý ({alertJobs.length})
            </CardTitle>
            <Link
              href="/jobs?alert=1"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertJobs.slice(0, 5).map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="block rounded-lg border border-amber-200 bg-amber-50 p-3 transition hover:bg-amber-100/70 dark:border-amber-500/30 dark:bg-amber-500/10"
              >
                <div className="font-medium">
                  <span className="text-primary">#{formatJobCode(j.code)}</span> {j.title}
                </div>
                <div className="mt-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  {j.reasons.join(" · ")}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  HR: {j.hr.length ? j.hr.join(", ") : "Chưa giao"}
                </div>
              </Link>
            ))}
            {alertJobs.length > 5 && (
              <Link
                href="/jobs?alert=1"
                className="block pt-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                + {alertJobs.length - 5} vị trí khác…
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lịch phỏng vấn hôm nay */}
      {todayInterviews.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-5 text-amber-600 dark:text-amber-400" />
              Lịch phỏng vấn hôm nay ({todayInterviews.length})
            </CardTitle>
            <Link
              href={`/interviews?day=${todayVN}`}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayInterviews.slice(0, 5).map((r) => {
              const hr = hrNamesMap.get(r.jobId) ?? [];
              return (
                <div
                  key={r.appId}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={`/candidates/${r.candidateId}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {r.candidateName ?? r.candidateEmail ?? "Ứng viên"}
                    </Link>
                    {r.candidatePhone && (
                      <p className="truncate text-xs text-muted-foreground">
                        {r.candidatePhone}
                      </p>
                    )}
                    <Link
                      href={`/jobs/${r.jobId}`}
                      className="block truncate text-xs text-muted-foreground hover:underline"
                    >
                      #{formatJobCode(r.jobCode)} {r.jobTitle}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="text-foreground/70">Khách hàng:</span>{" "}
                      {r.clientName ?? "—"}
                      {" · "}
                      <span className="text-foreground/70">HR:</span>{" "}
                      {hr.length ? hr.join(", ") : "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {formatTime(r.interviewAt!)}
                  </span>
                </div>
              );
            })}
            {todayInterviews.length > 5 && (
              <Link
                href={`/interviews?day=${todayVN}`}
                className="block pt-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                + {todayInterviews.length - 5} buổi khác…
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Xu hướng + ứng viên mới nhất */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Xu hướng tuyển dụng</CardTitle>
            <CardDescription>Ứng tuyển và nhận việc 6 tháng gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <RecruitmentTrendChart data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ứng viên mới nhất</CardTitle>
            <CardDescription>Hồ sơ vừa thêm vào hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có ứng viên.</p>
            ) : (
              recentCandidates.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/candidates/${c.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {c.fullName ?? c.email ?? "(Chưa trích xuất)"}
                    </Link>
                    {c.desiredPosition && (
                      <p className="truncate text-xs text-muted-foreground">
                        {c.desiredPosition}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Phân bố pipeline + top kỹ năng */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Phân bố pipeline</CardTitle>
            <CardDescription>Số ứng tuyển theo từng giai đoạn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stageDist.map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground">{s.n}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(s.n / stageMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kỹ năng nhiều ứng viên</CardTitle>
            <CardDescription>Top kỹ năng trong cơ sở dữ liệu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topSkills.length === 0 && (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu kỹ năng.</p>
            )}
            {topSkills.map((s) => (
              <div key={s.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(s.count / skillMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Phân bố ngành nghề */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ngành nghề ứng viên</CardTitle>
            <CardDescription>Top 5 ngành nhiều nhất, còn lại gộp “Khác”.</CardDescription>
          </CardHeader>
          <CardContent>
            <IndustryPieChart data={candIndustry} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ngành nghề vị trí</CardTitle>
            <CardDescription>Top 5 ngành nhiều nhất, còn lại gộp “Khác”.</CardDescription>
          </CardHeader>
          <CardContent>
            <IndustryPieChart data={jobIndustry} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
