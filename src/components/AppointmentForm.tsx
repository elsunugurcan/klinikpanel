"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, Field } from "./ui";
import PatientPicker from "./PatientPicker";
import { saveAppointment, type Errors } from "@/app/actions";
import { toHHMM } from "@/lib/time";

export type Doc = { id: number; name: string; title: string; color: string; branchId: number };
export type Svc = { id: number; name: string; duration: number; category: string };
export type Initial = { id?: number; patient?: { id: number; name: string; phone: string; code: string } | null; doctorId?: number; serviceId?: number; date?: string; start?: string; note?: string };

export default function AppointmentForm({ open, onClose, doctors, services, hours, initial, lockDoctor }: { open: boolean; onClose: () => void; doctors: Doc[]; services: Svc[]; hours: [number, number]; initial: Initial; lockDoctor?: number | null }) {
  const router = useRouter();
  const [patient, setPatient] = useState(initial.patient ?? null);
  const [doctorId, setDoctorId] = useState<number>(lockDoctor ?? initial.doctorId ?? doctors[0]?.id ?? 0);
  const [serviceId, setServiceId] = useState<number>(initial.serviceId ?? services[0]?.id ?? 0);
  const [date, setDate] = useState(initial.date ?? ""); const [start, setStart] = useState(initial.start ?? "10:00"); const [note, setNote] = useState(initial.note ?? "");
  const [errors, setErrors] = useState<Errors>({}); const [pending, go] = useTransition();
  const times: string[] = []; for (let m = hours[0] * 60; m < hours[1] * 60; m += 15) times.push(toHHMM(m));
  const submit = (e: React.FormEvent) => { e.preventDefault(); go(async () => { const r = await saveAppointment(initial.id ?? null, { patientId: patient?.id ?? 0, doctorId, serviceId, date, start, note }); if (r.ok) { onClose(); router.refresh(); } else setErrors(r.errors); }); };
  return (
    <Modal open={open} onClose={onClose} title={initial.id ? "Randevuyu düzenle" : "Yeni randevu"}>
      <form onSubmit={submit} className="space-y-4">
        {errors.form && <p className="rounded-lg bg-[#d03b3b]/10 px-3 py-2 text-sm text-[#9a2323]">{errors.form}</p>}
        <Field label="Hasta" error={errors.patientId}><PatientPicker value={patient} onChange={setPatient} autoFocus={!patient} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hekim" error={errors.doctorId} htmlFor="f-doctor"><select id="f-doctor" className="input" value={doctorId} disabled={!!lockDoctor} onChange={(e) => setDoctorId(Number(e.target.value))}>{doctors.map((d) => <option key={d.id} value={d.id}>{d.title} {d.name}</option>)}</select></Field>
          <Field label="Hizmet" error={errors.serviceId} htmlFor="f-service"><select id="f-service" className="input" value={serviceId} onChange={(e) => setServiceId(Number(e.target.value))}>{services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.duration} dk</option>)}</select></Field>
          <Field label="Tarih" error={errors.date} htmlFor="f-date"><input id="f-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Saat" error={errors.start} htmlFor="f-start"><select id="f-start" className="input" value={start} onChange={(e) => setStart(e.target.value)}>{times.map((t) => <option key={t}>{t}</option>)}</select></Field>
        </div>
        <Field label="Not (opsiyonel)" htmlFor="f-note"><input id="f-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="2. seans, kontrol, hassasiyet…" /></Field>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-outline">Vazgeç</button><button disabled={pending} className="btn-primary">{pending ? "Kaydediliyor…" : "Kaydet"}</button></div>
      </form>
    </Modal>
  );
}
