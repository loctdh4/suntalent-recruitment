import { notFound } from "next/navigation";
import Link from "next/link";
import { desc, eq, inArray, ne } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  FileDown,
  Pencil,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import {
  jobs,
  clients,
  profiles,
  jobRecruiters,
  applications,
  candidates,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/user";
import { sanitizeHtml } from "@/lib/sanitize";
import { getJobMatches } from "@/lib/matching/queries";
import { CANDIDATE_MANAGER_ROLES } from "@/lib/candidates/constants";
import { AddCandidateDialog } from "@/components/jobs/add-candidate-dialog";
import {
  PipelineBoard,
  type PipelineCard,
} from "@/components/pipeline/pipeline-board";
import {
  canDeleteJob,
  JOB_MANAGER_ROLES,
  JOB_STATUS_EDITOR_ROLES,
} from "@/lib/jobs/constants";
import { JobDeleteButton } from "@/components/jobs/job-delete-button";
import { JobRecruiters } from "@/components/jobs/job-recruiters";
import { JdUpload } from "@/components/jobs/jd-upload";
import { JobStatusControl } from "@/components/jobs/job-status-control";
import { JobPriorityControl } from "@/components/jobs/job-priority-control";
import { daysSinceSigned, getJobAlertReasons } from "@/lib/jobs/alert";
import { getIndustryNames } from "@/lib/industries/queries";
import { formatDate, formatJobCode } from "@/lib/format";
import { InterviewSchedule } from "@/components/jobs/interview-schedule";

function vnd(n: number | null) {
  return n == null ? "—" : n.toLocaleString("vi-VN") + "₫";
}

/** Hiển thị khoảng lương; không có thì "Thỏa thuận". */
function salaryText(min: number | null, max: number | null) {
  if (min == null && max == null) return "Thỏa thuận";
  if (min != null && max != null) return `${vnd(min)} – ${vnd(max)}`;
  if (min != null) return `Từ ${vnd(min)}`;
  return `Đến ${vnd(max)}`;
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const canManage = JOB_MANAGER_ROLES.includes(
    (user?.role ?? "") as (typeof JOB_MANAGER_ROLES)[number],
  );
  const canEditStatus = JOB_STATUS_EDITOR_ROLES.includes(
    (user?.role ?? "") as (typeof JOB_STATUS_EDITOR_ROLES)[number],
  );

  const [job] = await db
    .select({
      id: jobs.id,
      code: jobs.code,
      title: jobs.title,
      status: jobs.status,
      headcount: jobs.headcount,
      createdAt: jobs.createdAt,
      signedAt: jobs.signedAt,
      contractValue: jobs.contractValue,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      location: jobs.location,
      industry: jobs.industry,
      remote: jobs.remote,
      priority: jobs.priority,
      minYears: jobs.minYears,
      description: jobs.description,
      jdUrl: jobs.jdUrl,
      requiredSkills: jobs.requiredSkills,
      clientId: jobs.clientId,
      ownerId: jobs.ownerId,
      clientName: clients.name,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .where(eq(jobs.id, id))
    .limit(1);

  if (!job) notFound();

  // Xóa vị trí: admin, hoặc sales đã tạo chính vị trí này.
  const canDelete = canDeleteJob(user?.role, user?.id, job.ownerId);

  const assigned = await db
    .select({ id: profiles.id, fullName: profiles.fullName, email: profiles.email })
    .from(jobRecruiters)
    .innerJoin(profiles, eq(jobRecruiters.recruiterId, profiles.id))
    .where(eq(jobRecruiters.jobId, id));

  const assignable = await db
    .select({ id: profiles.id, fullName: profiles.fullName, email: profiles.email })
    .from(profiles)
    .where(
      inArray(profiles.role, ["recruiter", "recruiter_intern", "admin"]),
    );

  const jobCandidates = await db
    .select({
      appId: applications.id,
      stage: applications.stage,
      interviewAt: applications.interviewAt,
      interviewAttended: applications.interviewAttended,
      onboardAt: applications.onboardAt,
      rejectReason: applications.rejectReason,
      candidateId: candidates.id,
      fullName: candidates.fullName,
      email: candidates.email,
      phone: candidates.phone,
      desiredPosition: candidates.desiredPosition,
      location: candidates.location,
    })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .where(eq(applications.jobId, id))
    .orderBy(desc(applications.createdAt));

  const pipelineCards: PipelineCard[] = jobCandidates.map((r) => ({
    id: r.appId,
    candidateId: r.candidateId,
    name: r.fullName ?? r.email ?? "Ứng viên",
    desiredPosition: r.desiredPosition,
    location: r.location,
    stage: r.stage,
    interviewAt: r.interviewAt ? r.interviewAt.toISOString() : null,
    onboardAt: r.onboardAt ? r.onboardAt.toISOString() : null,
    rejectReason: r.rejectReason,
  }));

  // Lịch phỏng vấn: PV sắp tới gần nhất lên đầu; PV đã qua xuống dưới (mới nhất trước).
  // Coi là "đã qua" khi đã quá giờ PV hơn 1 tiếng (kể cả cùng ngày).
  const nowMs = Date.now();
  const pastThreshold = nowMs - 3_600_000;
  const interviews = jobCandidates
    .filter((r) => r.interviewAt)
    .sort((a, b) => {
      const ta = a.interviewAt!.getTime();
      const tb = b.interviewAt!.getTime();
      const aUpcoming = ta >= pastThreshold;
      const bUpcoming = tb >= pastThreshold;
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      return aUpcoming ? ta - tb : tb - ta;
    });

  // Số ngày (theo lịch, giờ VN) từ hôm nay đến buổi PV.
  const ymdFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayKey = Date.parse(ymdFmt.format(new Date(nowMs)));
  const relDaysOf = (d: Date) =>
    Math.round((Date.parse(ymdFmt.format(d)) - todayKey) / 86_400_000);

  const canAddCandidate = CANDIDATE_MANAGER_ROLES.includes(
    (user?.role ?? "") as (typeof CANDIDATE_MANAGER_ROLES)[number],
  );
  const canViewContract = user?.role === "admin" || user?.role === "sales";
  const canEditPriority = user?.role === "admin" || user?.role === "sales";
  const matches = await getJobMatches(id, 10);

  const alertReasons = getJobAlertReasons({
    status: job.status,
    signedAt: job.signedAt,
    headcount: job.headcount,
    totalApps: jobCandidates.length,
    hired: jobCandidates.filter((c) => c.stage === "hired").length,
    hrCount: assigned.length,
  });

  // Tuổi job đếm từ ngày kí hợp đồng, cùng mốc với cảnh báo.
  const ageDays = daysSinceSigned(job.signedAt);

  // Ứng viên rảnh (ready, chưa thuộc vị trí nào) để thêm thủ công.
  let available: { id: string; fullName: string | null; email: string | null }[] = [];
  if (canAddCandidate) {
    const ready = await db
      .select({ id: candidates.id, fullName: candidates.fullName, email: candidates.email })
      .from(candidates)
      .where(eq(candidates.status, "ready"))
      .orderBy(desc(candidates.createdAt));
    const engagedRows = await db
      .select({ candidateId: applications.candidateId })
      .from(applications)
      .where(ne(applications.stage, "rejected"));
    const engaged = new Set(engagedRows.map((r) => r.candidateId));
    available = ready.filter((c) => !engaged.has(c.id));
  }
  const industryList = canAddCandidate ? await getIndustryNames() : [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/jobs">
          <ArrowLeft className="size-4" /> Vị trí
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            <span className="text-primary">#{formatJobCode(job.code)}</span>{" "}
            {job.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {job.clientName ?? "Chưa có khách hàng"}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {/* Kí cùng ngày tạo (mặc định) thì gộp một vế cho gọn. */}
            {formatDate(job.signedAt) === formatDate(job.createdAt)
              ? `Đã tạo và kí hợp đồng ngày ${formatDate(job.signedAt)}`
              : `Đã tạo ngày ${formatDate(job.createdAt)}, kí hợp đồng ngày ${formatDate(job.signedAt)}`}
            {" · "}
            {ageDays === 0 ? "hôm nay" : `đã ${ageDays} ngày`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JobPriorityControl
            jobId={job.id}
            priority={job.priority}
            canEdit={canEditPriority}
          />
          <JobStatusControl jobId={job.id} status={job.status} canEdit={canEditStatus} />
          <JdUpload jobId={job.id} hasJd={!!job.jdUrl} canManage={canManage} />
          <Button variant="outline" size="sm" asChild>
            <a href={`/jobs/${job.id}/jd`}>
              <FileDown className="size-4" /> Xuất PDF
            </a>
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/jobs/${job.id}/edit`}>
                <Pencil className="size-4" /> Sửa
              </Link>
            </Button>
          )}
          {canDelete && (
            <JobDeleteButton
              jobId={job.id}
              jobTitle={job.title}
              candidateCount={jobCandidates.length}
            />
          )}
        </div>
      </div>

      {alertReasons.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span>Cần chú ý: {alertReasons.join(" · ")}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Số lượng
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{job.headcount}</CardContent>
        </Card>
        {canViewContract && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Giá hợp đồng / vị trí
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {vnd(job.contractValue)}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ngày kí hợp đồng
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatDate(job.signedAt)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lương
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {salaryText(job.salaryMin, job.salaryMax)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>HR phụ trách</CardTitle>
        </CardHeader>
        <CardContent>
          <JobRecruiters
            jobId={job.id}
            assigned={assigned}
            assignable={assignable}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      {interviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lịch phỏng vấn ({interviews.length})</CardTitle>
            <CardDescription>
              Bấm vào ứng viên để xem phiếu lịch PV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InterviewSchedule
              canManage={canAddCandidate}
              job={{
                title: job.title,
                clientName: job.clientName,
                location: job.location,
              }}
              interviews={interviews.map((r) => ({
                appId: r.appId,
                candidateId: r.candidateId,
                name: r.fullName ?? r.email ?? "Ứng viên",
                phone: r.phone,
                email: r.email,
                desiredPosition: r.desiredPosition,
                location: r.location,
                interviewAt: r.interviewAt!.toISOString(),
                relDays: relDaysOf(r.interviewAt!),
                isPast: r.interviewAt!.getTime() < pastThreshold,
                attended: r.interviewAttended,
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Pipeline ứng viên ({pipelineCards.length})</CardTitle>
          {canAddCandidate && (
            <AddCandidateDialog
              jobId={id}
              available={available}
              industries={industryList}
              defaultIndustry={job.industry}
              matches={matches.map((m) => ({
                candidateId: m.candidateId,
                name: m.fullName ?? m.email ?? "Ứng viên",
                score: m.breakdown.score,
                matchedSkills: m.breakdown.matchedSkills,
                inPipeline: m.inPipeline,
              }))}
            />
          )}
        </CardHeader>
        <CardContent>
          {pipelineCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có ứng viên. Bấm “Thêm ứng viên” để chọn từ gợi ý phù hợp hoặc thêm mới.
            </p>
          ) : (
            <PipelineBoard initial={pipelineCards} canManage={canAddCandidate} />
          )}
        </CardContent>
      </Card>

      {(job.requiredSkills?.length || job.description) && (
        <Card>
          <CardHeader>
            <CardTitle>Mô tả &amp; yêu cầu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {job.requiredSkills.map((s) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
            {job.description && (
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description) }}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
