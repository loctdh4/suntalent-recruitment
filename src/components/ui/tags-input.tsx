"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Ô nhập danh sách (chip/tag): gõ từng mục rồi Enter để thêm.
 * Gửi đi qua input ẩn `name`, các mục nối bằng dấu phẩy (server tự tách).
 */
export function TagsInput({
  name,
  defaultValue = [],
  placeholder,
  id,
}: {
  name: string;
  defaultValue?: string[];
  placeholder?: string;
  id?: string;
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const v = raw.trim().replace(/,+$/, "").trim();
    if (!v) return;
    if (!tags.some((t) => t.toLowerCase() === v.toLowerCase())) {
      setTags((prev) => [...prev, v]);
    }
    setInput("");
  }

  function removeTag(index: number) {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <input type="hidden" name={name} value={tags.join(",")} />
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        )}
      >
        {tags.map((t, i) => (
          <Badge key={`${t}-${i}`} variant="secondary" className="gap-1 pr-1">
            {t}
            <button
              type="button"
              aria-label={`Xóa ${t}`}
              onClick={() => removeTag(i)}
              className="rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          id={id}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(input);
            } else if (e.key === "Backspace" && !input && tags.length) {
              removeTag(tags.length - 1);
            }
          }}
          onBlur={() => addTag(input)}
          placeholder={tags.length ? "" : placeholder}
          className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
