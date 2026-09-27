import Link from "next/link";
import { ArrowRight, BellRing } from "lucide-react";
import { requireSession } from "@/lib/session";
import { scopeOf } from "@/lib/scope";
import { appointmentsBetween, paymentsBetween, remindersList, doctors, branches } from "@/lib/queries";
import { dailySeries, noShowRate, pctChange, sumBy } from "@/lib/reports";
import { utilization } from "@/lib/availability";
import { addDaysISO, toISODate, monthKey, fmtDate } from "@/lib/time";
import { fmtMoney } from "@/lib/money";
import { StatTile, StatusBadge } from "@/components/ui";
import { RevenueArea, CategoryBars } from "@/components/Charts";
import QuickStatus from "@/components/QuickStatus";
import { CAN } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Özet" };

export default async function Page() {
  const s = await requireSession(); const { branchId, doctorId } = scopeOf(s);
  const today = toISODate(new Date());
  const todays = appointmentsBetween(today, today, { branchId, doctorId });
  const last30 = appointmentsBetween(addDaysISO(today, -29), today, { branchId, doctorId });
  const pays = CAN.payments(s.role) ? paymentsBetween(addDaysISO(today, -60), today, branchId) : [];
  const todayRevenue = pays.filter((p) => p.date === today).reduce((a, p) => a + p.amount, 0);
  const mk = monthKey(today), prevMk = monthKey(addDaysISO(today, -30));
  const monthRevenue = pays.filter((p) => p.date.startsWith(mk)).reduce((a, p) => a + p.amount, 0), prevRevenue = pays.filter((p) => p.date.startsWith(prevMk)).reduce((a, p) => a + p.amount, 0);
  const series = dailySeries(pays.map((p) => ({ date: p.date, amount: p.amount })), addDaysISO(today, -29), today);
  const byService = sumBy(last30.filter((a) => a.status === "tamamlandi"), (a) => a.serviceName, () => 1).slice(0, 6);
  const pendingReminders = remindersList(branchId).filter((r) => r.status === "bekliyor").length;
  const upcoming = todays.filter((a) => ["planlandi", "onaylandi", "geldi"].includes(a.status)).slice(0, 8);
  const docs = doctors(branchId).filter((d) => !doctorId || d.id === doctorId);
  const br = branches();
  const doneToday = todays.filter((a) => a.status === "tamamlandi").length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Günaydın, {s.name.split(" ")[0]}</h1><p className="text-sm text-ink2">{fmtDate(today, { weekday: "long", day: "numeric", month: "long" })} · {branchId ? br.find((b) => b.id === branchId)?.name : "Tüm şubeler"}</p></div><Link href="/takvim" className="btn-outline btn-sm">Takvime git <ArrowRight size={14} /></Link></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Bugünkü randevu" value={String(todays.length)} hint={`${doneToday} tamamlandı · ${todays.filter((a) => a.status === "gelmedi").length} gelmedi`} hero />
        {CAN.payments(s.role) ? <StatTile label="Bugün tahsilat" value={fmtMoney(todayRevenue)} hint={`${pays.filter((p) => p.date === today).length} işlem`} /> : <StatTile label="Bu ay tamamlanan" value={String(last30.filter((a) => a.status === "tamamlandi").length)} hint="son 30 gün" />}
        {CAN.payments(s.role) ? <StatTile label="Bu ay ciro" value={fmtMoney(monthRevenue)} delta={{ value: pctChange(monthRevenue, prevRevenue), vs: "geçen aya göre" }} /> : <StatTile label="Doluluk (bugün)" value={`%${Math.round(utilization(todays, 9, 19) * 100)}`} />}
        <StatTile label="Gelmeme oranı" value={`%${Math.round(noShowRate(last30) * 100)}`} delta={{ value: -0.13, goodWhenUp: false, vs: "son 30 gün" }} hint={`${last30.filter((a) => a.status === "gelmedi").length} randevu`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {CAN.payments(s.role) ? <div className="card p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Günlük tahsilat</h2><span className="text-xs text-muted">Son 30 gün</span></div><div className="mt-3"><RevenueArea data={series} /></div></div>
          : <div className="card p-5"><h2 className="font-bold">Son 30 gün · tamamlanan işlemler</h2><div className="mt-3"><CategoryBars data={byService} money={false} /></div></div>}
        <div className="card p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Hizmet dağılımı</h2><span className="text-xs text-muted">Son 30 gün · tamamlanan</span></div><div className="mt-3"><CategoryBars data={byService} money={false} color="#1baf7a" /></div>
          <table className="mt-2 w-full text-xs"><tbody>{byService.map((r) => <tr key={r.key} className="border-t border-ink/5"><td className="py-1.5 text-ink2">{r.key}</td><td className="py-1.5 text-right font-semibold tabular-nums">{r.value}</td></tr>)}</tbody></table></div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden"><div className="flex items-center justify-between px-5 py-4"><h2 className="font-bold">Bugünün programı</h2><span className="text-xs text-muted">{upcoming.length} aktif randevu</span></div>
          <table className="w-full text-sm"><thead className="bg-plane"><tr><th className="th">Saat</th><th className="th">Hasta</th><th className="th">Hizmet</th><th className="th">Hekim</th><th className="th">Durum</th><th className="th"></th></tr></thead><tbody>
            {upcoming.length === 0 && <tr><td colSpan={6} className="td text-center text-muted">Bugün aktif randevu yok.</td></tr>}
            {upcoming.map((a) => <tr key={a.id} className="border-t border-ink/5"><td className="td font-semibold tabular-nums">{a.start}</td><td className="td"><Link href={`/hastalar/${a.patientId}`} className="hover:text-brand">{a.patientName}</Link></td><td className="td text-ink2">{a.serviceName}</td><td className="td"><span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: a.doctorColor }} /> {a.doctorName}</td><td className="td"><StatusBadge status={a.status} /></td><td className="td text-right"><QuickStatus id={a.id} status={a.status} /></td></tr>)}
          </tbody></table></div>
        <div className="space-y-4">
          <div className="card p-5"><h2 className="font-bold">Hekim doluluğu · bugün</h2><ul className="mt-3 space-y-3">{docs.map((d) => { const u = utilization(todays.filter((a) => a.doctorId === d.id), 9, 19); return <li key={d.id}><div className="flex justify-between text-xs"><span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.title} {d.name}</span><span className="font-semibold tabular-nums">%{Math.round(u * 100)}</span></div><div className="mt-1 h-2 rounded-full bg-[#cde2fb]"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(u * 100)}%` }} /></div></li>; })}</ul></div>
          <Link href="/hatirlatmalar" className="card flex items-center gap-3 p-5 transition hover:border-brand/40"><span className="rounded-xl bg-brand/10 p-2 text-brandDeep"><BellRing size={20} /></span><div><div className="font-bold">{pendingReminders} bekleyen hatırlatma</div><div className="text-xs text-ink2">Yaklaşan randevular için SMS / WhatsApp kuyruğu</div></div><ArrowRight size={16} className="ml-auto text-muted" /></Link>
        </div>
      </div>
    </div>
  );
}
