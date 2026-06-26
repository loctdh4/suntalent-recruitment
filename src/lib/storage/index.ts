/**
 * Lớp storage trừu tượng cho file CV.
 * Hiện dùng **Supabase Storage** (trước mắt, đã có sẵn Supabase).
 * Khi cần mở rộng dung lượng → đổi sang Cloudflare R2: chỉ việc thay các hàm
 * dưới đây bằng bản trong `./r2.ts` (cùng signature), không phải sửa call site.
 */
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? "cvs";

/**
 * Tạo storage key an toàn từ tên file người dùng tải lên.
 * Bỏ dấu tiếng Việt (NFD), đổi đ/Đ, thay dấu cách & ký tự lạ bằng "-", giữ phần đuôi.
 * UUID phía trước đảm bảo không trùng; phần tên chỉ để dễ nhận diện.
 * Tránh lỗi lệch chữ ký signed-upload của Supabase khi key có ký tự Unicode/space.
 */
export function buildFileKey(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const ext =
    dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base =
    (dot > 0 ? fileName.slice(0, dot) : fileName)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "cv";
  const name = ext ? `${base}.${ext}` : base;
  return `${crypto.randomUUID()}-${name}`;
}

/** Tạo signed upload URL (token/path) để client upload file CV thẳng lên storage. */
export async function presignUpload(
  key: string,
  _contentType: string,
): Promise<{
  uploadUrl: string;
  key: string;
  token: string;
  path: string;
  bucket: string;
}> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(key);
  if (error || !data) throw error ?? new Error("Không tạo được signed upload URL");
  return {
    uploadUrl: data.signedUrl,
    key,
    token: data.token,
    path: data.path,
    bucket: STORAGE_BUCKET,
  };
}

/** URL tải file CV gốc (cho recruiter xem lại). */
export async function presignDownload(key: string, expiresIn = 600): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(key, expiresIn);
  if (error || !data) throw error ?? new Error("Không tạo được signed download URL");
  return data.signedUrl;
}

/** Tải nội dung file (dùng trong job parse nền). */
export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(key);
  if (error || !data) throw error ?? new Error(`Không đọc được file: ${key}`);
  return new Uint8Array(await data.arrayBuffer());
}
