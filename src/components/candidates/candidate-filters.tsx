"use client";

import { useEffect, useOptimistic, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationSelect } from "@/components/ui/location-select";
import { IndustrySelect } from "@/components/ui/industry-select";
import { useFiltersPending } from "@/components/filters-pending";
import { PIPELINE_STAGES } from "@/lib/applications/constants";

const FILTER_KEYS = ["q", "stage", "loc", "ind"];

export function CandidateFilters({ industries }: { industries: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { pending, start } = useFiltersPending();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [optimistic, setOptimistic] = useOptimistic<Record<string, string>>(
    Object.fromEntries(sp.entries()),
  );
  const get = (key: string) => optimistic[key] ?? "";

  function pushParams(updates: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    // Đổi bộ lọc/sắp xếp → về trang 1, tránh đứng ở trang không còn dữ liệu.
    params.delete("page");
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    start(() => {
      setOptimistic((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(updates)) {
          if (!value || value === "all") delete next[key];
          else next[key] = value;
        }
        return next;
      });
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  // Debounce ô tìm kiếm.
  useEffect(() => {
    if (q === (sp.get("q") ?? "")) return;
    const t = setTimeout(() => pushParams({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = Boolean(q || get("stage") || get("loc") || get("ind"));

  function clearAll() {
    setQ("");
    start(() => {
      setOptimistic((prev) => {
        const next = { ...prev };
        for (const k of FILTER_KEYS) delete next[k];
        return next;
      });
      const params = new URLSearchParams(sp.toString());
      for (const k of FILTER_KEYS) params.delete(k);
      params.delete("page");
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:w-64">
        {pending ? (
          <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên, email, SĐT, vị trí…"
          className="pl-9"
        />
      </div>

      <Select value={get("stage") || "all"} onValueChange={(v) => pushParams({ stage: v })}>
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          {/* Chưa có hồ sơ ứng tuyển nào — nguồn ứng viên còn trống để phân bổ. */}
          <SelectItem value="none">Chưa ứng tuyển</SelectItem>
          {PIPELINE_STAGES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <LocationSelect
        value={get("loc")}
        onValueChange={(v) => pushParams({ loc: v })}
        placeholder="Địa điểm"
        className="w-full sm:w-44"
      />

      <IndustrySelect
        options={industries}
        value={get("ind")}
        onValueChange={(v) => pushParams({ ind: v })}
        placeholder="Ngành nghề"
        className="w-full sm:w-48"
      />

      {hasFilters && (
        <Button variant="ghost" onClick={clearAll} className="text-muted-foreground">
          <X className="size-4" /> Xóa lọc
        </Button>
      )}
    </div>
  );
}
