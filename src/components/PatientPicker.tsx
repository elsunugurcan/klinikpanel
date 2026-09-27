"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { findPatients } from "@/app/actions";
type P = { id: number; name: string; phone: string; code: string };
export default function PatientPicker({ value, onChange, autoFocus = false }: { value: P | null; onChange: (p: P | null) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState(""); const [list, setList] = useState<P[]>([]); const [open, setOpen] = useState(false);
  useEffect(() => { if (q.trim().length < 2) { setList([]); return; } let alive = true; const t = setTimeout(() => findPatients(q).then((r) => { if (alive) { setList(r); setOpen(true); } }), 200); return () => { alive = false; clearTimeout(t); }; }, [q]);
  if (value) return <div className="flex items-center justify-between rounded-xl border border-brand/40 bg-brand/5 px-3 py-2 text-sm"><span><b>{value.name}</b> <span className="text-muted">· {value.phone} · {value.code}</span></span><button type="button" onClick={() => onChange(null)} className="text-xs text-ink2 underline">Değiştir</button></div>;
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => list.length && setOpen(true)} placeholder="Ad, telefon veya kod yazın…" className="input !pl-8" autoFocus={autoFocus} aria-label="Hasta seç" />
      {open && list.length > 0 && <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-ink/10 bg-surface shadow-card">{list.map((p) => <li key={p.id}><button type="button" onClick={() => { onChange(p); setOpen(false); setQ(""); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand/5"><span>{p.name}</span><span className="text-xs text-muted">{p.phone}</span></button></li>)}</ul>}
      {open && q.length >= 2 && list.length === 0 && <div className="absolute z-10 mt-1 w-full rounded-xl border border-ink/10 bg-surface px-3 py-2 text-xs text-muted shadow-card">Sonuç yok — Hastalar sayfasından yeni kayıt açabilirsiniz.</div>}
    </div>
  );
}
