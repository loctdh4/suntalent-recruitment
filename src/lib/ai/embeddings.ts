import { EMBEDDING_DIM } from "@/lib/db/schema";

/**
 * Embeddings qua Jina AI (free, đa ngôn ngữ, hỗ trợ chọn số chiều).
 * Dùng task "text-matching" (đối xứng) để so job ↔ ứng viên.
 * Lấy API key free tại https://jina.ai/embeddings → JINA_API_KEY.
 */
const JINA_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = process.env.JINA_MODEL ?? "jina-embeddings-v3";

async function jinaEmbed(inputs: string[]): Promise<number[][]> {
  const key = process.env.JINA_API_KEY;
  if (!key) throw new Error("Thiếu JINA_API_KEY");

  const res = await fetch(JINA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      task: "text-matching",
      dimensions: EMBEDDING_DIM,
      input: inputs,
    }),
  });
  if (!res.ok) {
    throw new Error(`Jina embeddings ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    data: { index: number; embedding: number[] }[];
  };
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Tạo embedding cho một đoạn text. */
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await jinaEmbed([text.slice(0, 8000)]);
  return embedding;
}

/** Tạo embedding hàng loạt (dùng khi bulk import / backfill). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  return jinaEmbed(texts.map((t) => t.slice(0, 8000)));
}

/**
 * Ghép các trường quan trọng của ứng viên/job thành một "profile text"
 * để tạo embedding nhất quán giữa hai phía.
 */
export function candidateProfileText(input: {
  desiredPosition?: string | null;
  summary?: string | null;
  skills?: string[];
  experiences?: { title?: string | null; company?: string | null }[];
}): string {
  const parts = [
    input.desiredPosition ?? "",
    input.summary ?? "",
    (input.skills ?? []).join(", "),
    (input.experiences ?? [])
      .map((e) => [e.title, e.company].filter(Boolean).join(" @ "))
      .join("; "),
  ];
  return parts.filter(Boolean).join("\n");
}

export function jobProfileText(input: {
  title: string;
  description?: string | null;
  requiredSkills?: string[];
}): string {
  return [
    input.title,
    (input.requiredSkills ?? []).join(", "),
    input.description ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}
