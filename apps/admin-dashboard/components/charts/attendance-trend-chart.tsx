"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export interface TrendPoint {
  date: string;
  onTime: number;
  late: number;
}

export function AttendanceTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="onTimeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(172 66% 30%)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(172 66% 30%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="lateGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(38 85% 43%)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(38 85% 43%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "hsl(215 14% 45%)" }}
          tickFormatter={(v) => v.slice(5)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 12, fill: "hsl(215 14% 45%)" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(214 20% 88%)",
            fontSize: 13,
          }}
        />
        <Area
          type="monotone"
          dataKey="onTime"
          name="À l'heure"
          stroke="hsl(172 66% 30%)"
          fill="url(#onTimeGradient)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="late"
          name="Retards"
          stroke="hsl(38 85% 43%)"
          fill="url(#lateGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
