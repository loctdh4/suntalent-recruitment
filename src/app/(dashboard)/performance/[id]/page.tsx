import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { Button } from "@/components/ui/button";
import { PeriodFilter } from "@/components/performance/period-filter";
import { RevenueSheet } from "@/components/performance/revenue-sheet";
import { HrSheet } from "@/components/performance/hr-sheet";
import { getSelectableYears } from "@/lib/performance/queries";
import { getMember, getSaleDetail } from "@/lib/performance/detail";
import { getHrDetail } from "@/lib/performance/hr-detail";
import { resolvePeriod, ROLE_LABEL } from "@/lib/performance/constants";

/** Sale xem bảng doanh thu, HR xem bảng công việc tuyển dụng. */
function resolveView(role: string, raw: string | undefined): "sales" | "hr" {
  if (raw === "sales" || raw === "hr") return raw;
  return role === "recruiter" || role === "recruiter_intern" ? "hr" : "sales";
}

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; year?: string; view?: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const { month, year, view: rawView } = await searchParams;
  const period = resolvePeriod(month, year);

  const [member, years] = await Promise.all([getMember(id), getSelectableYears()]);
  if (!member) notFound();

  const view = resolveView(member.role, rawView);
  const [sale, hr] = await Promise.all([
    view === "sales" ? getSaleDetail(id, period) : null,
    view === "hr" ? getHrDetail(id, period) : null,
  ]);

  const qs = `month=${period.month ?? "all"}&year=${period.year}`;
  const backHref = `/performance?${qs}`;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={backHref}>
          <ArrowLeft className="size-4" /> Hiệu suất team
        </Link>
      </Button>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{member.name}</h1>
          <p className="text-sm text-muted-foreground">
            {ROLE_LABEL[member.role] ?? member.role} · {member.email}
          </p>
        </div>
        <PeriodFilter month={period.month} year={period.year} years={years} />
      </div>

      {/* Admin vừa sở hữu job vừa thêm CV → xem được cả hai góc nhìn. */}
      {member.role === "admin" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "sales" ? "default" : "outline"}
            asChild
          >
            <Link href={`/performance/${id}?${qs}&view=sales`}>Doanh thu</Link>
          </Button>
          <Button size="sm" variant={view === "hr" ? "default" : "outline"} asChild>
            <Link href={`/performance/${id}?${qs}&view=hr`}>Tuyển dụng</Link>
          </Button>
        </div>
      )}

      {view === "hr" && hr ? (
        <>
          <HrSheet detail={hr} period={period} />
          <p className="text-sm text-muted-foreground">
            Liệt kê vị trí được giao <b className="text-foreground">có phát sinh việc
            trong kỳ</b> (giao mới, thêm ứng viên, có PV hoặc có người nhận việc) — job
            giao từ tháng trước vẫn là việc của tháng này. Cột{" "}
            <b className="text-foreground">Ứng viên / PV / Nhận việc</b> đếm trong kỳ,{" "}
            <b className="text-foreground">Tiến độ</b> là lũy kế toàn bộ vị trí.{" "}
            <b className="text-foreground">Ghi chú</b> sinh từ lịch sử pipeline. Một vị
            trí giao nhiều HR thì cả hai cùng được tính.
          </p>
        </>
      ) : (
        <>
          {sale && <RevenueSheet detail={sale} period={period} />}
          <p className="text-sm text-muted-foreground">
            <b className="text-foreground">Doanh thu</b> = giá hợp đồng 1 vị trí × số
            lượng (chưa nhập giá → “Trả sau”).{" "}
            <b className="text-foreground">Tình trạng</b> tự suy ra: chưa đủ người → Đang
            tiến hành; đủ người và còn hạn bảo hành → Bảo hành; hết hạn hoặc vị trí đã
            đóng → Hoàn thành. <b className="text-foreground">Ghi chú</b> sinh từ lịch sử
            pipeline. Gói bảo hành đặt ở form tạo &amp; sửa vị trí.
          </p>
        </>
      )}
    </div>
  );
}
