/**
 * Matching Engine — kết hợp 3 tín hiệu (xem docs/architecture.md mục 6):
 *   1. Hard filter (lọc cứng) — xử lý ở tầng SQL trước khi gọi hàm này.
 *   2. Semantic similarity — cosine giữa embedding job ↔ candidate.
 *   3. Skill overlap — tỉ lệ kỹ năng yêu cầu được đáp ứng.
 * Trả về điểm tổng + breakdown để giải thích (explainability).
 */

export const MATCH_WEIGHTS = {
  semantic: 0.5,
  skill: 0.35,
  experience: 0.15,
} as const;

export interface MatchInput {
  semanticSimilarity: number | null; // 0..1; null nếu chưa có embedding
  requiredSkills: string[];
  candidateSkills: string[];
  requiredYears?: number | null;
  candidateYears?: number | null;
}

export interface MatchBreakdown {
  score: number; // 0..100
  semantic: number | null; // 0..1; null nếu không dùng được semantic
  skillMatchRatio: number; // 0..1
  experienceFit: number; // 0..1
  matchedSkills: string[];
  missingSkills: string[];
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function skillOverlap(required: string[], candidate: string[]) {
  const have = new Set(candidate.map(norm));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const r of required) {
    (have.has(norm(r)) ? matched : missing).push(r);
  }
  const ratio = required.length === 0 ? 1 : matched.length / required.length;
  return { matched, missing, ratio };
}

function experienceFit(requiredYears?: number | null, candidateYears?: number | null) {
  if (!requiredYears || requiredYears <= 0) return 1;
  if (candidateYears == null) return 0.5;
  return Math.min(1, candidateYears / requiredYears);
}

export function scoreMatch(input: MatchInput): MatchBreakdown {
  const { matched, missing, ratio } = skillOverlap(
    input.requiredSkills,
    input.candidateSkills,
  );
  const expFit = experienceFit(input.requiredYears, input.candidateYears);
  const hasSemantic = input.semanticSimilarity != null;
  const semantic = hasSemantic
    ? Math.max(0, Math.min(1, input.semanticSimilarity as number))
    : null;

  // Không có embedding → bỏ trọng số semantic, chuẩn hóa lại cho skill + experience.
  const w = hasSemantic
    ? MATCH_WEIGHTS
    : { semantic: 0, skill: 0.7, experience: 0.3 };

  const raw =
    (semantic ?? 0) * w.semantic + ratio * w.skill + expFit * w.experience;

  return {
    score: Math.round(raw * 100),
    semantic,
    skillMatchRatio: ratio,
    experienceFit: expFit,
    matchedSkills: matched,
    missingSkills: missing,
  };
}

/** Chuyển cosine distance của pgvector (0..2) về similarity 0..1. */
export function cosineDistanceToSimilarity(distance: number): number {
  return 1 - distance / 2;
}
