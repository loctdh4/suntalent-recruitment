import { cn } from "@/lib/utils";

/** Thanh điểm hiệu suất 0–100 (xanh ≥70, hổ phách ≥40, xám dưới đó). */
export function ScoreBar({ score }: { score: number }) {
  const tone =
    score >= 70
      ? "bg-emerald-500"
      : score >= 40
        ? "bg-amber-500"
        : "bg-muted-foreground/40";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 shrink-0 rounded-full bg-muted">
        <div
          className={cn("h-2 rounded-full", tone)}
          style={{ width: `${Math.min(100, Math.max(2, score))}%` }}
        />
      </div>
      <span className="w-7 shrink-0 text-right text-sm font-semibold tabular-nums">
        {score}
      </span>
    </div>
  );
}
