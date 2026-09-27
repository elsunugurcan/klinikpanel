# KlinikPanel — Çok Şubeli Klinik Yönetim Sistemi

Klinikler için randevu, hasta, kasa, hatırlatma ve raporlama panosu (uurstudio portföyü, konsept ürün). Rol tabanlı erişim ve KVKK denetim kaydı ile gerçek bir SaaS panel gibi çalışır.

## Teknolojiler
- **Next.js 14** (App Router, Server Actions, Route Handler, Middleware) · **TypeScript**
- **Drizzle ORM + SQLite** — şube, kullanıcı, hekim, hizmet, hasta, randevu, tedavi, ödeme, hatırlatma, denetim tabloları
- **Kimlik doğrulama**: bcrypt parola özeti, HMAC-SHA256 imzalı oturum çerezi, middleware koruması, rol bazlı yetki (yönetici / hekim / resepsiyon)
- **Zod** — tüm form ve eylemlerde sunucu tarafı doğrulama
- **Recharts** — doğrulanmış (CVD-güvenli) palet, ince çubuklar, tooltip ve tablo görünümü
- **Vitest** — 11 birim testi (çakışma, mesai, doluluk, hatırlatma planı, rapor serileri, CSV, oturum imzası, yetkiler)
- **Playwright** — 3 rol için 30 kontrollük uçtan uca test + gerçek ekran görüntüleri
- **Tailwind CSS**

## Modüller
- **Özet**: bugünkü randevular, tahsilat, aylık ciro (önceki aya göre), gelmeme oranı, günlük tahsilat grafiği, hizmet dağılımı, hekim doluluğu, hızlı durum aksiyonları
- **Takvim**: hafta / gün (hekim sütunlu) görünümü, çakışma ve mesai kontrolü, **sürükle-bırak taşıma**, çift tıkla yeni randevu, blok tıklayarak durum değiştirme, şerit düzeni (aynı saatte birden çok randevu), "şimdi" çizgisi
- **Hastalar**: arama (ad/telefon/kod), kayıt formu, hasta dosyası (alerji uyarısı, tedavi geçmişi, ödemeler, bakiye, randevular)
- **Kasa**: tarih aralığı, yöntem dağılımı, ödeme alma (hasta seçici)
- **Hatırlatmalar**: randevudan 24 sa / 2 sa önce otomatik kuyruk, vadesi gelenleri gönderme, mesaj önizleme (SMS sağlayıcısına tek noktadan bağlanır)
- **Raporlar** (yönetici): 7/30/90 gün, önceki dönemle karşılaştırma, hekim/hizmet/şube kırılımı, haftanın günü, CSV dışa aktarma
- **Ayarlar** (yönetici): şube saatleri, hizmet ve fiyat listesi, kullanıcı ve roller
- **Denetim kaydı** (yönetici): kim, ne zaman, neyi oluşturdu/güncelledi; hatalı girişler
- Şube kapsamı: yönetici şube seçer veya tümünü görür; resepsiyon kendi şubesini; hekim yalnızca kendi takvimini ve hastalarını

## Kurulum
```bash
npm install
npm run db:setup     # şema + demo veri (2 şube, 5 hekim, 72 hasta, ~1.500 randevu, ~800 ödeme)
npm run dev          # http://localhost:3000
```
Demo hesaplar (parola `demo123`): `yonetici@klinikpanel.example`, `hekim@klinikpanel.example`, `resepsiyon@klinikpanel.example`, `mersin@klinikpanel.example`.

## Test
```bash
npm test                        # Vitest
npm run build && npm start      # ardından:
npm run test:e2e                # Playwright (screenshots/ klasörüne görseller)
```
Ortam değişkenleri: `SESSION_SECRET` (üretimde zorunlu), `DATABASE_PATH`. `npm run db:reset` demo veriyi sıfırlar.
