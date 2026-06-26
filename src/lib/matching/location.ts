/** Chuẩn hóa địa điểm (text tự do) về key thành phố để so khớp. */

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

// alias (đã bỏ dấu) → key thành phố chuẩn
const CITY_ALIASES: [string, string][] = [
  ["ho chi minh", "hcm"],
  ["hochiminh", "hcm"],
  ["tphcm", "hcm"],
  ["tp hcm", "hcm"],
  ["tp.hcm", "hcm"],
  ["sai gon", "hcm"],
  ["saigon", "hcm"],
  ["hcmc", "hcm"],
  ["ha noi", "hanoi"],
  ["hanoi", "hanoi"],
  ["da nang", "danang"],
  ["danang", "danang"],
  ["can tho", "cantho"],
  ["hai phong", "haiphong"],
  ["binh duong", "binhduong"],
  ["dong nai", "dongnai"],
  ["nha trang", "nhatrang"],
  ["hue", "hue"],
];

/** Trả về key thành phố chuẩn, hoặc null nếu không nhận diện được. */
export function canonicalCity(input?: string | null): string | null {
  if (!input) return null;
  const s = normalize(input);
  for (const [alias, canon] of CITY_ALIASES) {
    if (s.includes(alias)) return canon;
  }
  return null;
}
