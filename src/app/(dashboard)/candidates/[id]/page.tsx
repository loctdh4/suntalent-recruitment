import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft, Briefcase, FileText, Mail, MapPin, Phone } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import {
  candidates,
  candidateSkills,
  skills,
  workExperiences,
  applications,
  jobs,
  clients,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/user";
import { CANDIDATE_MANAGER_ROLES } from "@/lib/candidates/constants";
import { CandidateStatusBadge } from "@/components/candidates/candidate-status-badge";
import { CandidateActions } from "@/components/candidates/candidate-actions";
import { CandidateEditDialog } from "@/components/candidates/candidate-edit-dialog";
import { SeekingStatusSelect } from "@/components/candidates/seeking-status-select";
import { getIndustryNames } from "@/lib/industries/queries";
import { StageBadge } from "@/components/applications/stage-badge";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const canManage = CANDIDATE_MANAGER_ROLES.includes(
    (user?.role ?? "") as (typeof CANDIDATE_MANAGER_ROLES)[number],
  );

  const [c] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, id))
    .limit(1);

  if (!c) notFound();

  const skillRows = await db
    .select({ name: skills.name })
    .from(candidateSkills)
    .innerJoin(skills, eq(candidateSkills.skillId, skills.id))
    .where(eq(candidateSkills.candidateId, id));
  const industryList = canManage ? await getIndustryNames() : [];

  const experiences = await db
    .select()
    .from(workExperiences)
    .where(eq(workExperiences.candidateId, id));

  // Vị trí ứng viên đang/đã ứng tuyển + giai đoạn hiện tại.
  const apps = await db
    .select({
      jobId: jobs.id,
      jobTitle: jobs.title,
      clientName: clients.name,
      stage: applications.stage,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .where(eq(applications.candidateId, id));

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={c.status === "parsing"} />
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/candidates">
          <ArrowLeft className="size-4" /> Ứng viên
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {c.fullName ?? "(Chưa trích xuất)"}
            </h1>
            <CandidateStatusBadge status={c.status} />
            <Badge
              variant="secondary"
              className="border-transparent text-xs text-muted-foreground"
            >
              {c.embedding ? "✓ Đã có vector (AI)" : "Chưa có vector"}
            </Badge>
          </div>
          {c.desiredPosition && (
            <p className="text-sm font-medium text-primary">{c.desiredPosition}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {c.email && (
              <span className="flex items-center gap-1">
                <Mail className="size-3.5" /> {c.email}
              </span>
            )}
            {c.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" /> {c.phone}
              </span>
            )}
            {c.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {c.location}
              </span>
            )}
            {c.yearsExp != null && <span>{c.yearsExp} năm kinh nghiệm</span>}
            {c.industry && (
              <span className="flex items-center gap-1">
                <Briefcase className="size-3.5" /> {c.industry}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SeekingStatusSelect
            candidateId={c.id}
            value={c.seekingStatus}
            canEdit={canManage}
          />
          <Button variant="outline" size="sm" asChild>
            <a href={`/candidates/${c.id}/cv`} target="_blank" rel="noreferrer">
              <FileText className="size-4" /> CV gốc
            </a>
          </Button>
          {canManage && (
            <CandidateEditDialog
              industries={industryList}
              candidate={{
                id: c.id,
                fullName: c.fullName,
                email: c.email,
                phone: c.phone,
                location: c.location,
                industry: c.industry,
                desiredPosition: c.desiredPosition,
                yearsExp: c.yearsExp,
                summary: c.summary,
                skills: skillRows.map((s) => s.name),
              }}
            />
          )}
          {canManage && <CandidateActions candidateId={c.id} />}
        </div>
      </div>

      {c.status === "error" && (
        <Card className="border-destructive/30">
          <CardContent className="py-4 text-sm text-destructive">
            Không trích xuất được CV này. Thử “Xử lý lại” hoặc kiểm tra file.
          </CardContent>
        </Card>
      )}

      {c.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Tóm tắt</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{c.summary}</CardContent>
        </Card>
      )}

      {skillRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kỹ năng</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {skillRows.map((s, i) => (
              <Badge key={i} variant="outline">
                {s.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {experiences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kinh nghiệm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {experiences.map((e) => (
              <div key={e.id} className="border-l-2 pl-3">
                <div className="font-medium">
                  {[e.title, e.company].filter(Boolean).join(" · ") || "—"}
                </div>
                {(e.startDate || e.endDate) && (
                  <div className="text-xs text-muted-foreground">
                    {[e.startDate, e.endDate].filter(Boolean).join(" – ")}
                  </div>
                )}
                {e.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vị trí đang ứng tuyển ({apps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {apps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa được thêm vào vị trí nào.
            </p>
          ) : (
            <div className="space-y-2">
              {apps.map((a) => (
                <div
                  key={a.jobId}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <Link href={`/jobs/${a.jobId}`} className="font-medium hover:underline">
                      {a.jobTitle}
                    </Link>
                    {a.clientName && (
                      <div className="text-sm text-muted-foreground">{a.clientName}</div>
                    )}
                  </div>
                  <StageBadge stage={a.stage} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
