import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CANDIDATE_STATUS_LABEL } from "@/lib/candidates/constants";

const STYLES: Record<string, string> = {
  parsing: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  ready: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  error: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

export function CandidateStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent gap-1", STYLES[status])}>
      {status === "parsing" && <Loader2 className="size-3 animate-spin" />}
      {CANDIDATE_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
