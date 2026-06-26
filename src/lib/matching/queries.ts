import { and, desc, eq, ne, inArray, isNotNull, sql, cosineDistance } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  jobs,
  candidates,
  candidateSkills,
  skills,
  applications,
} from "@/lib/db/schema";
import { scoreMatch, type MatchBreakdown } from "./engine";
import { canonicalCity } from "./location";

/** Chỉ đề xuất ứng viên đạt mức phù hợp tối thiểu này (%). */
export const MATCH_SUGGEST_THRESHOLD = 80;

export type JobMatch = {
  candidateId: string;
  fullName: string | null;
  email: string | null;
  location: string | null;
  yearsExp: number | null;
  inPipeline: boolean;
  breakdown: MatchBreakdown;
};

/**
 * Gợi ý ứng viên phù hợp cho một job.
 * - Nếu job + candidate có embedding → xếp hạng theo semantic similarity (pgvector).
 * - Nếu chưa có embedding → lấy ứng viên "ready" và xếp hạng theo kỹ năng (fallback).
 */
export async function getJobMatches(
  jobId: string,
  limit = 20,
  threshold = MATCH_SUGGEST_THRESHOLD,
): Promise<JobMatch[]> {
  const [job] = await db
    .select({
      id: jobs.id,
      requiredSkills: jobs.requiredSkills,
      embedding: jobs.embedding,
      location: jobs.location,
      remote: jobs.remote,
      minYears: jobs.minYears,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job) return [];

  const required = job.requiredSkills ?? [];
  // Lọc cứng địa điểm: chỉ áp dụng khi job không remote và xác định được thành phố.
  const jobCity = job.remote ? null : canonicalCity(job.location);

  // 1) Lấy tập ứng viên (pool) + similarity nếu có embedding.
  type PoolRow = {
    id: string;
    fullName: string | null;
    email: string | null;
    location: string | null;
    yearsExp: number | null;
    seekingStatus: string;
    similarity: number | null;
  };

  let pool: PoolRow[];
  if (job.embedding) {
    const similarity = sql<number>`1 - (${cosineDistance(candidates.embedding, job.embedding)})`;
    pool = await db
      .select({
        id: candidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        location: candidates.location,
        yearsExp: candidates.yearsExp,
        seekingStatus: candidates.seekingStatus,
        similarity,
      })
      .from(candidates)
      .where(and(eq(candidates.status, "ready"), isNotNull(candidates.embedding)))
      .orderBy(desc(similarity))
      .limit(50);
  } else {
    const rows = await db
      .select({
        id: candidates.id,
        fullName: candidates.fullName,
        email: candidates.email,
        location: candidates.location,
        yearsExp: candidates.yearsExp,
        seekingStatus: candidates.seekingStatus,
      })
      .from(candidates)
      .where(eq(candidates.status, "ready"))
      .limit(100);
    pool = rows.map((r) => ({ ...r, similarity: null }));
  }

  if (pool.length === 0) return [];
  const ids = pool.map((p) => p.id);

  // 2) Lấy kỹ năng cho pool.
  const skillRows = await db
    .select({ candidateId: candidateSkills.candidateId, name: skills.name })
    .from(candidateSkills)
    .innerJoin(skills, eq(candidateSkills.skillId, skills.id))
    .where(inArray(candidateSkills.candidateId, ids));
  const skillMap = new Map<string, string[]>();
  for (const r of skillRows) {
    const arr = skillMap.get(r.candidateId) ?? [];
    arr.push(r.name);
    skillMap.set(r.candidateId, arr);
  }

  // 3) Ứng viên đã thuộc MỘT vị trí bất kỳ (giai đoạn chưa "Không phù hợp")
  //    → loại khỏi gợi ý (mỗi ứng viên chỉ ở 1 vị trí).
  const engaged = await db
    .select({ candidateId: applications.candidateId })
    .from(applications)
    .where(ne(applications.stage, "rejected"));
  const engagedSet = new Set(engaged.map((a) => a.candidateId));

  // 4) Chấm điểm + lọc + sắp xếp.
  return pool
    .filter((p) => {
      // Loại ứng viên đã thuộc một vị trí khác (đã được chọn).
      if (engagedSet.has(p.id)) return false;
      // Lọc cứng địa điểm: loại ứng viên có thành phố XÁC ĐỊNH khác job
      // (giữ lại ứng viên không rõ địa điểm để không bỏ sót do CV thiếu thông tin).
      if (!jobCity) return true;
      const cCity = canonicalCity(p.location);
      return cCity === null || cCity === jobCity;
    })
    .map((p) => {
      const breakdown = scoreMatch({
        semanticSimilarity: p.similarity,
        requiredSkills: required,
        candidateSkills: skillMap.get(p.id) ?? [],
        requiredYears: job.minYears,
        candidateYears: p.yearsExp,
      });
      // Ưu tiên người đang mở: trừ điểm mạnh nếu "không tìm việc".
      if (p.seekingStatus === "not_looking") {
        breakdown.score = Math.round(breakdown.score * 0.6);
      }
      return {
        candidateId: p.id,
        fullName: p.fullName,
        email: p.email,
        location: p.location,
        yearsExp: p.yearsExp,
        inPipeline: false,
        breakdown,
      };
    })
    .filter((m) => m.breakdown.score >= threshold)
    .sort((a, b) => b.breakdown.score - a.breakdown.score)
    .slice(0, limit);
}
