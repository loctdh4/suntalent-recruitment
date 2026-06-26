"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFiltersPending } from "@/components/filters-pending";

/** Lọc lịch PV theo ngày + tìm theo mã/ứng viên/vị trí. `today` = YYYY-MM-DD (giờ VN). */
export function InterviewFilters({ today }: { today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { pending, start } = useFiltersPending();
  const day = sp.get("day") ?? "";
  const [q, setQ] = useState(sp.get("q") ?? "");

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (!v) params.delete(k);
      else params.set(k, v);
    }
    start(() =>
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname),
    );
  }

  // Debounce ô tìm kiếm.
  useEffect(() => {
    if (q === (sp.get("q") ?? "")) return;
    const t = setTimeout(() => push({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        {pending ? (
          <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo mã (#00001), ứng viên, vị trí…"
          className="pl-9"
        />
      </div>
      <Button
        variant={day === today ? "default" : "outline"}
        size="sm"
        onClick={() => push({ day: today })}
      >
        Hôm nay
      </Button>
      <Input
        type="date"
        value={day}
        onChange={(e) => push({ day: e.target.value })}
        className="w-auto"
      />
      {(day || q) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            push({ day: "", q: "" });
          }}
        >
          Tất cả
        </Button>
      )}
    </div>
  );
}
