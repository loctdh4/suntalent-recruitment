import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { JOB_PRIORITY_LABEL } from "@/lib/jobs/constants";

const STYLES: Record<string, string> = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  low: "bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400",
};

/** Hiện badge ưu tiên; mức "Trung bình" (normal) không hiển thị để gọn. */
export function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "normal") return null;
  return (
    <Badge variant="secondary" className={cn("border-transparent", STYLES[priority])}>
      {JOB_PRIORITY_LABEL[priority] ?? priority}
    </Badge>
  );
}
