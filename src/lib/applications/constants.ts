/** Các giai đoạn pipeline tuyển dụng (khớp enum applications.stage). */
export const PIPELINE_STAGES = [
  { value: "new", label: "Mới tiếp nhận" },
  { value: "screening", label: "Đang sàng lọc" },
  { value: "client_iv", label: "PV khách hàng" },
  { value: "hired", label: "Đã nhận việc" },
  { value: "rejected", label: "Không phù hợp" },
] as const;

export const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.value, s.label]),
);

export const STAGE_VALUES = PIPELINE_STAGES.map((s) => s.value);

/** Lý do có sẵn khi chuyển sang "Không phù hợp". */
export const REJECT_REASONS = [
  "PV không đạt",
  "Đạt nhưng không nhận việc",
  "Không hoàn thành thử việc",
] as const;
