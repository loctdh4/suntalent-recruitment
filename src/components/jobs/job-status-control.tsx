"use client";

import { useOptimistic, useTransition } from "react";
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
import { updateJobStatus } from "@/lib/jobs/actions";
import { JOB_STATUS_OPTIONS } from "@/lib/jobs/constants";
import { JobStatusBadge } from "./job-status-badge";

const TRIGGER_STYLE: Record<string, string> = {
  open: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400",
  on_hold: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400",
  closed: "border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-500/40 dark:bg-slate-500/20 dark:text-slate-300",
  filled: "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-400",
};

export function JobStatusControl({
  jobId,
  status,
  canEdit,
}: {
  jobId: string;
  status: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(status);

  if (!canEdit) {
    return <JobStatusBadge status={status} />;
  }

  function change(value: string) {
    startTransition(async () => {
      setOptimistic(value);
      const res = await updateJobStatus(jobId, value);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đã cập nhật trạng thái");
        router.refresh();
      }
    });
  }

  return (
    <Select value={optimistic} onValueChange={change} disabled={pending}>
      <SelectTrigger className={cn("w-40 font-medium", TRIGGER_STYLE[optimistic])}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {JOB_STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
