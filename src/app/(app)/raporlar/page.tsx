import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { requireSession } from "@/lib/session";
import { scopeOf } from "@/lib/scope";
import { appointmentsBetween, paymentsBetween, branches } from "@/lib/queries";
import { addDaysISO, fmtDate, toISODate, weekdayShort, parseDate } from "@/lib/time";
import { fmtMoney } from "@/lib/money";
import { dailySeries, noShowRate, pctChange, sumBy } from "@/lib/reports";
import { StatTile } from "@/components/ui";
import { RevenueArea, CategoryBars, CountColumns } from "@/components/Charts";
import { CAN } from "@/lib/roles";
export const dynamic = "force-dynamic";
export const metadata = { title: "Raporlar" };
const PRESETS: [string, number][] = [["7 gün", 7], ["30 gün", 30], ["90 gün", 90]];
export default async function Page({ searchParams }: { searchParams: { gun?: string } }) {
  const s = await requireSession(); if (!CAN.reports(s.role)) redirect("/");
  const { branchId } = scopeOf(s); const today = toISODate(new Date()); const days = Number(searchParams.gun) || 30;
  const from = addDaysISO(today, -(days - 1)), prevFrom = addDaysISO(from, -days), prevTo = addDaysISO(from, -1);
  const pays = paymentsBetween(from, today, branchId), prevPays = paymentsBetween(prevFrom, prevTo, branchId);
  const appts = appointmentsBetween(from, today, { branchId }), prevAppts = appointmentsBetween(prevFrom, prevTo, { branchId });
  const revenue = pays.reduce((a, p) => a + p.amount, 0), prevRevenue = prevPays.reduce((a, p) => a + p.amount, 0);
  const done = appts.filter((a) => a.status === "tamamlandi"), prevDone = prevAppts.filter((a) => a.status === "tamamlandi");
  const byDoctor = sumBy(pays, (p) => p.doctorName, (p) => p.amount), byService = sumBy(pays, (p) => p.serviceName, (p) => p.amount).slice(0, 8), byBranch = sumBy(pays, (p) => branches().find((b) => b.id === p.branchId)?.name ?? "—", (p) => p.amount);
  const byWeekday = [1, 2, 3, 4, 5, 6].map((wd) => ({ key: weekdayShort[wd], value: appts.filter((a) => parseDate(a.date).getDay() === wd && a.status !== "iptal").length }));
  const newPatients = new Set(appts.map((a) => a.patientId)).size;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Raporlar</h1><p className="text-sm text-ink2">{fmtDate(from, { day: "numeric", month: "short" })} – {fmtDate(today, { day: "numeric", month: "short", year: "numeric" })} · önceki dönemle karşılaştırmalı</p></div>
        <div className="flex items-center gap-2"><div className="flex rounded-xl border border-ink/15 bg-white p-0.5 text-xs font-semibold">{PRESETS.map(([l, n]) => <Link key={n} href={`/raporlar?gun=${n}`} className={`rounded-lg px-3 py-1.5 ${days === n ? "bg-ink text-white" : "text-ink2"}`}>{l}</Link>)}</div><a href={`/raporlar/csv?from=${from}&to=${today}`} className="btn-outline btn-sm"><Download size={14} /> CSV</a></div></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Tahsilat" value={fmtMoney(revenue)} delta={{ value: pctChange(revenue, prevRevenue), vs: "önceki dönem" }} hero />
        <StatTile label="Tamamlanan işlem" value={String(done.length)} delta={{ value: pctChange(done.length, prevDone.length), vs: "önceki dönem" }} />
        <StatTile label="Gelmeme oranı" value={`%${Math.round(noShowRate(appts) * 100)}`} delta={{ value: noShowRate(appts) - noShowRate(prevAppts), goodWhenUp: false, vs: "puan farkı" }} />
        <StatTile label="İşlem başına ortalama" value={fmtMoney(done.length ? revenue / done.length : 0)} hint={`${newPatients} farklı hasta`} />
      </div>
      <div className="card p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Günlük tahsilat</h2><span className="text-xs text-muted">₺, son {days} gün</span></div><div className="mt-3"><RevenueArea data={dailySeries(pays.map((p) => ({ date: p.date, amount: p.amount })), from, today)} /></div></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-5"><h2 className="font-bold">Hekime göre tahsilat</h2><div className="mt-3"><CategoryBars data={byDoctor} /></div></div>
        <div className="card p-5"><h2 className="font-bold">Hizmete göre tahsilat</h2><div className="mt-3"><CategoryBars data={byService} color="#eb6834" /></div><table className="mt-2 w-full text-xs"><tbody>{byService.map((r) => <tr key={r.key} className="border-t border-ink/5"><td className="py-1.5 text-ink2">{r.key}</td><td className="py-1.5 text-right font-semibold tabular-nums">{fmtMoney(r.value)}</td></tr>)}</tbody></table></div>
        <div className="card p-5"><h2 className="font-bold">Haftanın gününe göre randevu</h2><div className="mt-3"><CountColumns data={byWeekday} /></div></div>
        <div className="card p-5"><h2 className="font-bold">Şubeye göre tahsilat</h2><div className="mt-3"><CategoryBars data={byBranch} color="#1baf7a" /></div><table className="mt-2 w-full text-xs"><tbody>{byBranch.map((r) => <tr key={r.key} className="border-t border-ink/5"><td className="py-1.5 text-ink2">{r.key}</td><td className="py-1.5 text-right font-semibold tabular-nums">{fmtMoney(r.value)}</td></tr>)}</tbody></table></div>
      </div>
    </div>
  );
}
