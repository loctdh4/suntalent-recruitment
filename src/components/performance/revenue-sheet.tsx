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
import { DealStatusBadge } from "@/components/performance/deal-status-badge";
import type { SaleDetail } from "@/lib/performance/detail";
import type { Period } from "@/lib/performance/constants";
import { formatDate, formatJobCode } from "@/lib/format";
import { cn } from "@/lib/utils";

function vnd(n: number) {
  return n.toLocaleString("vi-VN");
}

/** Bảng "DOANH THU THÁNG x/yyyy" — bám sát file đang dùng thủ công. */
export function RevenueSheet({
  detail,
  period,
}: {
  detail: SaleDetail;
  period: Period;
}) {
  const { rows, totals } = detail;
  const heading =
    period.month == null
      ? `Doanh thu năm ${period.year}`
      : `Doanh thu tháng ${period.month}/${period.year}`;

  return (
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
              <TableHead className="whitespace-nowrap">Ngày kí</TableHead>
              <TableHead className="text-center">Số lượng</TableHead>
              <TableHead className="min-w-40">Vị trí</TableHead>
              <TableHead className="text-right">Doanh thu</TableHead>
              <TableHead>Hình thức</TableHead>
              <TableHead>Tình trạng</TableHead>
              <TableHead className="min-w-56">Ghi chú</TableHead>
              <TableHead className="whitespace-nowrap">SĐT</TableHead>
              <TableHead className="whitespace-nowrap">Gói bảo hành</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                  Không có hợp đồng nào kí trong kỳ này.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
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
                <TableCell className="whitespace-nowrap">
                  {formatDate(r.signedAt)}
                </TableCell>
                <TableCell className="text-center tabular-nums">{r.headcount}</TableCell>
                <TableCell>
                  <Link href={`/jobs/${r.jobId}`} className="hover:underline">
                    {r.title}
                  </Link>
                  <span className="ml-1 text-xs text-muted-foreground">
                    #{formatJobCode(r.jobCode)}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.revenue == null ? (
                    <span className="text-muted-foreground">Trả sau</span>
                  ) : (
                    vnd(r.revenue)
                  )}
                </TableCell>
                <TableCell>
                  <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                    {r.clientType === "individual" ? "Cá nhân" : "Doanh nghiệp"}
                  </Badge>
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
                  {r.hired < r.headcount && (
                    <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                      Còn {r.headcount - r.hired} nhân sự
                    </p>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {r.phone ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "whitespace-nowrap",
                      r.warrantyMonths >= 6
                        ? "bg-red-600 text-white"
                        : r.warrantyMonths >= 2
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100"
                          : "bg-emerald-500 text-white",
                    )}
                  >
                    {r.warrantyMonths} tháng
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="font-semibold">
                  Tổng cộng ({rows.length} hợp đồng)
                </TableCell>
                <TableCell className="text-center font-semibold tabular-nums">
                  {totals.headcount}
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold tabular-nums">
                  {vnd(totals.revenue)}
                </TableCell>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  Đã ghi nhận (ứng viên nhận việc):{" "}
                  <b className="text-foreground">{vnd(totals.earned)}</b> · {totals.hired}/
                  {totals.headcount} nhân sự
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </CardContent>
    </Card>
  );
}
