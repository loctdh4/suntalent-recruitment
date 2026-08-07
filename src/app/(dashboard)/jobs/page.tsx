import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { count, eq, notInArray, sum } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { jobs, clients, applications, profiles } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/user";
import { JOB_MANAGER_ROLES } from "@/lib/jobs/constants";
import { JobFilters } from "@/components/jobs/job-filters";
import { getIndustryNames } from "@/lib/industries/queries";
import {
  FiltersPendingProvider,
  PendingArea,
} from "@/components/filters-pending";
import {
  JobsTableSection,
  type JobsTableFilters,
} from "@/components/jobs/jobs-table-section";
import { JobsTableSkeleton } from "@/components/jobs/jobs-table-skeleton";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<JobsTableFilters>;
}) {
  const filters = await searchParams;
  const user = await getCurrentUser();
  const role = user?.role ?? "";
  const canCreate = JOB_MANAGER_ROLES.includes(
    role as (typeof JOB_MANAGER_ROLES)[number],
  );
  // Giá hợp đồng: chỉ admin/sale xem; lọc theo range chỉ admin.
  const canViewContract = role === "admin" || role === "sales";
  const canFilterContract = role === "admin";
  // HR/HR intern: chỉ job mình được giao; Sale/Sale intern: chỉ job mình tạo.
  const hrOnly = role === "recruiter" || role === "recruiter_intern";
  const salesOnly = role === "sales" || role === "sales_intern";
  const restrictRecruiterId = hrOnly ? user?.id : undefined;
  const restrictOwnerId = salesOnly ? user?.id : undefined;
  const scoped = hrOnly || salesOnly;

  // Tùy chọn filter + thống kê tổng: độc lập nhau nên gọi song song
  // (mỗi round-trip tới DB tốn ~80ms, gọi nối tiếp là cộng dồn).
  const [
    people,
    clientList,
    industryList,
    statusRows,
    [{ headcount }],
    [{ n: activeApps }],
    [{ n: hiredApps }],
  ] = await Promise.all([
    db
      .select({
        id: profiles.id,
        name: profiles.fullName,
        email: profiles.email,
        role: profiles.role,
      })
      .from(profiles),
    db.select({ id: clients.id, name: clients.name }).from(clients).orderBy(clients.name),
    getIndustryNames(),
    db.select({ status: jobs.status, n: count() }).from(jobs).groupBy(jobs.status),
    db
      .select({ headcount: sum(jobs.headcount) })
      .from(jobs)
      .where(eq(jobs.status, "open")),
    db
      .select({ n: count() })
      .from(applications)
      .where(notInArray(applications.stage, ["rejected", "hired"])),
    db.select({ n: count() }).from(applications).where(eq(applications.stage, "hired")),
  ]);

  const saleOptions = people
    .filter((p) => ["sales", "sales_intern", "admin"].includes(p.role))
    .map((p) => ({ id: p.id, name: p.name ?? p.email }));
  const hrOptions = people
    .filter((p) => ["recruiter", "recruiter_intern", "admin"].includes(p.role))
    .map((p) => ({ id: p.id, name: p.name ?? p.email }));
  const jobStat = (s: string) => statusRows.find((r) => r.status === s)?.n ?? 0;
  const totalJobs = statusRows.reduce((a, r) => a + r.n, 0);

  // Key đổi mỗi khi bộ lọc đổi → Suspense hiện skeleton tới khi bảng mới xong.
  const tableKey = JSON.stringify(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vị trí tuyển dụng</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý vị trí, khách hàng, số lượng và giá hợp đồng.
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="size-4" /> Tạo vị trí
            </Link>
          </Button>
        )}
      </div>

      {!scoped && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground">Tổng vị trí</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{totalJobs}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>Đang mở: <b className="text-foreground">{jobStat("open")}</b></span>
                <span>Tạm dừng: <b className="text-foreground">{jobStat("on_hold")}</b></span>
                <span>Đã đóng: <b className="text-foreground">{jobStat("closed")}</b></span>
                <span>Đã tuyển: <b className="text-foreground">{jobStat("filled")}</b></span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground">
                Nhu cầu tuyển (vị trí đang mở)
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {Number(headcount ?? 0)}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>Đang ứng tuyển: <b className="text-foreground">{activeApps}</b></span>
                <span>Đã nhận việc: <b className="text-foreground">{hiredApps}</b></span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <FiltersPendingProvider>
        <JobFilters
          clients={clientList}
          sales={saleOptions}
          hrs={hrOptions}
          industries={industryList}
          showContract={canFilterContract}
          hideSale={scoped}
          hideHr={hrOnly}
        />

        <PendingArea fallback={<JobsTableSkeleton />}>
          <Suspense key={tableKey} fallback={<JobsTableSkeleton />}>
            <JobsTableSection
              filters={filters}
              canViewContract={canViewContract}
              canFilterContract={canFilterContract}
              canCreate={canCreate}
              restrictRecruiterId={restrictRecruiterId}
              restrictOwnerId={restrictOwnerId}
            />
          </Suspense>
        </PendingArea>
      </FiltersPendingProvider>
    </div>
  );
}
