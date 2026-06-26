"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateJobPriority } from "@/lib/jobs/actions";
import { JOB_PRIORITY_OPTIONS } from "@/lib/jobs/constants";
import { PriorityBadge } from "./priority-badge";

const TRIGGER_STYLE: Record<string, string> = {
  high: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-400",
  normal: "",
  low: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-400",
};

export function JobPriorityControl({
  jobId,
  priority,
  canEdit,
}: {
  jobId: string;
  priority: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return <PriorityBadge priority={priority} />;
  }

  function change(value: string) {
    startTransition(async () => {
      const res = await updateJobPriority(jobId, value);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đã cập nhật mức ưu tiên");
        router.refresh();
      }
    });
  }

  return (
    <Select value={priority} onValueChange={change} disabled={pending}>
      <SelectTrigger className={cn("w-44 font-medium", TRIGGER_STYLE[priority])}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {JOB_PRIORITY_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
