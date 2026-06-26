"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { reprocessCandidate, deleteCandidate } from "@/lib/candidates/actions";

export function CandidateActions({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function reprocess() {
    startTransition(async () => {
      const res = await reprocessCandidate(candidateId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đang xử lý lại CV…");
        router.refresh();
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteCandidate(candidateId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đã xóa ứng viên");
        router.push("/candidates");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={reprocess} disabled={pending}>
        <RefreshCw className="size-4" /> Xử lý lại
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={pending}>
            <Trash2 className="size-4 text-destructive" /> Xóa
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ứng viên?</AlertDialogTitle>
            <AlertDialogDescription>
              Hồ sơ và dữ liệu liên quan sẽ bị xóa. Hành động không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
