import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STAGE_LABEL } from "@/lib/applications/constants";

const STYLES: Record<string, string> = {
  new: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  screening: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  client_iv: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  hired: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", STYLES[stage])}>
      {STAGE_LABEL[stage] ?? stage}
    </Badge>
  );
}
