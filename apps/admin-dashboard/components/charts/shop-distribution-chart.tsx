"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export interface ShopDistributionPoint {
  shopName: string;
  present: number;
  late: number;
  absent: number;
}

export function ShopDistributionChart({ data }: { data: ShopDistributionPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" vertical={false} />
        <XAxis
          dataKey="shopName"
          tick={{ fontSize: 12, fill: "hsl(215 14% 45%)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 12, fill: "hsl(215 14% 45%)" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 20% 88%)", fontSize: 13 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="present" name="Présents" fill="hsl(172 66% 30%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="late" name="Retards" fill="hsl(38 85% 43%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="absent" name="Absents" fill="hsl(0 68% 45%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
