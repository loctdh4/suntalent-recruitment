"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationSelect } from "@/components/ui/location-select";
import { IndustrySelect } from "@/components/ui/industry-select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCandidateManual, presignCvUpload } from "@/lib/candidates/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Upload CV (nếu có) → trả fileKey để đính kèm. */
export async function uploadCvAttachment(file: File): Promise<string> {
  const p = await presignCvUpload(file.name, file.type || "application/pdf");
  if (p.error || !p.token || !p.path || !p.bucket || !p.fileKey) {
    throw new Error(p.error ?? "Lỗi tải CV");
  }
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage
    .from(p.bucket)
    .uploadToSignedUrl(p.path, p.token, file, {
      contentType: file.type || "application/pdf",
    });
  if (error) throw new Error("Tải CV thất bại: " + error.message);
  return p.fileKey;
}

export function CandidateManualDialog({ industries }: { industries: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [cvFile, setCvFile] = useState<File | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(undefined);
      try {
        if (cvFile) formData.set("cvFileKey", await uploadCvAttachment(cvFile));
        const res = await createCandidateManual({}, formData);
        if (res?.error) setError(res.error);
        else {
          toast.success("Đã thêm ứng viên");
          setOpen(false);
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="size-4" /> Thêm ứng viên
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Thêm ứng viên (không cần CV)</DialogTitle>
            <DialogDescription>
              Nhập tay thông tin; có thể đính kèm CV (tùy chọn).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ tên *</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="desiredPosition">Vị trí mong muốn</Label>
                <Input id="desiredPosition" name="desiredPosition" placeholder="VD: Phục vụ" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Địa điểm</Label>
                <LocationSelect id="location" name="location" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Ngành nghề</Label>
              <IndustrySelect id="industry" name="industry" options={industries} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="yearsExp">Số năm KN</Label>
                <Input id="yearsExp" name="yearsExp" inputMode="numeric" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills">Kỹ năng / chứng chỉ</Label>
              <Input id="skills" name="skills" placeholder="Bằng lái B2, An toàn lao động…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv">Đính kèm CV (tùy chọn)</Label>
              <Input
                id="cv"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu…" : "Thêm ứng viên"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
