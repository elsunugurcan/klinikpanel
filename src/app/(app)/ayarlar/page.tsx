import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { branches, allServices, users, doctors } from "@/lib/queries";
import { CAN } from "@/lib/roles";
import SettingsPanels from "@/components/SettingsPanels";
export const dynamic = "force-dynamic";
export const metadata = { title: "Ayarlar" };
export default async function Page() {
  const s = await requireSession(); if (!CAN.settings(s.role)) redirect("/");
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold">Ayarlar</h1><p className="text-sm text-ink2">Şubeler, hizmet listesi ve kullanıcı yetkileri.</p></div><SettingsPanels branches={branches()} services={allServices()} users={users().map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, branchId: u.branchId, doctorId: u.doctorId, active: u.active }))} doctors={doctors().map((d) => ({ id: d.id, name: `${d.title} ${d.name}` }))} /></div>;
}
