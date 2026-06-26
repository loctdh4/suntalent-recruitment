import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, clients } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/user";
import { renderJobPdf } from "@/lib/jobs/jd-pdf";

export const runtime = "nodejs";

function slug(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "jd"
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const [job] = await db
    .select({
      title: jobs.title,
      status: jobs.status,
      headcount: jobs.headcount,
      contractValue: jobs.contractValue,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      location: jobs.location,
      description: jobs.description,
      requiredSkills: jobs.requiredSkills,
      clientName: clients.name,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .where(eq(jobs.id, id))
    .limit(1);

  if (!job) return new Response("Not found", { status: 404 });

  const buffer = await renderJobPdf(job);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="JD-${slug(job.title)}.pdf"`,
    },
  });
}
