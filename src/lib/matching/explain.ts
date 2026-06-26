import type { MatchBreakdown } from "./engine";

/** Sinh giải thích ngắn gọn cho recruiter: vì sao ứng viên đạt điểm này. */
export function explainMatch(b: MatchBreakdown): string {
  const lines: string[] = [];
  lines.push(`Mức phù hợp tổng: ${b.score}%`);
  if (b.semantic != null) {
    lines.push(`- Ngữ nghĩa hồ sơ: ${Math.round(b.semantic * 100)}%`);
  }
  lines.push(
    `- Kỹ năng đáp ứng: ${Math.round(b.skillMatchRatio * 100)}%` +
      (b.matchedSkills.length ? ` (${b.matchedSkills.join(", ")})` : ""),
  );
  if (b.missingSkills.length) {
    lines.push(`- Kỹ năng còn thiếu: ${b.missingSkills.join(", ")}`);
  }
  lines.push(`- Phù hợp kinh nghiệm: ${Math.round(b.experienceFit * 100)}%`);
  return lines.join("\n");
}
