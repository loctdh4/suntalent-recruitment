import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton bảng dùng chung khi đang lọc/tìm kiếm. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center gap-4 border-b pb-3">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className={i === 0 ? "h-4 flex-1" : "h-4 w-24"} />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-4 py-2">
              {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} className={i === 0 ? "h-5 flex-1" : "h-4 w-24"} />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
