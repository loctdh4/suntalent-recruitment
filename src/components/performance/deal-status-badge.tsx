import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DEAL_STATUS_LABEL, type DealStatus } from "@/lib/performance/deal";

const STYLE: Record<DealStatus, string> = {
  done: "bg-red-700 text-white dark:bg-red-800",
  warranty: "bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-50",
  running:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
};

export function DealStatusBadge({ status }: { status: DealStatus }) {
  return (
    <Badge className={cn("whitespace-nowrap", STYLE[status])}>
      {DEAL_STATUS_LABEL[status]}
    </Badge>
  );
}
