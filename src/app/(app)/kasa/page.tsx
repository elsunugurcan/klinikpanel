import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { scopeOf } from "@/lib/scope";
import { paymentsBetween } from "@/lib/queries";
import { addDaysISO, fmtDate, toISODate } from "@/lib/time";
import { fmtMoney, fmtMoneyFull } from "@/lib/money";
import { sumBy } from "@/lib/reports";
import { StatTile } from "@/components/ui";
import { PaymentForm } from "@/components/PatientActions";
import { CAN } from "@/lib/roles";
import Link from "next/link";
export const dynamic = "force-dynamic";
export const metadata = { title: "Kasa" };
export default async function Page({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const s = await requireSession(); if (!CAN.payments(s.role)) redirect("/");
  const { branchId } = scopeOf(s); const today = toISODate(new Date());
  const from = searchParams.from ?? addDaysISO(today, -6), to = searchParams.to ?? today;
  const list = paymentsBetween(from, to, branchId); const total = list.reduce((a, p) => a + p.amount, 0);
  const byMethod = sumBy(list, (p) => p.method, (p) => p.amount);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Kasa</h1><p className="text-sm text-ink2">{fmtDate(from, { day: "numeric", month: "short" })} – {fmtDate(to, { day: "numeric", month: "short", year: "numeric" })}</p></div>
        <div className="flex flex-wrap items-center gap-2"><form className="flex items-center gap-2 text-sm"><input type="date" name="from" defaultValue={from} className="input !w-auto !py-2" aria-label="Başlangıç" /><span className="text-muted">–</span><input type="date" name="to" defaultValue={to} className="input !w-auto !py-2" aria-label="Bitiş" /><button className="btn-outline btn-sm">Filtrele</button></form><Link href={`/kasa?from=${today}&to=${today}`} className="btn-ghost btn-sm">Bugün</Link><PaymentForm pickPatient /></div></div>
      <div className="grid gap-4 sm:grid-cols-4"><StatTile label="Toplam tahsilat" value={fmtMoney(total)} hint={`${list.length} işlem`} hero />{["kart", "nakit", "havale"].map((m) => <StatTile key={m} label={m === "kart" ? "Kart" : m === "nakit" ? "Nakit" : "Havale"} value={fmtMoney(byMethod.find((x) => x.key === m)?.value ?? 0)} hint={total ? `%${Math.round(((byMethod.find((x) => x.key === m)?.value ?? 0) / total) * 100)}` : "—"} />)}</div>
      <div className="card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-plane"><tr><th className="th">Tarih</th><th className="th">Hasta</th><th className="th">İşlem</th><th className="th">Hekim</th><th className="th">Yöntem</th><th className="th">Not</th><th className="th text-right">Tutar</th></tr></thead><tbody>
        {list.length === 0 && <tr><td colSpan={7} className="td text-center text-muted">Bu aralıkta ödeme yok.</td></tr>}
        {list.map((p) => <tr key={p.id} className="border-t border-ink/5"><td className="td whitespace-nowrap text-ink2">{fmtDate(p.date, { day: "numeric", month: "short" })}</td><td className="td"><Link href={`/hastalar/${p.patientId}`} className="font-semibold hover:text-brand">{p.patientName}</Link></td><td className="td text-ink2">{p.serviceName}</td><td className="td text-ink2">{p.doctorName}</td><td className="td capitalize">{p.method}</td><td className="td text-ink2">{p.note ?? ""}</td><td className="td text-right font-semibold tabular-nums">{fmtMoneyFull(p.amount)}</td></tr>)}
      </tbody></table></div>
    </div>
  );
}
