/**
 * Tạo (hoặc cập nhật) một tài khoản admin từ biến môi trường.
 * Chạy: `pnpm seed:admin` (đọc .env.local).
 * Idempotent — chạy lại sẽ cập nhật mật khẩu + đảm bảo role = admin.
 */
import { createClient } from "@supabase/supabase-js";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_NAME ?? "Administrator";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!email || !password) fail("Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong .env.local");
if (!url || !serviceKey) fail("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  let userId: string;

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    // Có thể user đã tồn tại → tìm lại và cập nhật mật khẩu.
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) fail(`Không liệt kê được user: ${listErr.message}`);
    const existing = list.users.find((u) => u.email === email);
    if (!existing) fail(`Tạo user thất bại: ${error.message}`);
    userId = existing!.id;
    await supabase.auth.admin.updateUserById(userId, { password });
    console.log(`• User đã tồn tại — đã cập nhật mật khẩu: ${email}`);
  } else {
    userId = created.user!.id;
    console.log(`• Đã tạo user: ${email}`);
  }

  // Đảm bảo có profile với role = admin (service role bỏ qua RLS).
  const { error: upErr } = await supabase
    .from("profiles")
    .upsert({ id: userId, email, full_name: fullName, role: "admin" });
  if (upErr) fail(`Không cập nhật được profile: ${upErr.message}`);

  console.log(`✓ Admin sẵn sàng: ${email} (role=admin)`);
  process.exit(0);
}

main();
