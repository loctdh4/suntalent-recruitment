import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { clients, profiles } from "@/lib/db/schema";
import { CLIENT_MANAGER_ROLES } from "@/lib/clients/constants";
import { ClientsTable } from "@/components/clients/clients-table";
import { ClientFilters } from "@/components/clients/client-filters";
import { FiltersPendingProvider, PendingArea } from "@/components/filters-pending";
import { TableSkeleton } from "@/components/table-skeleton";
import { resolvePage } from "@/lib/pagination";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    loc?: string;
    type?: string;
    owner?: string;
    page?: string;
  }>;
}) {
  await requireRole([...CLIENT_MANAGER_ROLES]);
  const { q, loc, type, owner, page } = await searchParams;

  const conds: SQL[] = [];
  if (q?.trim()) {
    const kw = `%${q.trim()}%`;
    conds.push(
      or(
        ilike(clients.name, kw),
        ilike(clients.phone, kw),
        ilike(clients.email, kw),
        ilike(clients.location, kw),
      )!,
    );
  }
  if (loc?.trim()) conds.push(ilike(clients.location, `%${loc.trim()}%`));
  if (type === "business" || type === "individual") {
    conds.push(eq(clients.type, type));
  }
  if (owner) conds.push(eq(clients.createdBy, owner));

  // Danh sách người phụ trách cho bộ lọc + đếm số dòng khớp: độc lập nhau.
  const where = conds.length ? and(...conds) : undefined;
  const [ownerRows, [{ n: matched }]] = await Promise.all([
    db
      .select({ id: profiles.id, name: profiles.fullName, email: profiles.email })
      .from(profiles)
      .where(inArray(profiles.role, ["sales", "sales_intern", "admin"])),
    db.select({ n: count() }).from(clients).where(where),
  ]);
  const owners = ownerRows.map((p) => ({ id: p.id, name: p.name ?? p.email }));
  const pageInfo = resolvePage(page, matched);

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      type: clients.type,
      phone: clients.phone,
      email: clients.email,
      location: clients.location,
      createdByName: profiles.fullName,
      createdByEmail: profiles.email,
    })
    .from(clients)
    .leftJoin(profiles, eq(clients.createdBy, profiles.id))
    .where(where)
    .orderBy(desc(clients.createdAt))
    .limit(pageInfo.limit)
    .offset(pageInfo.offset);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Đối tác</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý thông tin khách hàng/đối tác tuyển dụng.
        </p>
      </div>

      <FiltersPendingProvider>
        <ClientFilters owners={owners} />
        <PendingArea fallback={<TableSkeleton cols={6} />}>
          <ClientsTable
            clients={rows}
            query={q || loc || type || owner || ""}
            pageInfo={pageInfo}
          />
        </PendingArea>
      </FiltersPendingProvider>
    </div>
  );
}
