import { addDaysISO } from "./time";
export type Row<T extends string = string> = Record<T, string | number>;
export function sumBy<T>(rows: T[], key: (r: T) => string, value: (r: T) => number): { key: string; value: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + value(r));
  return Array.from(m.entries()).map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
}
/** Tarih aralığındaki her gün için toplam (boş günler 0). */
export function dailySeries(rows: { date: string; amount: number }[], from: string, to: string) {
  const m = new Map<string, number>();
  for (const r of rows) if (r.date >= from && r.date <= to) m.set(r.date, (m.get(r.date) ?? 0) + r.amount);
  const out: { date: string; amount: number }[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) out.push({ date: d, amount: m.get(d) ?? 0 });
  return out;
}
export function noShowRate(appts: { status: string }[]) {
  const done = appts.filter((a) => ["tamamlandi", "geldi", "gelmedi"].includes(a.status));
  if (!done.length) return 0;
  return done.filter((a) => a.status === "gelmedi").length / done.length;
}
export function pctChange(cur: number, prev: number) { return prev === 0 ? (cur > 0 ? 1 : 0) : (cur - prev) / prev; }
export function toCSV(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: string | number) => { const s = String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
}
