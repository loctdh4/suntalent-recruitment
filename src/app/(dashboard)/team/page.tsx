import { desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { TeamTable } from "@/components/team/team-table";

export default async function TeamPage() {
  const me = await requireRole(["admin"]);
  const members = await db.select().from(profiles).orderBy(desc(profiles.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Quản lý team</h1>
        <p className="text-sm text-muted-foreground">
          Tạo tài khoản và phân quyền cho thành viên. Chỉ admin truy cập được trang này.
        </p>
      </div>
      <TeamTable members={members} currentUserId={me.id} />
    </div>
  );
}
