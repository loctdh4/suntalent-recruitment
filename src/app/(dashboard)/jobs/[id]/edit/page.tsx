import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { jobs, clients } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/user";
import { JOB_MANAGER_ROLES } from "@/lib/jobs/constants";
import { getIndustryNames } from "@/lib/industries/queries";
import { JobForm } from "@/components/jobs/job-form";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const role = user?.role ?? "";
  if (!JOB_MANAGER_ROLES.includes(role as (typeof JOB_MANAGER_ROLES)[number])) {
    redirect(`/jobs/${id}`);
  }

  const [job] = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      clientId: jobs.clientId,
      location: jobs.location,
      industry: jobs.industry,
      remote: jobs.remote,
      priority: jobs.priority,
      minYears: jobs.minYears,
      headcount: jobs.headcount,
      contractValue: jobs.contractValue,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      requiredSkills: jobs.requiredSkills,
      description: jobs.description,
      jdUrl: jobs.jdUrl,
    })
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1);

  if (!job) notFound();

  const clientList = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .orderBy(clients.name);
  const industryList = await getIndustryNames();

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/jobs/${id}`}>
          <ArrowLeft className="size-4" /> {job.title}
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">Sửa vị trí</h1>
        <p className="text-sm text-muted-foreground">
          Cập nhật thông tin vị trí tuyển dụng.
        </p>
      </div>
      <JobForm clients={clientList} industries={industryList} job={job} />
    </div>
  );
}
