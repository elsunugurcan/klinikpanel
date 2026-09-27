import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { auditList } from "@/lib/queries";
import { CAN } from "@/lib/roles";
export const dynamic = "force-dynamic";
export const metadata = { title: "Denetim kaydı" };
const ACTION: Record<string, string> = { olustur: "Oluşturdu", guncelle: "Güncelledi", sil: "Sildi", giris: "Giriş yaptı", cikis: "Çıkış yaptı", giris_hatali: "Hatalı giriş", gonder: "Gönderdi", goruntule: "Görüntüledi" };
export default async function Page() {
  const s = await requireSession(); if (!CAN.audit(s.role)) redirect("/");
  const list = auditList(300);
  return (
    <div className="space-y-4"><div><h1 className="text-2xl font-bold">Denetim kaydı</h1><p className="text-sm text-ink2">KVKK uyumu için tüm oluşturma, güncelleme ve erişim işlemleri kullanıcı bazında kaydedilir.</p></div>
      <div className="card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-plane"><tr><th className="th">Zaman</th><th className="th">Kullanıcı</th><th className="th">İşlem</th><th className="th">Kayıt</th><th className="th">Detay</th></tr></thead><tbody>{list.map((l) => <tr key={l.id} className="border-t border-ink/5"><td className="td whitespace-nowrap text-ink2">{new Date(l.at + "Z").toLocaleString("tr-TR")}</td><td className="td font-semibold">{l.userName}</td><td className="td"><span className={`chip ${l.action === "giris_hatali" ? "bg-[#d03b3b]/12 text-[#9a2323]" : l.action === "olustur" ? "bg-[#0ca30c]/12 text-[#006300]" : "bg-ink/5 text-ink2"}`}>{ACTION[l.action] ?? l.action}</span></td><td className="td capitalize text-ink2">{l.entity}{l.entityId ? ` #${l.entityId}` : ""}</td><td className="td text-ink2">{l.details ?? ""}</td></tr>)}</tbody></table></div></div>
  );
}
