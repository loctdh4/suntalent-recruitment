"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { deleteJob } from "@/lib/jobs/actions";

export function JobDeleteButton({
  jobId,
  jobTitle,
  candidateCount,
}: {
  jobId: string;
  jobTitle: string;
  /** Số ứng viên đang trong pipeline của vị trí — để cảnh báo mức thiệt hại. */
  candidateCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const res = await deleteJob(jobId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đã xóa vị trí");
        router.push("/jobs");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          <Trash2 className="size-4 text-destructive" /> Xóa
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa vị trí “{jobTitle}”?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Hành động không thể hoàn tác. Xóa vị trí sẽ xóa luôn:</p>
              <ul className="list-disc space-y-0.5 pl-5">
                <li>
                  Toàn bộ pipeline của vị trí
                  {candidateCount > 0 ? (
                    <>
                      {" — "}
                      <span className="font-medium text-destructive">
                        {candidateCount} ứng viên
                      </span>
                      , kèm lịch phỏng vấn và lý do loại
                    </>
                  ) : (
                    " (hiện chưa có ứng viên)"
                  )}
                </li>
                <li>Phân công recruiter và điểm match đã tính</li>
              </ul>
              <p>
                Hồ sơ ứng viên trong Talent Database vẫn được giữ. Nếu chỉ muốn
                dừng tuyển, hãy đổi trạng thái sang “Đã đóng” thay vì xóa.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={remove}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Xóa vị trí
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
