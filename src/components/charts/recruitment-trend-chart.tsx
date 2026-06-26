"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  applied: { label: "Ứng tuyển", color: "var(--chart-1)" },
  hired: { label: "Nhận việc", color: "var(--chart-2)" },
} satisfies ChartConfig;

export type TrendPoint = { month: string; applied: number; hired: number };

export function RecruitmentTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart data={data} barGap={6}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="applied" fill="var(--color-applied)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="hired" fill="var(--color-hired)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
