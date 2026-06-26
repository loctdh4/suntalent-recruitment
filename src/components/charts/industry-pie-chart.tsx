"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

export type IndustrySlice = { name: string; value: number };

export function IndustryPieChart({ data }: { data: IndustrySlice[] }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (total === 0) {
    return <p className="py-6 text-sm text-muted-foreground">Chưa có dữ liệu ngành.</p>;
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-[190px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(value, name) => {
                const v = Number(value);
                return [`${v} (${Math.round((v / total) * 100)}%)`, String(name)];
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid w-full grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex min-w-0 items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="truncate">{d.name}</span>
            <span className="ml-auto shrink-0 text-muted-foreground">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
