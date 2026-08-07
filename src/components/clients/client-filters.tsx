"use client";

import { useEffect, useState } from "react";
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
import { useFiltersPending } from "@/components/filters-pending";
import { CLIENT_TYPE_OPTIONS } from "@/lib/clients/constants";

export function ClientFilters({
  owners,
}: {
  owners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { pending, start } = useFiltersPending();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const loc = sp.get("loc") ?? "";
  const type = sp.get("type") ?? "all";
  const owner = sp.get("owner") ?? "all";

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    // Đổi bộ lọc/sắp xếp → về trang 1, tránh đứng ở trang không còn dữ liệu.
    params.delete("page");
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:w-72">
        {pending ? (
          <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên, SĐT, email…"
          className="pl-9"
        />
      </div>
      <Select
        value={type}
        onValueChange={(v) => push({ type: v === "all" ? "" : v })}
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Loại" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả loại</SelectItem>
          {CLIENT_TYPE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={owner}
        onValueChange={(v) => push({ owner: v === "all" ? "" : v })}
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Người phụ trách" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Mọi người phụ trách</SelectItem>
          {owners.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <LocationSelect
        value={loc}
        onValueChange={(v) => push({ loc: v })}
        placeholder="Địa điểm"
        className="w-full sm:w-44"
      />
      {(q || loc || type !== "all" || owner !== "all") && (
        <Button
          variant="ghost"
          onClick={() => {
            setQ("");
            push({ q: "", loc: "", type: "", owner: "" });
          }}
          className="text-muted-foreground"
        >
          <X className="size-4" /> Xóa lọc
        </Button>
      )}
    </div>
  );
}
