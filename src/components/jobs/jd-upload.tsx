"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { presignJdUpload, setJobJd, removeJobJd } from "@/lib/jobs/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function JdUpload({
  jobId,
  hasJd,
  canManage,
}: {
  jobId: string;
  hasJd: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function onFile(file: File) {
    startTransition(async () => {
      try {
        const p = await presignJdUpload(file.name, file.type || "application/pdf");
        if (p.error || !p.token || !p.path || !p.bucket || !p.fileKey) {
          throw new Error(p.error ?? "Lỗi tạo link tải JD");
        }
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.storage
          .from(p.bucket)
          .uploadToSignedUrl(p.path, p.token, file, {
            contentType: file.type || "application/pdf",
          });
        if (error) throw new Error("Tải JD thất bại: " + error.message);
        const res = await setJobJd(jobId, p.fileKey);
        if (res?.error) throw new Error(res.error);
        toast.success("Đã tải JD lên");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      {hasJd && (
        <Button variant="outline" size="sm" asChild>
          <a href={`/jobs/${jobId}/jd-file`} target="_blank" rel="noreferrer">
            <FileText className="size-4" /> JD đính kèm
          </a>
        </Button>
      )}
      {canManage && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp className="size-4" />
            {pending ? "Đang tải…" : hasJd ? "Đổi JD" : "Upload JD"}
          </Button>
          {hasJd && (
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label="Gỡ JD"
              onClick={() =>
                startTransition(async () => {
                  await removeJobJd(jobId);
                  toast.success("Đã gỡ JD");
                  router.refresh();
                })
              }
            >
              <X className="size-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
