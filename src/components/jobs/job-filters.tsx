"use client";

import { useEffect, useOptimistic, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2, Search, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { LocationSelect } from "@/components/ui/location-select";
import { IndustrySelect } from "@/components/ui/industry-select";
import { useFiltersPending } from "@/components/filters-pending";
import { JOB_STATUS_OPTIONS, JOB_PRIORITY_OPTIONS } from "@/lib/jobs/constants";

type Person = { id: string; name: string };

function fmt(d: string) {
  return d ? Number(d).toLocaleString("vi-VN") : "";
}

export function JobFilters({
  clients,
  sales,
  hrs,
  industries,
  showContract = false,
  hideSale = false,
  hideHr = false,
}: {
  clients: Person[];
  sales: Person[];
  hrs: Person[];
  industries: string[];
  showContract?: boolean;
  hideSale?: boolean;
  hideHr?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { pending, start } = useFiltersPending();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [contractOpen, setContractOpen] = useState(false);
  const [cmin, setCmin] = useState(sp.get("cmin") ?? "");
  const [cmax, setCmax] = useState(sp.get("cmax") ?? "");

  // Phản chiếu lựa chọn ngay lập tức (không chờ điều hướng + query server xong).
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

  // Có bộ lọc nào đang áp dụng không (trừ sort/dir mặc định).
  const FILTER_KEYS = ["q", "status", "priority", "client", "loc", "ind", "sale", "hr", "alert", "cmin", "cmax"];
  const hasFilters = FILTER_KEYS.some((k) => optimistic[k]);

  function clearAll() {
    setQ("");
    setCmin("");
    setCmax("");
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

  // Debounce ô tìm kiếm.
  useEffect(() => {
    if (q === (sp.get("q") ?? "")) return;
    const t = setTimeout(() => pushParams({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const contractActive = Boolean(sp.get("cmin") || sp.get("cmax"));
  const contractLabel = contractActive
    ? `${fmt(sp.get("cmin") ?? "") || "0"} – ${fmt(sp.get("cmax") ?? "") || "∞"}`
    : "Giá hợp đồng";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:w-64">
        {pending ? (
          <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo mã (#00001), vị trí, khách hàng…"
          className="pl-9"
        />
      </div>

      <Select value={get("status") || "all"} onValueChange={(v) => pushParams({ status: v })}>
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          {JOB_STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={get("priority") || "all"} onValueChange={(v) => pushParams({ priority: v })}>
        <SelectTrigger className="sm:w-36">
          <SelectValue placeholder="Ưu tiên" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Mọi ưu tiên</SelectItem>
          {JOB_PRIORITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
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

      <Select value={get("client") || "all"} onValueChange={(v) => pushParams({ client: v })}>
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Khách hàng" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả khách hàng</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!hideSale && (
        <Select value={get("sale") || "all"} onValueChange={(v) => pushParams({ sale: v })}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Sale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả Sale</SelectItem>
            {sales.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!hideHr && (
        <Select value={get("hr") || "all"} onValueChange={(v) => pushParams({ hr: v })}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="HR" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả HR</SelectItem>
            {hrs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        variant={get("alert") ? "secondary" : "outline"}
        className={
          get("alert")
            ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400"
            : ""
        }
        onClick={() => pushParams({ alert: get("alert") ? "" : "1" })}
      >
        <AlertTriangle className="size-4" /> Cần chú ý
      </Button>

      {hasFilters && (
        <Button variant="ghost" onClick={clearAll} className="text-muted-foreground">
          <X className="size-4" /> Xóa lọc
        </Button>
      )}

      {showContract && (
        <Popover open={contractOpen} onOpenChange={setContractOpen}>
          <PopoverTrigger asChild>
            <Button variant={contractActive ? "secondary" : "outline"} className="justify-start sm:w-auto">
              <Wallet className="size-4" /> {contractLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3">
            <p className="text-sm font-medium">Khoảng giá hợp đồng (VND)</p>
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Từ</Label>
                <MoneyInput value={cmin} onValueChange={setCmin} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Đến</Label>
                <MoneyInput value={cmax} onValueChange={setCmax} placeholder="∞" />
              </div>
            </div>
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCmin("");
                  setCmax("");
                  pushParams({ cmin: "", cmax: "" });
                  setContractOpen(false);
                }}
              >
                Xóa
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  pushParams({ cmin, cmax });
                  setContractOpen(false);
                }}
              >
                Áp dụng
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
