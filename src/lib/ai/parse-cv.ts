import { generateObject } from "ai";
import { z } from "zod";
import { chatModel } from "./provider";

// Lưu ý: Groq (strict structured output) yêu cầu MỌI field nằm trong `required`.
// → không dùng .optional()/.default(); field "rỗng" dùng .nullable() hoặc mảng [].
/** Schema dữ liệu trích xuất từ CV — validate output của LLM. */
export const parsedCvSchema = z.object({
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  industry: z.string().nullable(),
  yearsExp: z.number().nullable(),
  desiredPosition: z.string().nullable(),
  summary: z.string().nullable(),
  skills: z.array(z.string()),
  experiences: z.array(
    z.object({
      company: z.string().nullable(),
      title: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      description: z.string().nullable(),
    }),
  ),
});

export type ParsedCv = z.infer<typeof parsedCvSchema>;

/** Trích thông tin có cấu trúc từ text CV bằng LLM. */
export async function parseCvText(
  rawText: string,
  industryOptions: string[] = [],
): Promise<ParsedCv> {
  const industryHint = industryOptions.length
    ? [
        "industry: chọn DUY NHẤT một ngành nghề phù hợp nhất từ danh sách sau (sao chép chính xác chuỗi); nếu không khớp ngành nào thì để null.",
        `Danh sách ngành: ${industryOptions.join(" | ")}`,
      ]
    : ["industry: ngành nghề/lĩnh vực chính của ứng viên; nếu không rõ để null."];

  const { object } = await generateObject({
    model: chatModel,
    schema: parsedCvSchema,
    // Giảm retry nội bộ + giới hạn thời gian để không treo lâu khi LLM chậm/bị rate-limit.
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(60_000),
    prompt: [
      "Trích xuất thông tin từ CV sau thành JSON theo schema.",
      "desiredPosition: vị trí/chức danh công việc ứng viên đang hướng tới (mục tiêu nghề nghiệp); nếu không nêu rõ thì lấy chức danh gần nhất.",
      ...industryHint,
      "Chuẩn hóa kỹ năng thành danh sách ngắn gọn. Nếu thiếu thông tin, để null.",
      "",
      // Cắt ngắn để giảm token (tránh chạm giới hạn TPM free tier, xử lý nhanh hơn).
      rawText.slice(0, 12_000),
    ].join("\n"),
  });
  return object;
}
