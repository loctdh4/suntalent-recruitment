import { eq } from "drizzle-orm";
import { extractText } from "unpdf";
import { db } from "@/lib/db";
import {
  candidates,
  candidateSkills,
  workExperiences,
  skills,
} from "@/lib/db/schema";
import { getObjectBytes } from "@/lib/storage";
import { parseCvText } from "@/lib/ai/parse-cv";
import { embedText, candidateProfileText } from "@/lib/ai/embeddings";
import { getIndustryNames } from "@/lib/industries/queries";

// Loại bỏ ký tự NUL (0x00) — Postgres không lưu được trong cột text (ligature fi/fl/ff).
const NUL = new RegExp(String.fromCharCode(0), "g");
export function stripNul(s: string): string {
  return s.replace(NUL, "");
}

/**
 * Xử lý CV: trích text → LLM trích cấu trúc → embedding (best-effort)
 * → lưu hồ sơ + kỹ năng + kinh nghiệm, đặt status = ready.
 * Ném lỗi nếu thất bại (caller đặt status = error).
 */
export async function processCandidate(candidateId: string, fileKey: string) {
  const bytes = await getObjectBytes(fileKey);
  const { text } = await extractText(bytes, { mergePages: true });
  const rawText = stripNul(Array.isArray(text) ? text.join("\n") : text);

  const industryOptions = await getIndustryNames();
  const parsed = await parseCvText(rawText, industryOptions);
  // Chỉ nhận ngành nằm trong danh mục (tránh AI bịa ngành ngoài list).
  const industry =
    parsed.industry && industryOptions.includes(parsed.industry)
      ? parsed.industry
      : null;

  let embedding: number[] | null = null;
  try {
    embedding = await embedText(
      candidateProfileText({
        desiredPosition: parsed.desiredPosition,
        summary: parsed.summary,
        skills: parsed.skills,
        experiences: parsed.experiences,
      }),
    );
  } catch {
    embedding = null;
  }

  await db
    .update(candidates)
    .set({
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      location: parsed.location,
      industry,
      yearsExp: parsed.yearsExp,
      desiredPosition: parsed.desiredPosition ? stripNul(parsed.desiredPosition) : null,
      summary: parsed.summary ? stripNul(parsed.summary) : null,
      rawText,
      embedding,
      status: "ready",
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, candidateId));

  await db.delete(candidateSkills).where(eq(candidateSkills.candidateId, candidateId));
  await db.delete(workExperiences).where(eq(workExperiences.candidateId, candidateId));

  for (const rawName of parsed.skills) {
    const name = stripNul(rawName).trim();
    const canonical = name.toLowerCase();
    if (!canonical) continue;
    const [existing] = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.canonicalName, canonical))
      .limit(1);
    const skillId =
      existing?.id ??
      (
        await db
          .insert(skills)
          .values({ name, canonicalName: canonical })
          .returning({ id: skills.id })
      )[0].id;
    await db
      .insert(candidateSkills)
      .values({ candidateId, skillId })
      .onConflictDoNothing();
  }

  if (parsed.experiences.length) {
    await db.insert(workExperiences).values(
      parsed.experiences.map((e) => ({
        candidateId,
        company: e.company ? stripNul(e.company) : null,
        title: e.title ? stripNul(e.title) : null,
        startDate: e.startDate,
        endDate: e.endDate,
        description: e.description ? stripNul(e.description) : null,
      })),
    );
  }
}

/** Đặt trạng thái lỗi cho ứng viên. */
export async function markCandidateError(candidateId: string) {
  await db
    .update(candidates)
    .set({ status: "error" })
    .where(eq(candidates.id, candidateId));
}
