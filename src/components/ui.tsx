"use client";
import { useEffect } from "react";
import { X, CheckCircle2, AlertTriangle, Clock, XCircle, CalendarCheck, UserCheck } from "lucide-react";
import { STATUS_LABEL, type Status } from "@/db/schema";

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-[6vh] backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`card w-full ${wide ? "max-w-3xl" : "max-w-lg"} p-6`}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} className="rounded-lg p-1.5 text-ink2 hover:bg-ink/5" aria-label="Kapat"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, error, children, className = "", htmlFor }: { label: string; error?: string; children: React.ReactNode; className?: string; htmlFor?: string }) {
  return <div className={className}><label htmlFor={htmlFor} className="label">{label}</label>{children}{error && <p className="mt-1 text-xs text-critical">{error}</p>}</div>;
}

const STATUS_STYLE: Record<Status, { cls: string; Icon: typeof Clock }> = {
  planlandi: { cls: "bg-ink/5 text-ink2", Icon: Clock },
  onaylandi: { cls: "bg-brand/10 text-brandDeep", Icon: CalendarCheck },
  geldi: { cls: "bg-[#fab219]/20 text-[#7a5300]", Icon: UserCheck },
  tamamlandi: { cls: "bg-[#0ca30c]/12 text-[#006300]", Icon: CheckCircle2 },
  gelmedi: { cls: "bg-[#ec835a]/20 text-[#8a3d1b]", Icon: AlertTriangle },
  iptal: { cls: "bg-[#d03b3b]/12 text-[#9a2323]", Icon: XCircle },
};
export function StatusBadge({ status, size = 12 }: { status: string; size?: number }) {
  const s = STATUS_STYLE[status as Status] ?? STATUS_STYLE.planlandi; const Icon = s.Icon;
  return <span className={`chip ${s.cls}`}><Icon size={size} /> {STATUS_LABEL[status as Status] ?? status}</span>;
}

export function StatTile({ label, value, delta, hint, hero = false }: { label: string; value: string; delta?: { value: number; goodWhenUp?: boolean; vs: string }; hint?: string; hero?: boolean }) {
  const up = delta ? delta.value >= 0 : true; const good = delta ? (delta.goodWhenUp ?? true) === up : true;
  return (
    <div className="card p-5">
      <div className="text-xs font-medium text-ink2">{label}</div>
      <div className={`mt-1 font-bold tracking-tight ${hero ? "text-4xl" : "text-2xl"}`}>{value}</div>
      {delta && <div className={`mt-1 text-xs font-semibold ${good ? "text-[#006300]" : "text-[#9a2323]"}`}>{up ? "▲" : "▼"} {Math.abs(Math.round(delta.value * 100))}% <span className="font-normal text-muted">{delta.vs}</span></div>}
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-ink/15 p-8 text-center text-sm text-muted">{text}</div>; }
