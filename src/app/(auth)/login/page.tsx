"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Search, Target, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type AuthState } from "@/lib/auth/actions";

const features = [
  { icon: UsersRound, title: "Quản lý ứng viên", desc: "Hồ sơ, lịch sử ứng tuyển và pipeline ở một nơi." },
  { icon: Search, title: "Khai thác lại nguồn cũ", desc: "Tìm ứng viên phù hợp ngay khi có vị trí mới." },
  { icon: Target, title: "Gợi ý độ phù hợp", desc: "Chỉ rõ kỹ năng đáp ứng và còn thiếu để quyết định nhanh." },
];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signIn,
    undefined,
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel thương hiệu */}
      <div className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(80% 80% at 100% 0%, oklch(0.74 0.13 188 / 0.7), transparent 60%), radial-gradient(70% 70% at 0% 100%, oklch(0.62 0.19 292 / 0.5), transparent 60%)",
          }}
        />
        <div className="relative flex items-center">
          <span className="flex items-center justify-center rounded-2xl bg-white p-2.5">
            <Image
              src="/logo.png"
              alt="SunTalent"
              width={160}
              height={160}
              priority
              className="h-16 w-auto"
            />
          </span>
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight">
              Quản lý &amp; khai thác nguồn ứng viên
            </h1>
            <p className="max-w-md text-primary-foreground/80">
              Quản lý toàn bộ quy trình tuyển dụng và tìm đúng ứng viên từ chính dữ
              liệu bạn đã có — thay vì tìm lại từ đầu.
            </p>
          </div>
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="size-4" />
                </span>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-primary-foreground/75">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} SunTalent
        </p>
      </div>

      {/* Form đăng nhập */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Image
              src="/logo.png"
              alt="SunTalent"
              width={160}
              height={160}
              priority
              className="h-14 w-auto"
            />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Đăng nhập</h2>
            <p className="text-sm text-muted-foreground">
              Nhập thông tin tài khoản để tiếp tục.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ban@congty.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {state?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Tài khoản do quản trị viên cấp. Liên hệ admin nếu cần truy cập.
          </p>
        </div>
      </div>
    </div>
  );
}
