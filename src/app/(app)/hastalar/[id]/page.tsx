import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Phone, Mail, Cake, AlertTriangle, CalendarPlus } from "lucide-react";
import { requireSession } from "@/lib/session";
import { patient, patientAppointments, patientTreatments, patientPayments, patientBalance, branches, doctors } from "@/lib/queries";
import { fmtDate } from "@/lib/time";
import { fmtMoneyFull } from "@/lib/money";
import { StatusBadge, StatTile } from "@/components/ui";
import PatientForm from "@/components/PatientForm";
import { TreatmentForm, PaymentForm } from "@/components/PatientActions";
import { CAN } from "@/lib/roles";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: { id: string } }) {
  const s = await requireSession(); const p = patient(Number(params.id)); if (!p) notFound();
  if (s.role !== "yonetici" && s.branchId !== p.branchId) notFound();
  const appts = patientAppointments(p.id), treats = patientTreatments(p.id), pays = patientPayments(p.id), bal = patientBalance(p.id);
  const br = branches(); const docs = doctors(p.branchId);
  const age = p.birthDate ? Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 864e5)) : null;
  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-xs text-muted"><Link href="/hastalar">Hastalar</Link><ChevronRight size={12} /><span className="text-ink">{p.firstName} {p.lastName}</span></nav>
      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-lg font-bold text-brandDeep">{p.firstName[0]}{p.lastName[0]}</div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{p.firstName} {p.lastName}</h1><span className="chip bg-ink/5 font-mono text-ink2">{p.code}</span>{p.allergies && <span className="chip bg-[#ec835a]/20 text-[#8a3d1b]"><AlertTriangle size={12} /> Alerji: {p.allergies}</span>}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink2"><span className="flex items-center gap-1"><Phone size={14} /> {p.phone}</span>{p.email && <span className="flex items-center gap-1"><Mail size={14} /> {p.email}</span>}{p.birthDate && <span className="flex items-center gap-1"><Cake size={14} /> {fmtDate(p.birthDate)} ({age})</span>}<span>{br.find((b) => b.id === p.branchId)?.name}</span></div>{p.notes && <p className="mt-2 rounded-lg bg-plane px-3 py-1.5 text-sm">{p.notes}</p>}</div></div>
        <div className="flex flex-wrap gap-2">{CAN.editPatients(s.role) && <PatientForm branches={br} canPickBranch={s.role === "yonetici"} patient={p} />}<Link href={`/takvim?yeni=1`} className="btn-primary btn-sm"><CalendarPlus size={14} /> Randevu</Link></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3"><StatTile label="Toplam işlem" value={fmtMoneyFull(bal.treated)} hint={`${treats.length} tedavi`} /><StatTile label="Tahsil edilen" value={fmtMoneyFull(bal.paid)} hint={`${pays.length} ödeme`} /><div className={`card p-5 ${bal.balance > 0 ? "border-[#ec835a]/50" : ""}`}><div className="text-xs font-medium text-ink2">Bakiye</div><div className={`mt-1 text-2xl font-bold ${bal.balance > 0 ? "text-[#8a3d1b]" : "text-[#006300]"}`}>{fmtMoneyFull(bal.balance)}</div><div className="text-xs text-muted">{bal.balance > 0 ? "Tahsil edilmemiş tutar" : "Borç yok"}</div></div></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card overflow-hidden"><div className="flex items-center justify-between px-5 py-4"><h2 className="font-bold">Tedavi geçmişi</h2><TreatmentForm patientId={p.id} doctors={docs.map((d) => ({ id: d.id, name: `${d.title} ${d.name}` }))} defaultDoctorId={s.doctorId ?? docs[0]?.id} /></div>
          <table className="w-full text-sm"><thead className="bg-plane"><tr><th className="th">Tarih</th><th className="th">İşlem</th><th className="th">Hekim</th><th className="th text-right">Tutar</th></tr></thead><tbody>{treats.length === 0 && <tr><td colSpan={4} className="td text-center text-muted">Kayıt yok.</td></tr>}{treats.map((t) => <tr key={t.id} className="border-t border-ink/5"><td className="td whitespace-nowrap text-ink2">{fmtDate(t.date, { day: "numeric", month: "short", year: "numeric" })}</td><td className="td"><div className="font-semibold">{t.title}</div>{t.notes && <div className="text-xs text-ink2">{t.notes}</div>}</td><td className="td text-ink2">{t.doctorName}</td><td className="td text-right tabular-nums">{fmtMoneyFull(t.price)}</td></tr>)}</tbody></table></div>
        <div className="card overflow-hidden"><div className="flex items-center justify-between px-5 py-4"><h2 className="font-bold">Ödemeler</h2>{CAN.payments(s.role) && <PaymentForm patientId={p.id} />}</div>
          <table className="w-full text-sm"><thead className="bg-plane"><tr><th className="th">Tarih</th><th className="th">Yöntem</th><th className="th">Not</th><th className="th text-right">Tutar</th></tr></thead><tbody>{pays.length === 0 && <tr><td colSpan={4} className="td text-center text-muted">Ödeme yok.</td></tr>}{pays.map((x) => <tr key={x.id} className="border-t border-ink/5"><td className="td whitespace-nowrap text-ink2">{fmtDate(x.date, { day: "numeric", month: "short", year: "numeric" })}</td><td className="td capitalize">{x.method}</td><td className="td text-ink2">{x.note ?? "—"}</td><td className="td text-right tabular-nums">{fmtMoneyFull(x.amount)}</td></tr>)}</tbody></table></div>
      </div>
      <div className="card overflow-hidden"><div className="px-5 py-4"><h2 className="font-bold">Randevular</h2></div><table className="w-full text-sm"><thead className="bg-plane"><tr><th className="th">Tarih</th><th className="th">Saat</th><th className="th">Hizmet</th><th className="th">Hekim</th><th className="th">Durum</th><th className="th">Not</th></tr></thead><tbody>{appts.map((a) => <tr key={a.id} className="border-t border-ink/5"><td className="td whitespace-nowrap">{fmtDate(a.date, { day: "numeric", month: "short", year: "numeric" })}</td><td className="td tabular-nums">{a.start}</td><td className="td">{a.serviceName}</td><td className="td text-ink2">{a.doctorName}</td><td className="td"><StatusBadge status={a.status} /></td><td className="td text-ink2">{a.note ?? ""}</td></tr>)}</tbody></table></div>
    </div>
  );
}
