/** Số dòng mỗi trang cho các bảng danh sách. */
export const PAGE_SIZE = 20;

export type PageInfo = {
  /** Trang hiện tại, bắt đầu từ 1 và luôn nằm trong [1, pageCount]. */
  page: number;
  pageCount: number;
  total: number;
  /** Dùng cho SQL `limit`/`offset` hoặc `Array.slice(offset, offset + limit)`. */
  offset: number;
  limit: number;
};

/**
 * Chuẩn hóa searchParam `page` theo tổng số dòng.
 * Trang rác / vượt quá số trang → kẹp về trang gần nhất hợp lệ.
 */
export function resolvePage(raw: string | undefined, total: number): PageInfo {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const n = Number(raw);
  const page = Number.isInteger(n) && n >= 1 ? Math.min(n, pageCount) : 1;
  return {
    page,
    pageCount,
    total,
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
  };
}
