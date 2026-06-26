"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Sparkles, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { requestCvUpload, confirmCvUpload } from "@/lib/candidates/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ACCEPT = /\.(pdf|docx?)$/i;

export function CvUploadButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => ACCEPT.test(f.name));
    if (arr.length === 0) toast.error("Chỉ hỗ trợ PDF, DOC, DOCX");
    setFiles((prev) => [...prev, ...arr]);
  }

  async function analyze() {
    if (!files.length) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    let ok = 0;
    for (const file of files) {
      try {
        const init = await requestCvUpload({
          fileName: file.name,
          contentType: file.type || "application/pdf",
        });
        const { error } = await supabase.storage
          .from(init.bucket)
          .uploadToSignedUrl(init.path, init.token, file, {
            contentType: file.type || "application/pdf",
          });
        if (error) throw new Error(error.message);
        await confirmCvUpload(init.candidateId, init.fileKey);
        ok++;
      } catch {
        toast.error(`Lỗi: ${file.name}`);
      }
    }
    setBusy(false);
    if (ok > 0) {
      toast.success(`Đã gửi ${ok} CV để phân tích`);
      setFiles([]);
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setFiles([]);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="size-4" /> Phân tích AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Phân tích CV bằng AI</DialogTitle>
          <DialogDescription>
            Kéo-thả hoặc chọn file CV — hệ thống tự trích xuất thông tin ứng viên.
          </DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition",
            dragOver ? "border-primary bg-primary/5" : "hover:bg-muted/50",
          )}
        >
          <UploadCloud className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Kéo-thả CV vào đây hoặc bấm để chọn</p>
          <p className="text-xs text-muted-foreground">PDF, DOC, DOCX · nhiều file</p>
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  disabled={busy}
                  aria-label="Bỏ"
                  className="rounded p-0.5 hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button onClick={analyze} disabled={busy || files.length === 0}>
            {busy
              ? "Đang phân tích…"
              : `Phân tích${files.length ? ` (${files.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
