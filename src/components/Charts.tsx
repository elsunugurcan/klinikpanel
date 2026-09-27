"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtMoney } from "@/lib/money";
import { fmtDateShort } from "@/lib/time";

const INK = "#0b0b0b", MUTED = "#898781", GRID = "#e1e0d9";
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a"]; // doğrulanmış kategorik palet (sıra sabit)

const TooltipBox = ({ active, payload, label, money = true }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string; money?: boolean }) => {
  if (!active || !payload?.length) return null;
  return <div className="rounded-lg border border-ink/10 bg-surface px-3 py-2 text-xs shadow-card"><div className="font-semibold">{label}</div>{payload.map((p, i) => <div key={i} className="text-ink2">{money ? fmtMoney(p.value) : p.value}</div>)}</div>;
};

/** Tek seri alan grafiği: günlük ciro. 2px çizgi, %10 dolgu, ince ızgara. */
export function RevenueArea({ data }: { data: { date: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
        <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} minTickGap={28} />
        <YAxis tickFormatter={(v) => `${Math.round(v / 100000)}k`} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<TooltipBox />} labelFormatter={(l) => fmtDateShort(String(l))} cursor={{ stroke: MUTED, strokeWidth: 1 }} />
        <Area type="monotone" dataKey="amount" stroke={SERIES[0]} strokeWidth={2} fill={SERIES[0]} fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: "#fcfcfb", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Yatay çubuk: kategori başına tutar (tek renk; ≤24px kalınlık, uçları yuvarlak). */
export function CategoryBars({ data, money = true, color = SERIES[0], height }: { data: { key: string; value: number }[]; money?: boolean; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(120, data.length * 34 + 16)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="key" width={150} tick={{ fontSize: 12, fill: INK }} axisLine={false} tickLine={false} />
        <Tooltip content={<TooltipBox money={money} />} cursor={{ fill: "rgba(11,11,11,.04)" }} />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: "right", fontSize: 11, fill: "#52514e", formatter: (v: unknown) => (money ? fmtMoney(Number(v)) : String(v)) }}>
          {data.map((_, i) => <Cell key={i} fill={color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Dikey çubuklar: haftalık randevu sayısı gibi kısa seriler. */
export function CountColumns({ data, color = SERIES[0] }: { data: { key: string; value: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={8}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="key" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<TooltipBox money={false} />} cursor={{ fill: "rgba(11,11,11,.04)" }} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
