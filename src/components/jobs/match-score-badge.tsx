import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function MatchScoreBadge({ score }: { score: number }) {
  const style =
    score >= 70
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
      : score >= 40
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
        : "bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300";
  return (
    <Badge variant="secondary" className={cn("border-transparent font-semibold", style)}>
      {score}%
    </Badge>
  );
}
