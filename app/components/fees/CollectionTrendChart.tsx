"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR } from "@/lib/fees/calc";

type Point = { month: string; year: number; total: number };

/** Compact axis labels: 12,500 -> 12.5k, 3,20,000 -> 3.2L. */
function short(v: number): string {
  if (v >= 1_00_00_000) return `${(v / 1_00_00_000).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (v >= 1_00_000) return `${(v / 1_00_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(v);
}

/** Single-series monthly collection. One hue, no legend (the card title names it). */
export function CollectionTrendChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label={`Fee collection by month: ${data.map((d) => `${d.month} ₹${formatINR(d.total)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: "#e5e7eb" }} tick={{ fill: "#6b7280", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: "#6b7280", fontSize: 12 }} tickFormatter={short} />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Point;
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md">
                  <p className="text-xs text-gray-500">{p.month} {p.year}</p>
                  <p className="font-semibold tabular-nums text-gray-900">₹{formatINR(p.total)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
