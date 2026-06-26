"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Header bảng có thể sắp xếp; cycle: mặc định → desc → asc → mặc định. */
export function SortHeader({ label, sortKey }: { label: string; sortKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const active = sp.get("sort") === sortKey;
  const dir = active ? (sp.get("dir") ?? "desc") : null;

  function toggle() {
    const params = new URLSearchParams(sp.toString());
    if (!active) {
      params.set("sort", sortKey);
      params.set("dir", "desc");
    } else if (dir === "desc") {
      params.set("dir", "asc");
    } else {
      params.delete("sort");
      params.delete("dir");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {label}
      {!active ? (
        <ChevronsUpDown className="size-3.5 opacity-50" />
      ) : dir === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ArrowUp className="size-3.5" />
      )}
    </button>
  );
}
