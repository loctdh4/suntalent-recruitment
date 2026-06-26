import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  /** % thay đổi; dương = tăng, âm = giảm. */
  trend?: number;
  hint?: string;
}

export function StatCard({ label, value, trend, hint }: StatCardProps) {
  const up = (trend ?? 0) >= 0;
  return (
    <Card className="gap-0 shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        {trend !== undefined && (
          <div
            className={cn(
              "mt-3 inline-flex items-center gap-1 text-sm font-medium",
              up ? "text-emerald-600" : "text-rose-500",
            )}
          >
            {up ? (
              <ArrowUpRight className="size-4" />
            ) : (
              <ArrowDownRight className="size-4" />
            )}
            {Math.abs(trend)}%
            {hint && <span className="ml-1 text-muted-foreground">{hint}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
