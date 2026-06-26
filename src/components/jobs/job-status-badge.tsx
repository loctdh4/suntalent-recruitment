import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { JOB_STATUS_OPTIONS } from "@/lib/jobs/constants";

const LABEL: Record<string, string> = Object.fromEntries(
  JOB_STATUS_OPTIONS.map((o) => [o.value, o.label]),
);

// Màu phân biệt theo trạng thái (shadcn Badge + override màu).
const STYLES: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  closed: "bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  filled: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
};

export function JobStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", STYLES[status])}>
      {LABEL[status] ?? status}
    </Badge>
  );
}
