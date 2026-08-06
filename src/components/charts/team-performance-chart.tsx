"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  apps: { label: "Vào pipeline", color: "var(--chart-1)" },
  hired: { label: "Nhận việc", color: "var(--chart-2)" },
} satisfies ChartConfig;

export type TeamPerfPoint = { name: string; apps: number; hired: number };

/** So sánh khối lượng pipeline & kết quả nhận việc giữa các thành viên. */
export function TeamPerformanceChart({ data }: { data: TeamPerfPoint[] }) {
  if (data.length === 0 || data.every((d) => d.apps === 0 && d.hired === 0)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Chưa có dữ liệu trong kỳ này.
      </p>
    );
  }
  return (
    <ChartContainer
      config={config}
      className="w-full"
      style={{ height: Math.max(200, data.length * 42 + 40) }}
    >
      <BarChart data={data} layout="vertical" barGap={4} margin={{ left: 4, right: 12 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="apps" fill="var(--color-apps)" radius={[0, 4, 4, 0]} />
        <Bar dataKey="hired" fill="var(--color-hired)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
