"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal, Field } from "./ui";
import { addTreatment, addPayment } from "@/app/actions";
import { toISODate } from "@/lib/time";
import PatientPicker from "./PatientPicker";

export function TreatmentForm({ patientId, doctors, defaultDoctorId }: { patientId: number; doctors: { id: number; name: string }[]; defaultDoctorId?: number }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [err, setErr] = useState(""); const [pending, go] = useTransition();
  const [f, setF] = useState({ doctorId: defaultDoctorId ?? doctors[0]?.id, date: toISODate(new Date()), title: "", notes: "", price: "" });
  return (<>
    <button onClick={() => setOpen(true)} className="btn-outline btn-sm"><Plus size={14} /> Tedavi ekle</button>
    <Modal open={open} onClose={() => setOpen(false)} title="Tedavi kaydı">
      <form onSubmit={(e) => { e.preventDefault(); go(async () => { const r = await addTreatment({ patientId, doctorId: Number(f.doctorId), date: f.date, title: f.title, notes: f.notes, price: Number(f.price || 0) }); if (r.ok) { setOpen(false); router.refresh(); } else setErr(r.error ?? "Hata"); }); }} className="space-y-3">
        {err && <p className="text-sm text-critical">{err}</p>}
        <Field label="İşlem" htmlFor="t-title"><input id="t-title" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Lazer epilasyon · kol, 2. seans" /></Field>
        <div className="grid grid-cols-3 gap-3"><Field label="Hekim" htmlFor="t-doc"><select id="t-doc" className="input" value={f.doctorId} onChange={(e) => setF({ ...f, doctorId: Number(e.target.value) })}>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field><Field label="Tarih" htmlFor="t-date"><input id="t-date" type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field><Field label="Tutar (₺)" htmlFor="t-price"><input id="t-price" type="number" min={0} step="1" className="input" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field></div>
        <Field label="Notlar" htmlFor="t-notes"><textarea id="t-notes" rows={3} className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Uygulama detayı, kontrol tarihi…" /></Field>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="btn-outline">Vazgeç</button><button disabled={pending} className="btn-primary">Kaydet</button></div>
      </form>
    </Modal>
  </>);
}

export function PaymentForm({ patientId, pickPatient = false }: { patientId?: number; pickPatient?: boolean }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [err, setErr] = useState(""); const [pending, go] = useTransition();
  const [pat, setPat] = useState<{ id: number; name: string; phone: string; code: string } | null>(null);
  const [f, setF] = useState({ amount: "", method: "kart", date: toISODate(new Date()), note: "" });
  return (<>
    <button onClick={() => setOpen(true)} className="btn-primary btn-sm"><Plus size={14} /> Ödeme al</button>
    <Modal open={open} onClose={() => setOpen(false)} title="Ödeme kaydı">
      <form onSubmit={(e) => { e.preventDefault(); go(async () => { const pid = patientId ?? pat?.id; if (!pid) return setErr("Hasta seçin"); const r = await addPayment({ patientId: pid, amount: Number(f.amount), method: f.method, date: f.date, note: f.note }); if (r.ok) { setOpen(false); router.refresh(); } else setErr(r.error ?? "Hata"); }); }} className="space-y-3">
        {err && <p className="text-sm text-critical">{err}</p>}
        {pickPatient && <Field label="Hasta"><PatientPicker value={pat} onChange={setPat} autoFocus /></Field>}
        <div className="grid grid-cols-3 gap-3"><Field label="Tutar (₺)" htmlFor="pay-amount"><input id="pay-amount" type="number" min={1} step="1" className="input" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} autoFocus={!pickPatient} /></Field><Field label="Yöntem" htmlFor="pay-method"><select id="pay-method" className="input" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option value="kart">Kart</option><option value="nakit">Nakit</option><option value="havale">Havale</option></select></Field><Field label="Tarih" htmlFor="pay-date"><input id="pay-date" type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field></div>
        <Field label="Not" htmlFor="pay-note"><input id="pay-note" className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Peşinat, 2. taksit…" /></Field>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="btn-outline">Vazgeç</button><button disabled={pending} className="btn-primary">Kaydet</button></div>
      </form>
    </Modal>
  </>);
}
