"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageInfo } from "@/lib/pagination";
import { cn } from "@/lib/utils";

/** Dãy số trang rút gọn quanh trang hiện tại: 1 … 4 5 [6] 7 8 … 20 */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items = new Set<number>([1, pageCount, page]);
  for (const d of [-2, -1, 1, 2]) {
    const p = page + d;
    if (p > 1 && p < pageCount) items.add(p);
  }
  const sorted = [...items].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("gap");
    out.push(sorted[i]);
  }
  return out;
}

/** Thanh phân trang; ẩn khi chỉ có 1 trang. Đổi searchParam `page`. */
export function Pagination({ info, label = "dòng" }: { info: PageInfo; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const { page, pageCount, total, offset, limit } = info;

  function go(p: number) {
    const params = new URLSearchParams(sp.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    start(() =>
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname),
    );
  }

  if (total === 0) return null;

  const from = offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {pending && <Loader2 className="mr-1 inline size-3.5 animate-spin" />}
        Hiển thị <b className="text-foreground">{from}</b>–
        <b className="text-foreground">{to}</b> trong{" "}
        <b className="text-foreground">{total}</b> {label}
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Trang trước"
            disabled={page <= 1}
            onClick={() => go(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          {pageItems(page, pageCount).map((it, i) =>
            it === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={it}
                variant={it === page ? "default" : "outline"}
                size="icon"
                aria-current={it === page ? "page" : undefined}
                className={cn(it === page && "pointer-events-none")}
                onClick={() => go(it)}
              >
                {it}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label="Trang sau"
            disabled={page >= pageCount}
            onClick={() => go(page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
