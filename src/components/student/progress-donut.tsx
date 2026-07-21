"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

// "Process vs Done" donut — recharts PieChart with inner radius (UI spec).
export function ProgressDonut({ done, total }: { done: number; total: number }) {
  const remaining = Math.max(total - done, 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const data =
    total === 0
      ? [{ name: "None", value: 1 }]
      : [
          { name: "Done", value: done },
          { name: "Remaining", value: remaining },
        ];

  const colors = total === 0 ? ["#fce7f3"] : ["#f97316", "#fce7f3"];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={65}
            outerRadius={90}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-slate-900">{pct}%</span>
        <span className="text-xs text-muted-foreground">
          {done} / {total} done
        </span>
      </div>
    </div>
  );
}
