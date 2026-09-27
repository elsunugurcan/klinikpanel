"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, CalendarDays, Users, Wallet, BarChart3, BellRing, Settings, ScrollText, LogOut, Search, Menu, X, Building2 } from "lucide-react";
import { CAN, type Session } from "@/lib/roles";
import { logout } from "@/app/actions";

type Branch = { id: number; name: string };
export default function AppShell({ session, branches, activeBranch, children }: { session: Session; branches: Branch[]; activeBranch: number | null; children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const [open, setOpen] = useState(false); const [q, setQ] = useState("");
  const nav = [
    { href: "/", label: "Özet", Icon: LayoutDashboard }, { href: "/takvim", label: "Takvim", Icon: CalendarDays }, { href: "/hastalar", label: "Hastalar", Icon: Users },
    ...(CAN.payments(session.role) ? [{ href: "/kasa", label: "Kasa", Icon: Wallet }] : []),
    { href: "/hatirlatmalar", label: "Hatırlatmalar", Icon: BellRing },
    ...(CAN.reports(session.role) ? [{ href: "/raporlar", label: "Raporlar", Icon: BarChart3 }] : []),
    ...(CAN.settings(session.role) ? [{ href: "/ayarlar", label: "Ayarlar", Icon: Settings }, { href: "/denetim", label: "Denetim kaydı", Icon: ScrollText }] : []),
  ];
  const roleLabel = { yonetici: "Yönetici", hekim: "Hekim", resepsiyon: "Resepsiyon" }[session.role];
  const Nav = () => <nav className="flex flex-col gap-1">{nav.map((n) => { const active = n.href === "/" ? path === "/" : path.startsWith(n.href); return <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`navlink ${active ? "navlink-active" : ""}`}><n.Icon size={18} /> {n.label}</Link>; })}</nav>;
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink/10 bg-surface p-4 lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg></span><span className="text-lg font-bold tracking-tight">Klinik<span className="text-brand">Panel</span></span></Link>
        <Nav />
        <div className="mt-auto rounded-xl bg-plane p-3 text-xs"><div className="font-semibold">{session.name}</div><div className="text-muted">{roleLabel}</div><form action={logout}><button className="mt-2 flex items-center gap-1 text-ink2 hover:text-ink"><LogOut size={14} /> Çıkış</button></form></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink/10 bg-surface/90 px-4 backdrop-blur">
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menü">{open ? <X size={20} /> : <Menu size={20} />}</button>
          <form className="relative flex-1 max-w-md" onSubmit={(e) => { e.preventDefault(); router.push(`/hastalar?q=${encodeURIComponent(q)}`); }}><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hasta ara: ad, telefon, kod…" className="input !py-2 !pl-9" aria-label="Hasta ara" /></form>
          {CAN.allBranches(session.role) ? (
            <div className="flex items-center gap-1 text-sm"><Building2 size={16} className="text-muted" /><select value={activeBranch ?? 0} onChange={(e) => { document.cookie = `kp_branch=${e.target.value}; path=/; max-age=31536000`; router.refresh(); }} className="input !w-auto !py-1.5 text-xs" aria-label="Şube"><option value={0}>Tüm şubeler</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          ) : <span className="chip bg-ink/5 text-ink2"><Building2 size={12} /> {branches.find((b) => b.id === session.branchId)?.name}</span>}
          <Link href="/takvim?yeni=1" className="btn-primary btn-sm hidden sm:inline-flex">+ Randevu</Link>
        </header>
        {open && <div className="border-b border-ink/10 bg-surface p-4 lg:hidden"><Nav /><form action={logout}><button className="navlink mt-2"><LogOut size={18} /> Çıkış</button></form></div>}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
