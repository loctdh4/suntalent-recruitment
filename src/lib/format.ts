/**
 * Format ngày ổn định giữa server và client (tránh hydration mismatch).
 * Cố định locale + timezone nên kết quả giống nhau dù server chạy UTC.
 */
const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(d: Date | string | number): string {
  return dateFmt.format(new Date(d));
}

const dateTimeFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDateTime(d: Date | string | number): string {
  return dateTimeFmt.format(new Date(d));
}

const timeFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatTime(d: Date | string | number): string {
  return timeFmt.format(new Date(d));
}

/** Mã job hiển thị: 1 → "00001"; chưa có mã → "—". */
export function formatJobCode(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? "—" : String(n).padStart(5, "0");
}
