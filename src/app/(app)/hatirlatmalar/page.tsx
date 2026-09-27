import { requireSession } from "@/lib/session";
import { scopeOf } from "@/lib/scope";
import { remindersList, branches } from "@/lib/queries";
import { fmtDate } from "@/lib/time";
import { reminderText } from "@/lib/reminders";
import ReminderActions, { SendOne } from "@/components/ReminderActions";
import { Empty } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Hatırlatmalar" };
export default async function Page() {
  const s = await requireSession(); const { branchId } = scopeOf(s);
  const list = remindersList(branchId); const pending = list.filter((r) => r.status === "bekliyor"), sent = list.filter((r) => r.status === "gonderildi").slice(-30).reverse();
  const clinic = branchId ? branches().find((b) => b.id === branchId)?.name ?? "Klinik" : "Klinik";
  const Row = ({ r }: { r: (typeof list)[number] }) => <tr className="border-t border-ink/5 align-top"><td className="td whitespace-nowrap text-ink2">{r.scheduledAt.replace("T", " ")}</td><td className="td"><div className="font-semibold">{r.patientName}</div><div className="text-xs text-muted">{r.phone}</div></td><td className="td whitespace-nowrap">{fmtDate(r.date, { day: "numeric", month: "short" })} {r.start}<div className="text-xs text-muted">{r.doctorName}</div></td><td className="td"><span className={`chip ${r.channel === "sms" ? "bg-brand/10 text-brandDeep" : "bg-[#0ca30c]/12 text-[#006300]"}`}>{r.channel === "sms" ? "SMS" : "WhatsApp"} · {r.kind}</span></td><td className="td max-w-md text-xs text-ink2">{reminderText(r.kind as "24s", r.patientName, clinic, r.date, r.start, r.doctorName)}</td><td className="td text-right">{r.status === "bekliyor" ? <SendOne id={r.id} /> : <span className="text-xs text-muted">{r.sentAt ? new Date(r.sentAt).toLocaleString("tr-TR") : ""}</span>}</td></tr>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Hatırlatmalar</h1><p className="text-sm text-ink2">{pending.length} bekleyen · randevudan 24 saat ve 2 saat önce otomatik planlanır</p></div><ReminderActions /></div>
      <div className="card overflow-x-auto"><div className="px-5 py-3 text-sm font-bold">Kuyruk</div>{pending.length === 0 ? <div className="p-5"><Empty text="Bekleyen hatırlatma yok." /></div> : <table className="w-full text-sm"><thead className="bg-plane"><tr><th className="th">Planlanan</th><th className="th">Hasta</th><th className="th">Randevu</th><th className="th">Kanal</th><th className="th">Mesaj</th><th className="th"></th></tr></thead><tbody>{pending.slice(0, 60).map((r) => <Row key={r.id} r={r} />)}</tbody></table>}</div>
      <div className="card overflow-x-auto"><div className="px-5 py-3 text-sm font-bold">Gönderilenler <span className="font-normal text-muted">(son 30)</span></div>{sent.length === 0 ? <div className="p-5"><Empty text="Henüz gönderim yok." /></div> : <table className="w-full text-sm"><thead className="bg-plane"><tr><th className="th">Planlanan</th><th className="th">Hasta</th><th className="th">Randevu</th><th className="th">Kanal</th><th className="th">Mesaj</th><th className="th text-right">Gönderim</th></tr></thead><tbody>{sent.map((r) => <Row key={r.id} r={r} />)}</tbody></table>}</div>
    </div>
  );
}
