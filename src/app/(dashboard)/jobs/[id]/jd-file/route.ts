import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/user";
import { presignDownload } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const [j] = await db
    .select({ fileKey: jobs.jdUrl })
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1);

  if (!j?.fileKey) return new Response("Not found", { status: 404 });

  const url = await presignDownload(j.fileKey);
  return Response.redirect(url, 302);
}
