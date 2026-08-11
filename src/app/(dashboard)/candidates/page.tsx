import Link from "next/link";
import { Target, MapPin, Clock } from "lucide-react";
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  notInArray,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { candidates, applications, jobs, clients } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/user";
import { CANDIDATE_MANAGER_ROLES } from "@/lib/candidates/constants";
import { CvUploadButton } from "@/components/candidates/cv-upload-button";
import { CandidateManualDialog } from "@/components/candidates/candidate-manual-dialog";
import { CandidateStatusBadge } from "@/components/candidates/candidate-status-badge";
import { StageBadge } from "@/components/applications/stage-badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { BackfillButton } from "@/components/matching/backfill-button";
import { CandidateFilters } from "@/components/candidates/candidate-filters";
import { StatCard } from "@/components/stat-card";
import { FiltersPendingProvider, PendingArea } from "@/components/filters-pending";
import { TableSkeleton } from "@/components/table-skeleton";
import { ClickableRow } from "@/components/clickable-row";
import { formatDate } from "@/lib/format";
import { getIndustryNames } from "@/lib/industries/queries";
import { resolvePage } from "@/lib/pagination";
import { Pagination } from "@/components/pagination";

const STATUS_VALUES = ["parsing", "ready", "error"] as const;

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    loc?: string;
    ind?: string;
    page?: string;
  }>;
}) {
  const { q, status, loc, ind, page } = await searchParams;
  const user = await getCurrentUser();
  const canManage = CANDIDATE_MANAGER_ROLES.includes(
    (user?.role ?? "") as (typeof CANDIDATE_MANAGER_ROLES)[number],
  );

  const conds: SQL[] = [];
  if (q?.trim()) {
    const kw = `%${q.trim()}%`;
    conds.push(
      or(
        ilike(candidates.fullName, kw),
        ilike(candidates.email, kw),
        ilike(candidates.phone, kw),
        ilike(candidates.desiredPosition, kw),
      )!,
    );
  }
  if (status && (STATUS_VALUES as readonly string[]).includes(status)) {
    conds.push(eq(candidates.status, status as (typeof STATUS_VALUES)[number]));
  }
  if (loc?.trim()) conds.push(ilike(candidates.location, `%${loc.trim()}%`));
  if (ind?.trim()) conds.push(eq(candidates.industry, ind.trim()));

  // Bước 1 — đếm số dòng khớp lọc (để biết số trang) cùng lúc với danh sách
  // ngành và các thống kê tổng; tất cả độc lập nhau nên gọi song song.
  const where = conds.length ? and(...conds) : undefined;
  const [
    [{ n: matched }],
    industryList,
    [{ n: totalCand }],
    [{ n: engagedCand }],
    [{ n: hiredCand }],
  ] = await Promise.all([
    db.select({ n: count() }).from(candidates).where(where),
    getIndustryNames(),
    db.select({ n: count() }).from(candidates),
    // Đếm theo ứng viên (không theo hồ sơ ứng tuyển) để cùng đơn vị với
    // "Tổng ứng viên" — một người ứng tuyển 3 vị trí vẫn chỉ là 1 ứng viên.
    db
      .select({ n: countDistinct(applications.candidateId) })
      .from(applications)
      .where(notInArray(applications.stage, ["rejected", "hired"])),
    db
      .select({ n: countDistinct(applications.candidateId) })
      .from(applications)
      .where(eq(applications.stage, "hired")),
  ]);
  const pageInfo = resolvePage(page, matched);

  // Bước 2 — tải đúng 1 trang (cần pageInfo nên phải chờ bước 1).
  const rows = await db
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      email: candidates.email,
      desiredPosition: candidates.desiredPosition,
      location: candidates.location,
      industry: candidates.industry,
      yearsExp: candidates.yearsExp,
      status: candidates.status,
      updatedAt: candidates.updatedAt,
    })
    .from(candidates)
    .where(where)
    .orderBy(desc(candidates.createdAt))
    .limit(pageInfo.limit)
    .offset(pageInfo.offset);

  // Bước 3 — vị trí đang ứng tuyển của đúng 20 ứng viên trên trang.
  const ids = rows.map((r) => r.id);
  const appRows = ids.length
    ? await db
        .select({
          candidateId: applications.candidateId,
          jobId: jobs.id,
          jobTitle: jobs.title,
          clientName: clients.name,
          stage: applications.stage,
        })
        .from(applications)
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .leftJoin(clients, eq(jobs.clientId, clients.id))
        .where(inArray(applications.candidateId, ids))
        .orderBy(desc(applications.createdAt))
    : [];
  // Mỗi ứng viên có thể ở nhiều pipeline. Chọn hồ sơ tiêu biểu để hiển thị:
  //  1. Ưu tiên hồ sơ còn chạy, giai đoạn xa nhất (PV khách hàng > sàng lọc > mới).
  //  2. Nếu không còn hồ sơ nào chạy, vẫn hiển thị kết quả cuối (đã nhận việc,
  //     rồi mới tới không phù hợp) thay vì để trống — ứng viên vẫn nằm trên bảng
  //     pipeline nên cột trống là sai.
  const ACTIVE_RANK: Record<string, number> = { client_iv: 3, screening: 2, new: 1 };
  const byCandidate = new Map<string, typeof appRows>();
  for (const r of appRows) {
    const list = byCandidate.get(r.candidateId);
    if (list) list.push(r);
    else byCandidate.set(r.candidateId, [r]);
  }
  const appMap = new Map<
    string,
    { app: (typeof appRows)[number]; others: number }
  >();
  for (const [candidateId, list] of byCandidate) {
    // list đã sắp theo createdAt giảm dần → cùng giai đoạn thì lấy hồ sơ mới nhất.
    const active = list.filter((r) => ACTIVE_RANK[r.stage] != null);
    if (active.length) {
      const best = active.reduce((a, b) =>
        ACTIVE_RANK[b.stage] > ACTIVE_RANK[a.stage] ? b : a,
      );
      appMap.set(candidateId, { app: best, others: active.length - 1 });
    } else {
      const best = list.find((r) => r.stage === "hired") ?? list[0];
      appMap.set(candidateId, { app: best, others: 0 });
    }
  }

  const hasParsing = rows.some((r) => r.status === "parsing");
  const hasFilter = Boolean(q?.trim() || status || loc || ind);

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={hasParsing} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ứng viên</h1>
          <p className="text-sm text-muted-foreground">
            Talent Database — tải CV để hệ thống tự trích xuất thông tin.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <BackfillButton />
            <CandidateManualDialog industries={industryList} />
            <CvUploadButton />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tổng ứng viên" value={String(totalCand)} />
        <StatCard label="Đang ứng tuyển" value={String(engagedCand)} />
        <StatCard label="Đã nhận việc" value={String(hiredCand)} />
      </div>

      <FiltersPendingProvider>
        <CandidateFilters industries={industryList} />

        <PendingArea fallback={<TableSkeleton cols={6} />}>
      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {hasFilter ? "Không tìm thấy ứng viên" : "Chưa có ứng viên"}
            </CardTitle>
            <CardDescription>
              {hasFilter
                ? "Không có ứng viên khớp bộ lọc. Thử đổi từ khóa hoặc bộ lọc."
                : canManage
                  ? "Bấm “Phân tích AI” hoặc “Thêm ứng viên” để bắt đầu."
                  : "Chưa có dữ liệu ứng viên."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* Mobile: mỗi ứng viên một card */}
          <div className="space-y-3 sm:hidden">
            {rows.map((c) => {
              const entry = appMap.get(c.id);
              return (
                <Card key={c.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/candidates/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.fullName ?? "(Chưa trích xuất)"}
                      </Link>
                      <CandidateStatusBadge status={c.status} />
                    </div>
                    {c.email && (
                      <div className="text-sm text-muted-foreground">{c.email}</div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {c.desiredPosition && (
                        <span className="flex items-center gap-1">
                          <Target className="size-3.5" /> {c.desiredPosition}
                        </span>
                      )}
                      {c.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" /> {c.location}
                        </span>
                      )}
                      {c.yearsExp != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" /> {c.yearsExp} năm KN
                        </span>
                      )}
                    </div>
                    {entry && (
                      <div className="flex flex-wrap items-center gap-2 border-t pt-2 text-sm">
                        <span className="text-muted-foreground">Vị trí ứng tuyển:</span>
                        <Link
                          href={`/jobs/${entry.app.jobId}`}
                          className="font-medium hover:underline"
                        >
                          {entry.app.jobTitle}
                        </Link>
                        <StageBadge stage={entry.app.stage} />
                        {entry.others > 0 && (
                          <span className="text-xs text-muted-foreground">
                            +{entry.others} vị trí khác
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop: bảng */}
          <Card className="hidden sm:block">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead>Ứng viên</TableHead>
                  <TableHead>Vị trí tìm</TableHead>
                  <TableHead>Ngành</TableHead>
                  <TableHead>Vị trí ứng tuyển</TableHead>
                  <TableHead>Địa điểm</TableHead>
                  <TableHead className="text-right">Năm KN</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="whitespace-nowrap">Cập nhật</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                    <ClickableRow key={c.id} href={`/candidates/${c.id}`}>
                      <TableCell>
                        <Link
                          href={`/candidates/${c.id}`}
                          className="font-medium hover:underline"
                        >
                          {c.fullName ?? "(Chưa trích xuất)"}
                        </Link>
                        {c.email && (
                          <div className="text-sm text-muted-foreground">{c.email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.desiredPosition ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.industry ?? "—"}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const entry = appMap.get(c.id);
                          if (!entry) return <span className="text-muted-foreground">—</span>;
                          const { app, others } = entry;
                          return (
                            <div className="space-y-1">
                              <Link
                                href={`/jobs/${app.jobId}`}
                                className="font-medium hover:underline"
                              >
                                {app.jobTitle}
                              </Link>
                              {app.clientName && (
                                <div className="text-xs text-muted-foreground">
                                  {app.clientName}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <StageBadge stage={app.stage} />
                                {others > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{others} vị trí khác
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>{c.location ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {c.yearsExp != null ? c.yearsExp : "—"}
                      </TableCell>
                      <TableCell>
                        <CandidateStatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                        {formatDate(c.updatedAt)}
                      </TableCell>
                    </ClickableRow>
                ))}
              </TableBody>
            </Table>
            </CardContent>
            <Pagination info={pageInfo} label="ứng viên" />
          </Card>
        </>
      )}
        </PendingArea>
      </FiltersPendingProvider>
    </div>
  );
}
