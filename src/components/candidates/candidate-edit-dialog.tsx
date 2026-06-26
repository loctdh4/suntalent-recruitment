"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LocationSelect } from "@/components/ui/location-select";
import { IndustrySelect } from "@/components/ui/industry-select";
import { TagsInput } from "@/components/ui/tags-input";
import { updateCandidate, type CandidateActionState } from "@/lib/candidates/actions";

export type CandidateEditValues = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  industry: string | null;
  desiredPosition: string | null;
  yearsExp: number | null;
  summary: string | null;
  skills: string[];
};

export function CandidateEditDialog({
  candidate,
  industries,
}: {
  candidate: CandidateEditValues;
  industries: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CandidateActionState, FormData>(
    updateCandidate,
    {},
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Đã cập nhật hồ sơ");
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-4" /> Sửa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form action={formAction}>
          <input type="hidden" name="id" value={candidate.id} />
          <DialogHeader>
            <DialogTitle>Sửa hồ sơ ứng viên</DialogTitle>
            <DialogDescription>Cập nhật thông tin hồ sơ ứng viên.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ tên *</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={candidate.fullName ?? ""}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input id="phone" name="phone" defaultValue={candidate.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={candidate.email ?? ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="desiredPosition">Vị trí mong muốn</Label>
                <Input
                  id="desiredPosition"
                  name="desiredPosition"
                  defaultValue={candidate.desiredPosition ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsExp">Số năm KN</Label>
                <Input
                  id="yearsExp"
                  name="yearsExp"
                  type="number"
                  min={0}
                  step="0.5"
                  defaultValue={candidate.yearsExp ?? ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="location">Địa điểm</Label>
                <LocationSelect
                  id="location"
                  name="location"
                  defaultValue={candidate.location}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Ngành nghề</Label>
                <IndustrySelect
                  id="industry"
                  name="industry"
                  options={industries}
                  defaultValue={candidate.industry}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills">Kỹ năng</Label>
              <TagsInput
                id="skills"
                name="skills"
                defaultValue={candidate.skills}
                placeholder="Nhập kỹ năng rồi nhấn Enter…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Tóm tắt</Label>
              <Textarea
                id="summary"
                name="summary"
                rows={3}
                defaultValue={candidate.summary ?? ""}
              />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu…" : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
