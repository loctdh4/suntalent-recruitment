import { Suspense } from "react";
import { Building2, HandCoins, Info, Trophy, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
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
import { StatCard } from "@/components/stat-card";
import { TableSkeleton } from "@/components/table-skeleton";
import { TeamPerformanceChart } from "@/components/charts/team-performance-chart";
import { ClickableRow } from "@/components/clickable-row";
import { PeriodFilter } from "@/components/performance/period-filter";
import { ScoreBar } from "@/components/performance/score-bar";
import { MemberCell } from "@/components/performance/member-cell";
import { getPerformance, getSelectableYears } from "@/lib/performance/queries";
import { resolvePeriod, type Period } from "@/lib/performance/constants";

function vnd(n: number) {
  return n === 0 ? "—" : n.toLocaleString("vi-VN") + "₫";
}

function pct(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  await requireRole(["admin"]);
  const { month, year } = await searchParams;
  const period = resolvePeriod(month, year);
  const years = await getSelectableYears();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hiệu suất team</h1>
          <p className="text-sm text-muted-foreground">
            Đánh giá đóng góp của team Sales và HR (gồm cả intern) theo từng tháng.
          </p>
        </div>
        <PeriodFilter month={period.month} year={period.year} years={years} />
      </div>

      <Suspense key={period.label} fallback={<PerformanceSkeleton />}>
        <PerformanceBody period={period} />
      </Suspense>
    </div>
  );
}

async function PerformanceBody({ period }: { period: Period }) {
  const { sales, hr, totals } = await getPerformance(period);

  // Bấm vào thành viên → bảng chi tiết của chính kỳ đang xem, đúng góc nhìn
  // của bảng vừa bấm (doanh thu cho Sales, công việc tuyển dụng cho HR).
  const detailHref = (id: string, view: "sales" | "hr") =>
    `/performance/${id}?month=${period.month ?? "all"}&year=${period.year}&view=${view}`;

  const chartData = [...sales, ...hr]
    .filter((r) => r.apps > 0 || r.hired > 0)
    .sort((a, b) => b.hired - a.hired || b.apps - a.apps)
    .slice(0, 12)
    .map((r) => ({ name: r.name, apps: r.apps, hired: r.hired }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Đối tác mới" value={String(totals.newClients)} />
        <StatCard label="Vị trí mở mới" value={String(totals.newJobs)} />
        <StatCard label="CV thêm mới" value={String(totals.newCvs)} />
        <StatCard label="Ứng viên nhận việc" value={String(totals.hired)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            Khối lượng & kết quả theo thành viên
          </CardTitle>
          <CardDescription>
            {period.label} · {totals.apps} lượt vào pipeline · {totals.interviews} buổi
            PV khách hàng · doanh thu ước tính {vnd(totals.revenue)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamPerformanceChart data={chartData} />
        </CardContent>
      </Card>

      {/* Team Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Team Sales ({sales.length})
          </CardTitle>
          <CardDescription>
            Tính theo đối tác mang về và vị trí do mình sở hữu.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-56">Thành viên</TableHead>
                <TableHead className="text-right">Đối tác</TableHead>
                <TableHead className="text-right">Vị trí mở</TableHead>
                <TableHead className="text-right">Nhu cầu</TableHead>
                <TableHead className="text-right">Pipeline</TableHead>
                <TableHead className="text-right">Nhận việc</TableHead>
                <TableHead className="text-right">Lấp đầy</TableHead>
                <TableHead className="text-right">Doanh thu ƯT</TableHead>
                <TableHead className="min-w-32">Điểm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Chưa có thành viên Sales.
                  </TableCell>
                </TableRow>
              )}
              {sales.map((r, i) => (
                <ClickableRow key={r.id} href={detailHref(r.id, "sales")}>
                  <TableCell>
                    <MemberCell
                      name={r.name}
                      email={r.email}
                      role={r.role}
                      rank={i + 1}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.newClients}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.newJobs}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.headcount}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.apps}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {r.hired}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pct(r.fillRate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {vnd(r.revenue)}
                  </TableCell>
                  <TableCell>
                    <ScoreBar score={r.score} />
                  </TableCell>
                </ClickableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Team HR */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Team HR ({hr.length})
          </CardTitle>
          <CardDescription>
            Tính theo CV tự thêm và các vị trí được giao phụ trách.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-56">Thành viên</TableHead>
                <TableHead className="text-right">Job được giao</TableHead>
                <TableHead className="text-right">CV mới</TableHead>
                <TableHead className="text-right">Pipeline</TableHead>
                <TableHead className="text-right">Buổi PV</TableHead>
                <TableHead className="text-right">Đến PV</TableHead>
                <TableHead className="text-right">Nhận việc</TableHead>
                <TableHead className="text-right">Chuyển đổi</TableHead>
                <TableHead className="min-w-32">Điểm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hr.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Chưa có thành viên HR.
                  </TableCell>
                </TableRow>
              )}
              {hr.map((r, i) => (
                <ClickableRow key={r.id} href={detailHref(r.id, "hr")}>
                  <TableCell>
                    <MemberCell
                      name={r.name}
                      email={r.email}
                      role={r.role}
                      rank={i + 1}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.assignedJobs}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.newCvs}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.apps}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.interviews}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.attended}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {r.hired}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pct(r.convRate)}
                  </TableCell>
                  <TableCell>
                    <ScoreBar score={r.score} />
                  </TableCell>
                </ClickableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Info className="size-4" /> Cách tính điểm
          </p>
          <p>
            Mỗi chỉ số được chuẩn hóa theo người dẫn đầu nhóm rồi nhân trọng số, quy về
            thang 0–100. <b className="text-foreground">Sales</b>: nhận việc 35%, doanh
            thu 25%, đối tác 20%, vị trí mở 20%.{" "}
            <b className="text-foreground">HR</b>: nhận việc 35%, CV mới 25%, buổi PV
            20%, pipeline 20%.
          </p>
          <p className="flex items-start gap-2">
            <HandCoins className="mt-0.5 size-4 shrink-0" />
            Doanh thu ước tính = giá hợp đồng của vị trí × số ứng viên đã nhận việc; chỉ
            quy cho Sale sở hữu vị trí.
          </p>
          <p>
            Một vị trí giao cho nhiều HR thì mỗi người được tính đủ số liệu của vị trí
            đó (công dùng chung), nên tổng theo thành viên có thể lớn hơn tổng toàn hệ
            thống. Intern được xếp chung bảng với vai trò ghi rõ trên tên.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function PerformanceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-muted" />
      <TableSkeleton cols={9} />
      <TableSkeleton cols={9} />
    </div>
  );
}
