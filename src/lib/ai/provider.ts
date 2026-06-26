import { createGroq } from "@ai-sdk/groq";

/**
 * Nhà cung cấp LLM cho trích xuất CV: **Groq** (free) qua GROQ_API_KEY.
 * Mặc định `openai/gpt-oss-20b` vì hỗ trợ structured output (json_schema) cho generateObject.
 * Đổi qua env GROQ_MODEL (model phải hỗ trợ structured output).
 *
 * Embeddings không dùng ở đây — xem lib/ai/embeddings.ts (Jina AI).
 */
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const chatModel = groq(process.env.GROQ_MODEL ?? "openai/gpt-oss-20b");
