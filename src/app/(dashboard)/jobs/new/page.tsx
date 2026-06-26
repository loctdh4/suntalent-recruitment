import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/user";
import { JOB_MANAGER_ROLES } from "@/lib/jobs/constants";
import { getIndustryNames } from "@/lib/industries/queries";
import { JobForm } from "@/components/jobs/job-form";

export default async function NewJobPage() {
  const user = await getCurrentUser();
  const role = user?.role ?? "";
  if (!JOB_MANAGER_ROLES.includes(role as (typeof JOB_MANAGER_ROLES)[number])) {
    redirect("/jobs");
  }

  const clientList = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .orderBy(clients.name);
  const industryList = await getIndustryNames();

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/jobs">
          <ArrowLeft className="size-4" /> Vị trí
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">Tạo vị trí tuyển dụng</h1>
        <p className="text-sm text-muted-foreground">
          Thông tin khách hàng, vị trí, số lượng và giá hợp đồng.
        </p>
      </div>
      <JobForm clients={clientList} industries={industryList} />
    </div>
  );
}
