"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_OPTIONS, currentVnMonth } from "@/lib/performance/constants";

/** Chọn kỳ đánh giá theo tháng + năm (searchParams `month`, `year`). */
export function PeriodFilter({
  month,
  year,
  years,
}: {
  /** `null` = cả năm. */
  month: number | null;
  year: number;
  years: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  function push(nextMonth: string, nextYear: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("month", nextMonth);
    params.set("year", String(nextYear));
    start(() => router.replace(`${pathname}?${params.toString()}`));
  }

  // Lùi/tiến 1 tháng (chỉ khi đang xem theo tháng), tự nhảy năm khi qua ranh giới.
  function shift(delta: number) {
    if (month == null) {
      push("all", year + delta);
      return;
    }
    const m = month + delta;
    if (m < 1) push("12", year - 1);
    else if (m > 12) push("1", year + 1);
    else push(String(m), year);
  }

  const now = currentVnMonth();
  const atLatest =
    month == null
      ? year >= now.year
      : year > now.year || (year === now.year && month >= now.month);
  const yearOptions = years.includes(year) ? years : [year, ...years];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      <Button
        variant="outline"
        size="icon"
        aria-label="Kỳ trước"
        onClick={() => shift(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Select
        value={month == null ? "all" : String(month)}
        onValueChange={(v) => push(v, year)}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(year)}
        onValueChange={(v) => push(month == null ? "all" : String(month), Number(v))}
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        aria-label="Kỳ sau"
        disabled={atLatest}
        onClick={() => shift(1)}
      >
        <ChevronRight className="size-4" />
      </Button>
      {!atLatest && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => push(String(now.month), now.year)}
        >
          Tháng này
        </Button>
      )}
    </div>
  );
}
