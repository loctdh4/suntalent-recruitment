"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationSelect } from "@/components/ui/location-select";
import { IndustrySelect } from "@/components/ui/industry-select";
import { MatchScoreBadge } from "@/components/jobs/match-score-badge";
import { AddToJobButton } from "@/components/jobs/add-to-job-button";
import { addCandidateToJob } from "@/lib/applications/actions";
import { createCandidateForJob } from "@/lib/candidates/actions";
import { uploadCvAttachment } from "@/components/candidates/candidate-manual-dialog";

type Option = { id: string; fullName: string | null; email: string | null };

export type MatchSuggestion = {
  candidateId: string;
  name: string;
  score: number;
  matchedSkills: string[];
  inPipeline: boolean;
};

export function AddCandidateDialog({
  jobId,
  available,
  matches = [],
  industries = [],
  defaultIndustry = null,
}: {
  jobId: string;
  available: Option[];
  matches?: MatchSuggestion[];
  industries?: string[];
  defaultIndustry?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();

  function done(msg: string) {
    toast.success(msg);
    setOpen(false);
    setSelected("");
    setCvFile(null);
    router.refresh();
  }

  function addExisting() {
    if (!selected) return;
    startTransition(async () => {
      const res = await addCandidateToJob(jobId, selected);
      if (res?.error) toast.error(res.error);
      else done("Đã thêm ứng viên vào vị trí");
    });
  }

  function submitNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("jobId", jobId);
    startTransition(async () => {
      setError(undefined);
      try {
        if (cvFile) formData.set("cvFileKey", await uploadCvAttachment(cvFile));
        const res = await createCandidateForJob({}, formData);
        if (res?.error) setError(res.error);
        else done("Đã tạo & thêm ứng viên vào vị trí");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="size-4" /> Thêm ứng viên
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm ứng viên vào vị trí</DialogTitle>
          <DialogDescription>
            Chọn ứng viên có sẵn hoặc tạo ứng viên mới (đính kèm CV tùy chọn).
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Chọn có sẵn</TabsTrigger>
            <TabsTrigger value="new">Tạo mới</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 pt-4">
            {matches.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Gợi ý phù hợp (≥ 80%)</p>
                <div className="space-y-2">
                  {matches.map((m) => (
                    <div
                      key={m.candidateId}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <MatchScoreBadge score={m.score} />
                          <Link
                            href={`/candidates/${m.candidateId}`}
                            className="truncate font-medium hover:underline"
                          >
                            {m.name}
                          </Link>
                        </div>
                        {m.matchedSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {m.matchedSkills.slice(0, 6).map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <AddToJobButton
                        jobId={jobId}
                        candidateId={m.candidateId}
                        added={m.inPipeline}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {available.length === 0 ? (
              matches.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Không còn ứng viên rảnh (mỗi ứng viên chỉ ở 1 vị trí).
                </p>
              )
            ) : (
              <div className="space-y-2">
                {matches.length > 0 && (
                  <p className="text-sm font-medium">Hoặc chọn ứng viên khác</p>
                )}
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ứng viên" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fullName ?? c.email ?? "Ứng viên"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DialogFooter>
                  <Button onClick={addExisting} disabled={pending || !selected}>
                    {pending ? "Đang thêm…" : "Thêm vào vị trí"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="pt-4">
            <form onSubmit={submitNew} className="space-y-4">
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
                  <Input id="desiredPosition" name="desiredPosition" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Địa điểm</Label>
                  <LocationSelect id="location" name="location" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Ngành nghề</Label>
                <IndustrySelect
                  id="industry"
                  name="industry"
                  options={industries}
                  defaultValue={defaultIndustry}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Kỹ năng / chứng chỉ</Label>
                <Input id="skills" name="skills" placeholder="phân cách bằng dấu phẩy" />
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
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Đang tạo…" : "Tạo & thêm vào vị trí"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
