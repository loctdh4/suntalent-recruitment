"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { presignJdUpload } from "@/lib/jobs/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Trường upload JD trong form tạo/sửa job.
 * Upload ngay khi chọn file → lưu key vào input ẩn `jdUrl` để action ghi nhận.
 */
export function JdField({
  defaultValue = null,
  jobId,
}: {
  defaultValue?: string | null;
  jobId?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Chỉ xem được file đã lưu (key cũ của job đang sửa).
  const canView = !!jobId && value === (defaultValue ?? "");

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
        setValue(p.fileKey);
        toast.success("Đã tải JD lên");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <div>
      <input type="hidden" name="jdUrl" value={value} />
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

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
          {canView ? (
            <a
              href={`/jobs/${jobId}/jd-file`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileText className="size-4" /> JD đã đính kèm
            </a>
          ) : (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4" /> Đã chọn file JD
            </span>
          )}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              Đổi
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Gỡ JD"
              onClick={() => setValue("")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition",
            dragOver ? "border-primary bg-primary/5" : "hover:bg-muted/50",
          )}
        >
          {pending ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <UploadCloud className="size-5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {pending ? "Đang tải…" : "Kéo thả file JD vào đây hoặc bấm để chọn"}
          </span>
          <span className="text-xs text-muted-foreground">PDF, DOC, DOCX</span>
        </button>
      )}
    </div>
  );
}
