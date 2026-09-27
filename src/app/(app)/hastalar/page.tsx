import Link from "next/link";
import { requireSession } from "@/lib/session";
import { scopeOf } from "@/lib/scope";
import { searchPatients, branches } from "@/lib/queries";
import { fmtDate } from "@/lib/time";
import PatientForm from "@/components/PatientForm";
import { CAN } from "@/lib/roles";
export const dynamic = "force-dynamic";
export const metadata = { title: "Hastalar" };
export default async function Page({ searchParams }: { searchParams: { q?: string } }) {
  const s = await requireSession(); const { branchId } = scopeOf(s);
  const q = searchParams.q ?? ""; const list = searchPatients(q, branchId, 100); const br = branches();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Hastalar</h1><p className="text-sm text-ink2">{list.length} kayıt{q ? ` · "${q}" için` : ""}</p></div><div className="flex gap-2"><form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Ad, telefon, kod…" className="input !w-56 !py-2" aria-label="Ara" /><button className="btn-outline btn-sm">Ara</button></form>{CAN.editPatients(s.role) && <PatientForm branches={br} defaultBranch={s.branchId ?? br[0]?.id} canPickBranch={s.role === "yonetici"} />}</div></div>
      <div className="card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-plane"><tr><th className="th">Kod</th><th className="th">Hasta</th><th className="th">Telefon</th><th className="th">Doğum</th><th className="th">Şube</th><th className="th">Alerji / not</th><th className="th">Kayıt</th></tr></thead><tbody>
        {list.length === 0 && <tr><td colSpan={7} className="td text-center text-muted">Kayıt bulunamadı.</td></tr>}
        {list.map((p) => <tr key={p.id} className="border-t border-ink/5 hover:bg-plane"><td className="td font-mono text-xs text-ink2">{p.code}</td><td className="td"><Link href={`/hastalar/${p.id}`} className="font-semibold hover:text-brand">{p.firstName} {p.lastName}</Link><div className="text-xs text-muted">{p.gender === "K" ? "Kadın" : p.gender === "E" ? "Erkek" : ""}</div></td><td className="td tabular-nums">{p.phone}</td><td className="td text-ink2">{p.birthDate ? fmtDate(p.birthDate, { day: "numeric", month: "short", year: "numeric" }) : "—"}</td><td className="td text-ink2">{br.find((b) => b.id === p.branchId)?.name}</td><td className="td text-xs">{p.allergies && <span className="chip bg-[#ec835a]/20 text-[#8a3d1b]">⚠ {p.allergies}</span>} {p.notes && <span className="text-ink2">{p.notes}</span>}</td><td className="td text-xs text-muted">{fmtDate(p.createdAt.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}</td></tr>)}
      </tbody></table></div>
    </div>
  );
}
