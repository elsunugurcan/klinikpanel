"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Modal, Field } from "./ui";
import { savePatient, type Errors } from "@/app/actions";
import type { Patient } from "@/db/schema";
type B = { id: number; name: string };
export default function PatientForm({ branches, defaultBranch, canPickBranch, patient }: { branches: B[]; defaultBranch?: number; canPickBranch: boolean; patient?: Patient }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [errors, setErrors] = useState<Errors>({}); const [pending, go] = useTransition();
  const [f, setF] = useState({ firstName: patient?.firstName ?? "", lastName: patient?.lastName ?? "", phone: patient?.phone ?? "", email: patient?.email ?? "", birthDate: patient?.birthDate ?? "", gender: patient?.gender ?? "-", allergies: patient?.allergies ?? "", notes: patient?.notes ?? "", branchId: patient?.branchId ?? defaultBranch ?? branches[0]?.id });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const submit = (e: React.FormEvent) => { e.preventDefault(); go(async () => { const r = await savePatient(patient?.id ?? null, f); if (r.ok) { setOpen(false); router.refresh(); if (!patient) router.push(`/hastalar/${r.id}`); } else setErrors(r.errors); }); };
  return (
    <>
      <button onClick={() => setOpen(true)} className={patient ? "btn-outline btn-sm" : "btn-primary btn-sm"}>{patient ? <><Pencil size={14} /> Düzenle</> : <><Plus size={14} /> Yeni hasta</>}</button>
      <Modal open={open} onClose={() => setOpen(false)} title={patient ? "Hasta bilgilerini düzenle" : "Yeni hasta kaydı"}>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {errors.form && <p className="rounded-lg bg-[#d03b3b]/10 px-3 py-2 text-sm text-[#9a2323] sm:col-span-2">{errors.form}</p>}
          <Field label="Ad" error={errors.firstName} htmlFor="p-first"><input id="p-first" className="input" value={f.firstName} onChange={set("firstName")} aria-invalid={!!errors.firstName} /></Field>
          <Field label="Soyad" error={errors.lastName} htmlFor="p-last"><input id="p-last" className="input" value={f.lastName} onChange={set("lastName")} aria-invalid={!!errors.lastName} /></Field>
          <Field label="Telefon" error={errors.phone} htmlFor="p-phone"><input id="p-phone" className="input" value={f.phone} onChange={set("phone")} placeholder="05xx xxx xx xx" aria-invalid={!!errors.phone} /></Field>
          <Field label="E-posta" error={errors.email} htmlFor="p-email"><input id="p-email" className="input" type="email" value={f.email} onChange={set("email")} /></Field>
          <Field label="Doğum tarihi" htmlFor="p-birth"><input id="p-birth" className="input" type="date" value={f.birthDate} onChange={set("birthDate")} /></Field>
          <Field label="Cinsiyet" htmlFor="p-gender"><select id="p-gender" className="input" value={f.gender} onChange={set("gender")}><option value="-">Belirtilmedi</option><option value="K">Kadın</option><option value="E">Erkek</option></select></Field>
          <Field label="Alerjiler" htmlFor="p-allergy" className="sm:col-span-2"><input id="p-allergy" className="input" value={f.allergies} onChange={set("allergies")} placeholder="Penisilin, lidokain…" /></Field>
          <Field label="Notlar" htmlFor="p-notes" className="sm:col-span-2"><textarea id="p-notes" rows={2} className="input" value={f.notes} onChange={set("notes")} /></Field>
          {canPickBranch && <Field label="Şube" htmlFor="p-branch"><select id="p-branch" className="input" value={f.branchId} onChange={set("branchId")}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>}
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setOpen(false)} className="btn-outline">Vazgeç</button><button disabled={pending} className="btn-primary">{pending ? "Kaydediliyor…" : "Kaydet"}</button></div>
        </form>
      </Modal>
    </>
  );
}
