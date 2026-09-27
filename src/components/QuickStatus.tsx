"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAppointmentStatus } from "@/app/actions";
const NEXT: Record<string, [string, string][]> = { planlandi: [["onaylandi", "Onayla"], ["geldi", "Geldi"], ["iptal", "İptal"]], onaylandi: [["geldi", "Geldi"], ["gelmedi", "Gelmedi"], ["iptal", "İptal"]], geldi: [["tamamlandi", "Tamamla"]], tamamlandi: [], gelmedi: [], iptal: [] };
export default function QuickStatus({ id, status }: { id: number; status: string }) {
  const [pending, start] = useTransition(); const router = useRouter();
  const opts = NEXT[status] ?? [];
  if (!opts.length) return null;
  return <div className="flex justify-end gap-1">{opts.map(([v, l]) => <button key={v} disabled={pending} onClick={() => start(async () => { await setAppointmentStatus(id, v); router.refresh(); })} className={`btn-sm rounded-lg border px-2 py-1 text-xs font-semibold ${v === "iptal" || v === "gelmedi" ? "border-ink/10 text-ink2 hover:border-critical hover:text-critical" : "border-brand/30 text-brandDeep hover:bg-brand/10"}`}>{l}</button>)}</div>;
}
