import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client dùng service_role key — CHỈ chạy ở server.
 * Bỏ qua RLS, dùng cho thao tác storage/admin từ tầng server.
 * Tuyệt đối không import vào Client Component.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
