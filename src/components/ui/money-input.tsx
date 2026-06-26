"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

function toDigits(s: string): string {
  return s.replace(/[^\d]/g, "");
}
function format(digits: string): string {
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
}

/**
 * Ô nhập số tiền có dấu phân cách hàng nghìn (vd 30.000.000).
 * - Form (uncontrolled): truyền `name` + `defaultValue`. Giá trị gửi đi là chuỗi có dấu
 *   chấm — server đã strip ký tự không phải số nên vẫn parse đúng.
 * - Controlled: truyền `value` (chuỗi số thuần) + `onValueChange`.
 */
export function MoneyInput({
  name,
  defaultValue,
  value,
  onValueChange,
  id,
  placeholder,
  className,
}: {
  name?: string;
  defaultValue?: number | null;
  value?: string;
  onValueChange?: (raw: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(
    defaultValue != null ? String(defaultValue) : "",
  );
  const raw = controlled ? (value ?? "") : internal;

  return (
    <Input
      id={id}
      name={name}
      placeholder={placeholder}
      className={className}
      inputMode="numeric"
      value={format(raw)}
      onChange={(e) => {
        const d = toDigits(e.target.value);
        if (controlled) onValueChange?.(d);
        else setInternal(d);
      }}
    />
  );
}
