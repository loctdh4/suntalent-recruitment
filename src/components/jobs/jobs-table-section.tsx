import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { jobs, clients, applications, jobRecruiters, profiles } from "@/lib/db/schema";
import { JOB_STATUS_OPTIONS } from "@/lib/jobs/constants";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { PriorityBadge } from "@/components/jobs/priority-badge";
import { JobAlertBadge } from "@/components/jobs/job-alert-badge";
import { SortHeader } from "@/components/jobs/sort-header";
import { ClickableRow } from "@/components/clickable-row";
import { getJobAlertReasons } from "@/lib/jobs/alert";
import { formatDate, formatJobCode } from "@/lib/format";
import { resolvePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

function vnd(n: number | null) {
  return n == null ? "—" : n.toLocaleString("vi-VN") + "₫";
}

export type JobsTableFilters = {
  q?: string;
  sale?: string;
  hr?: string;
  status?: string;
  client?: string;
  priority?: string;
  loc?: string;
  ind?: string;
  alert?: string;
  sort?: string;
  dir?: string;
  cmin?: string;
  cmax?: string;
  page?: string;
};

export async function JobsTableSection({
  filters,
  canViewContract,
  canFilterContract,
  canCreate,
  restrictRecruiterId,
  restrictOwnerId,
}: {
  filters: JobsTableFilters;
  canViewContract: boolean;
  canFilterContract: boolean;
  canCreate: boolean;
  restrictRecruiterId?: string;
  restrictOwnerId?: string;
}) {
  const { q, sale, hr, status, client, priority, loc, ind, alert, sort, dir, cmin, cmax, page } =
    filters;

  const conds: SQL[] = [];
  // HR/HR intern: chỉ thấy job mình được giao phụ trách.
  if (restrictRecruiterId) {
    conds.push(
      inArray(
        jobs.id,
        db
          .select({ jobId: jobRecruiters.jobId })
          .from(jobRecruiters)
          .where(eq(jobRecruiters.recruiterId, restrictRecruiterId)),
      ),
    );
  }
  // Sale/Sale intern: chỉ thấy job mình tạo (owner).
  if (restrictOwnerId) conds.push(eq(jobs.ownerId, restrictOwnerId));
  if (q?.trim()) {
    const kw = `%${q.trim()}%`;
    const digits = q.replace(/\D/g, "");
    const parts = [ilike(jobs.title, kw), ilike(clients.name, kw)];
    if (digits) parts.push(eq(jobs.code, Number(digits)));
    conds.push(or(...parts)!);
  }
  if (status && JOB_STATUS_OPTIONS.some((o) => o.value === status)) {
    conds.push(eq(jobs.status, status as (typeof JOB_STATUS_OPTIONS)[number]["value"]));
  }
  if (client) conds.push(eq(jobs.clientId, client));
  if (priority && ["high", "normal", "low"].includes(priority)) {
    conds.push(eq(jobs.priority, priority as "high" | "normal" | "low"));
  }
  if (loc?.trim()) conds.push(ilike(jobs.location, `%${loc.trim()}%`));
  if (ind?.trim()) conds.push(eq(jobs.industry, ind.trim()));
  if (canFilterContract) {
    const min = Number(String(cmin ?? "").replace(/[^\d]/g, ""));
    const max = Number(String(cmax ?? "").replace(/[^\d]/g, ""));
    if (min) conds.push(gte(jobs.contractValue, min));
    if (max) conds.push(lte(jobs.contractValue, max));
  }
  if (sale) conds.push(eq(jobs.ownerId, sale));
  if (hr) {
    conds.push(
      inArray(
        jobs.id,
        db
          .select({ jobId: jobRecruiters.jobId })
          .from(jobRecruiters)
          .where(eq(jobRecruiters.recruiterId, hr)),
      ),
    );
  }

  // 4 query độc lập nhau → gọi song song thay vì nối tiếp.
  const [rows, appCounts, hiredByJob, recRows] = await Promise.all([
    db
    .select({
      id: jobs.id,
      code: jobs.code,
      title: jobs.title,
      status: jobs.status,
      headcount: jobs.headcount,
      contractValue: jobs.contractValue,
      location: jobs.location,
      remote: jobs.remote,
      priority: jobs.priority,
      clientName: clients.name,
      ownerName: profiles.fullName,
      ownerEmail: profiles.email,
      signedAt: jobs.signedAt,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .leftJoin(profiles, eq(jobs.ownerId, profiles.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(jobs.signedAt)),
    // Số ứng viên trong pipeline + HR (recruiter) được giao, theo từng job.
    db
      .select({ jobId: applications.jobId, n: count() })
      .from(applications)
      .groupBy(applications.jobId),
    db
      .select({ jobId: applications.jobId, n: count() })
      .from(applications)
      .where(eq(applications.stage, "hired"))
      .groupBy(applications.jobId),
    db
      .select({
        jobId: jobRecruiters.jobId,
        name: profiles.fullName,
        email: profiles.email,
      })
      .from(jobRecruiters)
      .innerJoin(profiles, eq(jobRecruiters.recruiterId, profiles.id)),
  ]);

  // Mặc định & khi sort theo ngày kí: mới nhất lên đầu; bấm lần nữa đảo chiều.
  // signedAt là chuỗi "YYYY-MM-DD" nên so sánh trực tiếp được.
  const asc = sort === "signed" && dir === "asc";
  rows.sort((a, b) => {
    const t = a.signedAt.localeCompare(b.signedAt);
    return asc ? t : -t;
  });

  const appMap = new Map(appCounts.map((r) => [r.jobId, r.n]));
  const hiredMap = new Map(hiredByJob.map((r) => [r.jobId, r.n]));
  const hrMap = new Map<string, string[]>();
  for (const r of recRows) {
    const arr = hrMap.get(r.jobId) ?? [];
    arr.push(r.name ?? r.email);
    hrMap.set(r.jobId, arr);
  }

  // Cảnh báo job cần chú ý, tính từ ngày kí hợp đồng
  // (kí lâu chưa đủ người / chưa có ứng viên / chưa giao HR).
  const alertMap = new Map(
    rows.map((j) => [
      j.id,
      getJobAlertReasons({
        status: j.status,
        signedAt: j.signedAt,
        headcount: j.headcount,
        totalApps: appMap.get(j.id) ?? 0,
        hired: hiredMap.get(j.id) ?? 0,
        hrCount: hrMap.get(j.id)?.length ?? 0,
      }),
    ]),
  );
  const visibleRows = alert
    ? rows.filter((j) => (alertMap.get(j.id)?.length ?? 0) > 0)
    : rows;

  const hasFilter = !!(q || sale || hr || status || client || priority || loc || ind || alert);

  // Lọc "cần chú ý" và sắp xếp làm trong JS nên cắt trang cũng làm ở đây.
  const pageInfo = resolvePage(page, visibleRows.length);
  const pageRows = visibleRows.slice(pageInfo.offset, pageInfo.offset + pageInfo.limit);

  if (visibleRows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {hasFilter ? "Không tìm thấy vị trí" : "Chưa có vị trí nào"}
          </CardTitle>
          <CardDescription>
            {hasFilter
              ? "Không có vị trí khớp bộ lọc. Thử đổi từ khóa hoặc bộ lọc."
              : canCreate
                ? 'Bấm "Tạo vị trí" để thêm vị trí tuyển dụng đầu tiên.'
                : "Chưa có vị trí tuyển dụng. Liên hệ sale/manager để tạo."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortHeader label="Ngày kí" sortKey="signed" />
              </TableHead>
              <TableHead>Vị trí</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead className="text-right">Số lượng</TableHead>
              <TableHead className="text-right">Ứng viên</TableHead>
              <TableHead>Sale</TableHead>
              <TableHead>HR</TableHead>
              {canViewContract && (
                <TableHead className="text-right">Giá hợp đồng</TableHead>
              )}
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((j) => {
              const reasons = alertMap.get(j.id) ?? [];
              return (
              <ClickableRow
                key={j.id}
                href={`/jobs/${j.id}`}
                className={cn(
                  // td tự mang `align-middle`, phải nhắm thẳng vào td mới đè được.
                  "[&>td]:align-top",
                  reasons.length > 0
                    ? "bg-amber-50 hover:bg-amber-100/70 dark:bg-amber-500/10"
                    : j.priority === "high" && "bg-rose-50/50 dark:bg-rose-500/5",
                )}
              >
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(j.signedAt)}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {/* Giới hạn bề ngang để tiêu đề dài xuống dòng, không kéo giãn bảng. */}
                  <div className="max-w-88 wrap-break-word">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/jobs/${j.id}`} className="font-medium hover:underline">
                        <span className="text-primary">#{formatJobCode(j.code)}</span>{" "}
                        {j.title}
                      </Link>
                      <PriorityBadge priority={j.priority} />
                      <JobAlertBadge reasons={reasons} />
                      {j.remote && (
                        <Badge variant="outline" className="font-normal">
                          Remote
                        </Badge>
                      )}
                    </div>
                    {reasons.length > 0 && (
                      <div className="mt-0.5 flex items-start gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                        <span>{reasons.join(" · ")}</span>
                      </div>
                    )}
                    {j.location && !j.remote && (
                      <div className="text-sm text-muted-foreground">{j.location}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="max-w-56 wrap-break-word">
                    {j.clientName ?? "—"}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {hiredMap.get(j.id) ?? 0}/{j.headcount}
                </TableCell>
                <TableCell className="text-right">{appMap.get(j.id) ?? 0}</TableCell>
                <TableCell className="text-sm whitespace-normal text-muted-foreground">
                  <div className="max-w-36 wrap-break-word">
                    {j.ownerName ?? j.ownerEmail ?? "—"}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {(() => {
                    const names = hrMap.get(j.id);
                    if (!names?.length) return "—";
                    // Mỗi HR một dòng. Tên dài thì cắt bằng "…" chứ không xuống
                    // dòng — xuống dòng sẽ trông như hai người khác nhau.
                    return (
                      <div className="max-w-44 space-y-0.5">
                        {names.map((n, i) => (
                          <div key={i} className="truncate" title={n}>
                            {n}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </TableCell>
                {canViewContract && (
                  <TableCell className="text-right whitespace-nowrap">
                    {vnd(j.contractValue)}
                  </TableCell>
                )}
                <TableCell>
                  <JobStatusBadge status={j.status} />
                </TableCell>
              </ClickableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <Pagination info={pageInfo} label="vị trí" />
    </Card>
  );
}
