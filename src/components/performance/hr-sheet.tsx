import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { DealStatusBadge } from "@/components/performance/deal-status-badge";
import type { HrDetail } from "@/lib/performance/hr-detail";
import type { Period } from "@/lib/performance/constants";
import { formatDate, formatJobCode } from "@/lib/format";
import { STAGE_LABEL } from "@/lib/applications/constants";
import { CANDIDATE_STATUS_LABEL, SEEKING_LABEL } from "@/lib/candidates/constants";
import { cn } from "@/lib/utils";

/** Thanh tiến độ lấp đầy vị trí. */
function Progress({ done, total }: { done: number; total: number }) {
  const ratio = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-14 shrink-0 rounded-full bg-muted">
        <div
          className={cn(
            "h-2 rounded-full",
            ratio >= 1 ? "bg-emerald-500" : ratio > 0 ? "bg-amber-500" : "bg-muted",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-sm tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

/** Bảng công việc tuyển dụng của một HR trong kỳ. */
export function HrSheet({ detail, period }: { detail: HrDetail; period: Period }) {
  const { jobRows, cvRows, totals } = detail;
  const heading =
    period.month == null
      ? `Kết quả tuyển dụng năm ${period.year}`
      : `Kết quả tuyển dụng tháng ${period.month}/${period.year}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vị trí phụ trách" value={String(totals.jobs)} />
        <StatCard label="CV thêm mới" value={String(totals.newCvs)} />
        <StatCard label="Ứng viên vào pipeline" value={String(totals.apps)} />
        <StatCard
          label="Nhận việc"
          value={`${totals.hired}/${totals.headcount}`}
        />
      </div>

      <Card className="overflow-hidden py-0">
        <div className="border-b bg-amber-50 py-3 text-center dark:bg-amber-950/40">
          <h2 className="text-lg font-bold tracking-wide">{heading}</h2>
        </div>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="w-12 text-center">STT</TableHead>
                <TableHead className="min-w-52">Tên công ty</TableHead>
                <TableHead className="min-w-40">Vị trí</TableHead>
                <TableHead className="whitespace-nowrap">Ngày giao</TableHead>
                <TableHead className="text-center">Số lượng</TableHead>
                <TableHead className="text-center">Ứng viên</TableHead>
                <TableHead className="text-center">PV (đến/hẹn)</TableHead>
                <TableHead className="text-center">Nhận việc</TableHead>
                <TableHead className="whitespace-nowrap">Tiến độ</TableHead>
                <TableHead>Tình trạng</TableHead>
                <TableHead className="min-w-56">Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                    Không có vị trí nào phát sinh công việc trong kỳ này.
                  </TableCell>
                </TableRow>
              )}
              {jobRows.map((r, i) => (
                <TableRow key={r.jobId} className="align-top">
                  <TableCell className="text-center font-semibold">{i + 1}</TableCell>
                  <TableCell>
                    {r.clientId ? (
                      <Link
                        href={`/clients/${r.clientId}`}
                        className="font-semibold hover:underline"
                      >
                        {r.clientName}
                      </Link>
                    ) : (
                      <span className="font-semibold text-muted-foreground">
                        {r.clientName}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/jobs/${r.jobId}`} className="hover:underline">
                      {r.title}
                    </Link>
                    <span className="ml-1 text-xs text-muted-foreground">
                      #{formatJobCode(r.jobCode)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(r.assignedAt)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{r.headcount}</TableCell>
                  <TableCell className="text-center tabular-nums">{r.apps}</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {r.interviews === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      `${r.attended}/${r.interviews}`
                    )}
                  </TableCell>
                  <TableCell className="text-center font-medium tabular-nums">
                    {r.hired}
                  </TableCell>
                  <TableCell>
                    <Progress done={r.hiredTotal} total={r.headcount} />
                  </TableCell>
                  <TableCell>
                    <DealStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.notes.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {r.notes.map((n, k) => (
                          <li key={k}>{n}</li>
                        ))}
                      </ul>
                    )}
                    {r.hiredTotal < r.headcount && (
                      <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                        Còn {r.headcount - r.hiredTotal} nhân sự
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {jobRows.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="font-semibold">
                    Tổng cộng ({jobRows.length} vị trí)
                  </TableCell>
                  <TableCell className="text-center font-semibold tabular-nums">
                    {totals.headcount}
                  </TableCell>
                  <TableCell className="text-center font-semibold tabular-nums">
                    {totals.apps}
                  </TableCell>
                  <TableCell className="text-center font-semibold tabular-nums">
                    {totals.attended}/{totals.interviews}
                  </TableCell>
                  <TableCell className="text-center font-semibold tabular-nums">
                    {totals.hired}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* CV do HR tự tìm về trong kỳ */}
      <Card className="overflow-hidden py-0">
        <div className="border-b bg-muted/50 px-4 py-3">
          <h2 className="font-semibold">
            CV thêm mới trong kỳ ({cvRows.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Hồ sơ do chính {detail.member.name} đưa vào hệ thống.
          </p>
        </div>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="w-12 text-center">STT</TableHead>
                <TableHead className="min-w-44">Họ tên</TableHead>
                <TableHead className="min-w-40">Vị trí mong muốn</TableHead>
                <TableHead>Ngành</TableHead>
                <TableHead className="text-center">KN</TableHead>
                <TableHead>Tìm việc</TableHead>
                <TableHead className="min-w-40">Đang ứng tuyển</TableHead>
                <TableHead className="whitespace-nowrap">Ngày thêm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cvRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Chưa thêm CV nào trong kỳ này.
                  </TableCell>
                </TableRow>
              )}
              {cvRows.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="text-center font-semibold">{i + 1}</TableCell>
                  <TableCell>
                    <Link
                      href={`/candidates/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.status !== "ready" && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {CANDIDATE_STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.desiredPosition ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {c.industry ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {c.yearsExp == null ? "—" : `${c.yearsExp}n`}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={c.seekingStatus === "looking" ? "default" : "outline"}
                      className="whitespace-nowrap"
                    >
                      {SEEKING_LABEL[c.seekingStatus] ?? c.seekingStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.jobId ? (
                      <>
                        <Link href={`/jobs/${c.jobId}`} className="hover:underline">
                          {c.jobTitle}
                        </Link>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({STAGE_LABEL[c.stage ?? ""] ?? c.stage})
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Chưa vào pipeline</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(c.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
