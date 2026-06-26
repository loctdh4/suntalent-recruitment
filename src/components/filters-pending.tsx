"use client";

import { createContext, useContext, useTransition } from "react";

type Ctx = {
  pending: boolean;
  start: (fn: () => void) => void;
};

const FiltersPendingContext = createContext<Ctx | null>(null);

/** Chia sẻ trạng thái đang điều hướng giữa bộ lọc và vùng kết quả. */
export function FiltersPendingProvider({ children }: { children: React.ReactNode }) {
  const [pending, startTransition] = useTransition();
  return (
    <FiltersPendingContext.Provider
      value={{ pending, start: (fn) => startTransition(fn) }}
    >
      {children}
    </FiltersPendingContext.Provider>
  );
}

export function useFiltersPending() {
  const ctx = useContext(FiltersPendingContext);
  if (!ctx) throw new Error("useFiltersPending phải nằm trong FiltersPendingProvider");
  return ctx;
}

/** Bọc vùng kết quả: khi đang lọc → hiện `fallback` (skeleton) ngay, ẩn nội dung cũ. */
export function PendingArea({
  fallback,
  children,
}: {
  fallback: React.ReactNode;
  children: React.ReactNode;
}) {
  const { pending } = useFiltersPending();
  return <>{pending ? fallback : children}</>;
}
