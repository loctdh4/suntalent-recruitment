import { asc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { industries } from "@/lib/db/schema";
import { IndustriesManager } from "@/components/industries/industries-manager";

export default async function IndustriesPage() {
  await requireRole(["admin"]);

  const rows = await db
    .select({ id: industries.id, name: industries.name })
    .from(industries)
    .orderBy(asc(industries.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Danh mục ngành nghề</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý danh sách ngành nghề/lĩnh vực cho ứng viên và vị trí.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ngành nghề ({rows.length})</CardTitle>
          <CardDescription>Thêm ngành mới hoặc xóa ngành không dùng.</CardDescription>
        </CardHeader>
        <CardContent>
          <IndustriesManager industries={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
