import LoginForm from "./LoginForm";
export const metadata = { title: "Giriş" };
export default function Page({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand"><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg></span><span className="text-xl font-bold">Klinik<span className="text-[#86b6ef]">Panel</span></span></div>
        <div><h1 className="text-4xl font-bold leading-tight">Randevudan kasaya, tek panel.</h1><p className="mt-4 max-w-md text-white/70">Çok şubeli klinikler için randevu takvimi, hasta dosyası, tahsilat, hatırlatma ve raporlama. Rol bazlı erişim, KVKK denetim kaydı.</p>
          <ul className="mt-8 grid grid-cols-2 gap-3 text-sm text-white/80">{["Çakışma kontrollü takvim", "Sürükle-bırak randevu", "SMS / WhatsApp hatırlatma", "Şube bazlı raporlar", "Hasta bakiye takibi", "Denetim kaydı (KVKK)"].map((t) => <li key={t} className="rounded-lg bg-white/5 px-3 py-2">✓ {t}</li>)}</ul></div>
        <div className="text-xs text-white/40">Konsept ürün · uurstudio</div>
      </div>
      <div className="flex items-center justify-center p-6"><div className="w-full max-w-sm"><h2 className="text-2xl font-bold">Giriş yap</h2><p className="mt-1 text-sm text-ink2">Demo hesaplar (parola <code className="rounded bg-ink/5 px-1">demo123</code>):</p>
        <ul className="mt-2 space-y-1 text-xs text-ink2"><li><b>yonetici@klinikpanel.example</b> — tüm şubeler, raporlar, ayarlar</li><li><b>hekim@klinikpanel.example</b> — kendi takvimi ve hastaları</li><li><b>resepsiyon@klinikpanel.example</b> — Adana şubesi randevu ve kasa</li></ul>
        <LoginForm next={searchParams.next} /></div></div>
    </div>
  );
}
