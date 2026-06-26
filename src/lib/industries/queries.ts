import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { industries } from "@/lib/db/schema";

/** Danh sách tên ngành nghề (đã sắp xếp) để đổ vào dropdown. */
export async function getIndustryNames(): Promise<string[]> {
  const rows = await db
    .select({ name: industries.name })
    .from(industries)
    .orderBy(asc(industries.name));
  return rows.map((r) => r.name);
}
