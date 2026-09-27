"use client";
import { useMemo, useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Pencil, User } from "lucide-react";
import type { ApptFull } from "@/lib/queries";
import { addDaysISO, toHHMM, toMin, fmtDate, parseDate, weekdayShort, toISODate } from "@/lib/time";
import { rescheduleAppointment, setAppointmentStatus } from "@/app/actions";
import { Modal, StatusBadge } from "./ui";
import AppointmentForm, { type Doc, type Svc } from "./AppointmentForm";
import { STATUS_LABEL, type Status } from "@/db/schema";

const ROW = 44; // 30 dk = 44px
type View = "hafta" | "gun";
type Props = { appts: ApptFull[]; doctors: Doc[]; services: Svc[]; hours: [number, number]; date: string; view: View; doctorFilter: number | null; lockDoctor: number | null; openNew: boolean; today: string };

/** Aynı sütunda çakışan blokları yan yana dizmek için şerit (lane) ataması. */
function lanes(items: ApptFull[]) {
  const sorted = [...items].sort((a, b) => toMin(a.start) - toMin(b.start));
  const ends: number[] = []; const out = new Map<number, { lane: number; count: number }>();
  const groups: ApptFull[][] = []; let cur: ApptFull[] = []; let curEnd = -1;
  for (const a of sorted) { const s = toMin(a.start); if (s >= curEnd && cur.length) { groups.push(cur); cur = []; } cur.push(a); curEnd = Math.max(curEnd, s + a.duration); }
  if (cur.length) groups.push(cur);
  for (const g of groups) {
    ends.length = 0;
    for (const a of g) { const s = toMin(a.start); let lane = ends.findIndex((e) => e <= s); if (lane === -1) { lane = ends.length; ends.push(0); } ends[lane] = s + a.duration; out.set(a.id, { lane, count: 0 }); }
    for (const a of g) out.get(a.id)!.count = ends.length;
  }
  return out;
}

export default function Calendar({ appts, doctors, services, hours, date, view, doctorFilter, lockDoctor, openNew, today }: Props) {
  const router = useRouter();
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApptFull | null>(null);
  const [form, setForm] = useState<null | { id?: number; patient?: ApptFull; date?: string; start?: string; doctorId?: number }>(openNew ? { date } : null);
  const [pending, start] = useTransition();
  const nav = (patch: Record<string, string | null>) => { const p = new URLSearchParams({ tarih: date, gorunum: view, ...(doctorFilter ? { hekim: String(doctorFilter) } : {}) }); for (const [k, v] of Object.entries(patch)) { if (v === null) p.delete(k); else p.set(k, v); } router.push(`/takvim?${p}`); };
  const weekStart = useMemo(() => { const d = parseDate(date); const off = (d.getDay() + 6) % 7; return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - off)); }, [date]);
  const days = view === "hafta" ? Array.from({ length: 6 }, (_, i) => addDaysISO(weekStart, i)) : [date];
  const columns: { key: string; label: string; sub?: string; date: string; doctorId?: number; color?: string }[] = view === "hafta"
    ? days.map((d) => ({ key: d, label: weekdayShort[parseDate(d).getDay()], sub: String(parseDate(d).getDate()), date: d }))
    : doctors.filter((d) => !doctorFilter || d.id === doctorFilter).map((d) => ({ key: `d${d.id}`, label: d.name, sub: d.title, date, doctorId: d.id, color: d.color }));
  const slots: number[] = []; for (let m = hours[0] * 60; m < hours[1] * 60; m += 30) slots.push(m);
  const visible = appts.filter((a) => !doctorFilter || a.doctorId === doctorFilter);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const onDrop = (e: DragEvent, colDate: string, min: number) => {
    e.preventDefault(); setOver(null);
    if (dragId === null) return;
    const id = dragId; setDragId(null);
    start(async () => { const r = await rescheduleAppointment(id, colDate, toHHMM(min)); if (!r.ok) { setError(r.error ?? "Taşınamadı"); setTimeout(() => setError(null), 3500); } router.refresh(); });
  };
  const changeStatus = (id: number, st: string) => start(async () => { const r = await setAppointmentStatus(id, st); if (!r.ok) setError(r.error ?? "Hata"); setSelected(null); router.refresh(); });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border border-ink/15 bg-white"><button onClick={() => nav({ tarih: addDaysISO(date, view === "hafta" ? -7 : -1) })} className="p-2 hover:bg-ink/5" aria-label="Önceki"><ChevronLeft size={16} /></button><button onClick={() => nav({ tarih: today })} className="border-x border-ink/10 px-3 py-2 text-xs font-semibold">Bugün</button><button onClick={() => nav({ tarih: addDaysISO(date, view === "hafta" ? 7 : 1) })} className="p-2 hover:bg-ink/5" aria-label="Sonraki"><ChevronRight size={16} /></button></div>
        <h1 className="text-lg font-bold">{view === "hafta" ? `${fmtDate(days[0], { day: "numeric", month: "long" })} – ${fmtDate(days[5], { day: "numeric", month: "long", year: "numeric" })}` : fmtDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h1>
        <div className="ml-auto flex items-center gap-2">
          {!lockDoctor && <select value={doctorFilter ?? 0} onChange={(e) => nav({ hekim: e.target.value === "0" ? null : e.target.value })} className="input !w-auto !py-2 text-xs" aria-label="Hekim filtresi"><option value={0}>Tüm hekimler</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.title} {d.name}</option>)}</select>}
          <div className="flex rounded-xl border border-ink/15 bg-white p-0.5 text-xs font-semibold">{(["gun", "hafta"] as View[]).map((v) => <button key={v} onClick={() => nav({ gorunum: v })} className={`rounded-lg px-3 py-1.5 ${view === v ? "bg-ink text-white" : "text-ink2"}`}>{v === "gun" ? "Gün" : "Hafta"}</button>)}</div>
          <button onClick={() => setForm({ date, doctorId: lockDoctor ?? doctorFilter ?? undefined })} className="btn-primary btn-sm"><Plus size={14} /> Randevu</button>
        </div>
      </div>
      {error && <div className="rounded-xl bg-[#d03b3b]/10 px-4 py-2 text-sm text-[#9a2323]">{error}</div>}
      <div className={`card overflow-x-auto ${pending ? "opacity-70" : ""}`}>
        <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0, 1fr))` }}>
          <div className="sticky top-0 z-10 border-b border-ink/10 bg-surface" />
          {columns.map((c) => <div key={c.key} className={`sticky top-0 z-10 border-b border-l border-ink/10 bg-surface px-2 py-2 text-center ${c.date === today && view === "hafta" ? "bg-brand/5" : ""}`}><div className="text-[11px] font-semibold uppercase text-muted">{c.sub && view === "gun" ? c.sub : c.label}</div><div className={`text-sm font-bold ${c.date === today && view === "hafta" ? "text-brandDeep" : ""}`} style={c.color ? { color: c.color } : undefined}>{view === "gun" ? c.label : c.sub}</div></div>)}
          <div className="relative">{slots.map((m) => <div key={m} style={{ height: ROW }} className="border-b border-ink/5 pr-2 text-right text-[11px] tabular-nums text-muted">{m % 60 === 0 ? toHHMM(m) : ""}</div>)}</div>
          {columns.map((c) => {
            const items = visible.filter((a) => a.date === c.date && (!c.doctorId || a.doctorId === c.doctorId));
            const L = lanes(items);
            return (
              <div key={c.key} className="relative border-l border-ink/10">
                {slots.map((m) => { const key = `${c.key}-${m}`; return <div key={m} style={{ height: ROW }} onDragOver={(e) => { e.preventDefault(); setOver(key); }} onDragLeave={() => setOver(null)} onDrop={(e) => onDrop(e, c.date, m)} onDoubleClick={() => setForm({ date: c.date, start: toHHMM(m), doctorId: c.doctorId ?? lockDoctor ?? doctorFilter ?? undefined })} className={`border-b border-ink/5 ${m % 60 === 0 ? "" : "border-dashed"} ${over === key ? "drag-over" : ""}`} title="Çift tıkla: yeni randevu" />; })}
                {c.date === today && nowMin >= hours[0] * 60 && nowMin <= hours[1] * 60 && <div className="pointer-events-none absolute left-0 right-0 z-[5] border-t-2 border-[#d03b3b]" style={{ top: ((nowMin - hours[0] * 60) / 30) * ROW }} />}
                {items.map((a) => { const top = ((toMin(a.start) - hours[0] * 60) / 30) * ROW, h = (a.duration / 30) * ROW - 2; const l = L.get(a.id) ?? { lane: 0, count: 1 }; const dim = a.status === "iptal" || a.status === "gelmedi"; return (
                  <button key={a.id} draggable={!dim} onDragStart={() => setDragId(a.id)} onDragEnd={() => setDragId(null)} onClick={() => setSelected(a)} style={{ top, height: Math.max(h, 22), left: `calc(${(l.lane / l.count) * 100}% + 2px)`, width: `calc(${100 / l.count}% - 4px)`, background: dim ? "#f0efec" : a.doctorColor + "22", borderLeftColor: dim ? "#c3c2b7" : a.doctorColor }}
                    className={`absolute z-[4] overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] leading-tight transition hover:z-[6] hover:shadow-card ${dim ? "text-muted line-through" : "text-ink"} ${dragId === a.id ? "opacity-50" : ""}`} title={`${a.start} ${a.patientName} · ${a.serviceName}`}>
                    <div className="truncate font-semibold">{a.start} {a.patientName}</div>
                    {h > 30 && <div className="truncate text-ink2">{a.serviceName}{view === "hafta" && !doctorFilter ? ` · ${a.doctorName.split(" ")[0]}` : ""}</div>}
                    {h > 52 && <div className="mt-0.5"><StatusBadge status={a.status} size={10} /></div>}
                  </button>); })}
              </div>);
          })}
        </div>
      </div>
      <p className="text-xs text-muted">Sürükleyip bırakarak taşıyın · boş alana çift tıklayarak randevu açın · bloğa tıklayarak durum değiştirin.</p>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Randevu">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-start justify-between gap-3"><div><div className="text-lg font-bold">{selected.patientName}</div><div className="text-ink2">{selected.patientPhone} · <Link href={`/hastalar/${selected.patientId}`} className="text-brand underline">hasta dosyası</Link></div></div><StatusBadge status={selected.status} /></div>
            <dl className="grid grid-cols-2 gap-2 rounded-xl bg-plane p-3"><dt className="text-muted">Tarih / saat</dt><dd className="font-semibold">{fmtDate(selected.date, { day: "numeric", month: "long" })} · {selected.start} ({selected.duration} dk)</dd><dt className="text-muted">Hekim</dt><dd><span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: selected.doctorColor }} /> {selected.doctorName}</dd><dt className="text-muted">Hizmet</dt><dd>{selected.serviceName}</dd>{selected.note && <><dt className="text-muted">Not</dt><dd>{selected.note}</dd></>}</dl>
            <div><div className="label">Durum</div><div className="flex flex-wrap gap-1.5">{(Object.keys(STATUS_LABEL) as Status[]).map((st) => <button key={st} disabled={st === selected.status} onClick={() => changeStatus(selected.id, st)} className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${st === selected.status ? "border-ink bg-ink text-white" : "border-ink/15 hover:border-ink/40"}`}>{STATUS_LABEL[st]}</button>)}</div></div>
            <div className="flex justify-end gap-2"><button onClick={() => { setForm({ id: selected.id, patient: selected, date: selected.date, start: selected.start, doctorId: selected.doctorId }); setSelected(null); }} className="btn-outline btn-sm"><Pencil size={14} /> Düzenle</button><Link href={`/hastalar/${selected.patientId}`} className="btn-primary btn-sm"><User size={14} /> Hasta dosyası</Link></div>
          </div>
        )}
      </Modal>
      {form && <AppointmentForm open onClose={() => setForm(null)} doctors={doctors} services={services} hours={hours} lockDoctor={lockDoctor} initial={{ id: form.id, patient: form.patient ? { id: form.patient.patientId, name: form.patient.patientName, phone: form.patient.patientPhone, code: "" } : null, doctorId: form.doctorId, serviceId: form.patient?.serviceId, date: form.date, start: form.start, note: form.patient?.note ?? "" }} />}
    </div>
  );
}
