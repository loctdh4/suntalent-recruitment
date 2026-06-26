import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Badge "Cần chú ý" — hover xem lý do (native title). */
export function JobAlertBadge({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <Badge
      variant="secondary"
      title={reasons.join("; ")}
      className="gap-1 border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400"
    >
      <AlertTriangle className="size-3.5" /> Cần chú ý
    </Badge>
  );
}
