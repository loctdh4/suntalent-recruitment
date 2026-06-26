"use client";

import { useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Briefcase, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Chọn ngành nghề từ danh mục (options truyền vào). Gửi qua input ẩn `name`. */
export function IndustrySelect({
  options,
  name,
  defaultValue,
  value: valueProp,
  onValueChange,
  placeholder = "Chọn ngành nghề…",
  id,
  className,
}: {
  options: string[];
  name?: string;
  defaultValue?: string | null;
  value?: string;
  onValueChange?: (v: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const value = controlled ? valueProp ?? "" : internal;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const kw = search.trim().toLowerCase();
  const filtered = options.filter((o) => o.toLowerCase().includes(kw));

  function pick(v: string) {
    if (controlled) onValueChange?.(v);
    else setInternal(v);
    setOpen(false);
    setSearch("");
  }

  return (
    <>
      {name && !controlled && <input type="hidden" name={name} value={internal} />}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <Button
            type="button"
            id={id}
            variant="outline"
            className={cn("w-full justify-between font-normal", className)}
          >
            <span
              className={cn(
                "flex items-center gap-2 truncate",
                !value && "text-muted-foreground",
              )}
            >
              <Briefcase className="size-4 shrink-0" />
              {value || placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 rounded-lg bg-popover p-0 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <div className="p-2">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm ngành nghề…"
              className="h-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {value && (
              <button
                type="button"
                onClick={() => pick("")}
                className="w-full rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
              >
                Bỏ chọn
              </button>
            )}
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => pick(o)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <Check
                  className={cn("size-4", value === o ? "opacity-100" : "opacity-0")}
                />
                {o}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">Không tìm thấy.</p>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>
    </>
  );
}
