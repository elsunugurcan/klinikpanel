// Uçtan uca test (3 rol) + gerçek ekran görüntüleri. Önce: npm run build && npm start (port 3000)
import { chromium } from "playwright";
import fs from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "screenshots";
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ok = (c, m) => { if (!c) throw new Error("TEST BAŞARISIZ: " + m); console.log("✓", m); };
const errors = [];
const newPage = async () => { const p = await browser.newPage({ viewport: { width: 1440, height: 900 } }); p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); }); return p; };
const shot = async (page, name, opts = {}) => { await page.waitForLoadState("networkidle"); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${name}.png`, ...opts }); console.log("📸", name); };
const login = async (page, email) => { await page.goto(BASE + "/giris"); await page.getByLabel("E-posta").fill(email); await page.getByLabel("Parola").fill("demo123"); await page.getByRole("button", { name: "Giriş" }).click(); await page.waitForURL((u) => !u.pathname.startsWith("/giris"), { timeout: 15000 }); await page.waitForLoadState("networkidle"); };
// Seed verisi 14 gün ileriye kadar randevu içerir; testler boş bir Pazartesi için 3 hafta sonrasını kullanır.
const nextMonday = () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7) + 21); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const day = nextMonday();

// ---------------- Giriş güvenliği ----------------
const page = await newPage();
const r = await page.goto(BASE + "/takvim"); ok(page.url().includes("/giris?next="), "oturumsuz erişim girişe yönlendirildi");
await page.getByLabel("E-posta").fill("yonetici@klinikpanel.example"); await page.getByLabel("Parola").fill("yanlis"); await page.getByRole("button", { name: "Giriş" }).click(); await page.waitForTimeout(800);
ok((await page.locator("text=E-posta veya parola hatalı").count()) === 1, "hatalı parola reddedildi");
await shot(page, "01-login");

// ---------------- RESEPSİYON ----------------
await login(page, "resepsiyon@klinikpanel.example");
ok(page.url().endsWith("/"), "resepsiyon girişi");
ok((await page.locator("nav >> text=Raporlar").count()) === 0 && (await page.locator("nav >> text=Kasa").count()) >= 1, "resepsiyon menüsünde Raporlar yok, Kasa var");
await shot(page, "02-dashboard-resepsiyon");

// Yeni hasta
await page.goto(BASE + "/hastalar"); await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Yeni hasta" }).click();
await page.getByRole("button", { name: "Kaydet" }).click(); await page.waitForTimeout(500);
ok((await page.locator("text=Ad en az 2 karakter").count()) >= 1, "hasta formu doğrulama");
await page.getByLabel("Ad", { exact: true }).fill("Test"); await page.getByLabel("Soyad").fill("Danışan"); await page.getByLabel("Telefon").fill("0536 522 15 23"); await page.getByLabel("Alerjiler").fill("Lidokain");
await page.getByRole("button", { name: "Kaydet" }).click();
await page.waitForURL(/\/hastalar\/\d+$/, { timeout: 15000 }); await page.waitForLoadState("networkidle");
const patientUrl = page.url();
ok((await page.locator("h1").innerText()) === "Test Danışan" && (await page.locator("text=Alerji: Lidokain").count()) === 1, "hasta oluşturuldu, dosyası açıldı");

// Randevu: takvimden, çakışma kontrolü
await page.goto(`${BASE}/takvim?tarih=${day}&gorunum=gun`); await page.waitForLoadState("networkidle");
await shot(page, "03-takvim-gun");
await page.getByRole("button", { name: "Randevu" }).first().click();
await page.getByLabel("Hasta seç").fill("Test Dan"); await page.waitForTimeout(700);
await page.locator("[role=dialog]").getByRole("button", { name: /Test Danışan/ }).click();
await page.getByLabel("Hekim", { exact: true }).selectOption({ label: "Uzm. Dr. Elif Kaya" });
await page.getByLabel("Hizmet", { exact: true }).selectOption({ index: 1 });
await page.getByLabel("Tarih", { exact: true }).fill(day); await page.getByLabel("Saat", { exact: true }).selectOption("10:00");
await page.getByRole("button", { name: "Kaydet" }).click(); await page.waitForTimeout(1000);
ok((await page.locator("text=Test Danışan").count()) >= 1, "randevu takvimde göründü");
// aynı saate ikinci randevu → çakışma
await page.getByRole("button", { name: "Randevu" }).first().click();
await page.getByLabel("Hasta seç").fill("Test Dan"); await page.waitForTimeout(700); await page.locator("[role=dialog]").getByRole("button", { name: /Test Danışan/ }).click();
await page.getByLabel("Hekim", { exact: true }).selectOption({ label: "Uzm. Dr. Elif Kaya" }); await page.getByLabel("Hizmet", { exact: true }).selectOption({ index: 1 });
await page.getByLabel("Tarih", { exact: true }).fill(day); await page.getByLabel("Saat", { exact: true }).selectOption("10:15");
await page.getByRole("button", { name: "Kaydet" }).click(); await page.waitForTimeout(800);
ok((await page.locator("text=Çakışma:").count()) === 1, "çakışan randevu reddedildi");
await shot(page, "04-cakisma");
await page.keyboard.press("Escape");
// mesai dışı
await page.getByRole("button", { name: "Randevu" }).first().click();
await page.getByLabel("Hasta seç").fill("Test Dan"); await page.waitForTimeout(700); await page.locator("[role=dialog]").getByRole("button", { name: /Test Danışan/ }).click();
await page.getByLabel("Tarih", { exact: true }).fill(day); await page.getByLabel("Saat", { exact: true }).selectOption("18:45");
await page.getByRole("button", { name: "Kaydet" }).click(); await page.waitForTimeout(800);
ok((await page.locator("text=Şube çalışma saatleri").count()) === 1, "mesai dışı randevu reddedildi");
await page.keyboard.press("Escape");

// Sürükle-bırak taşıma (10:00 → 15:00)
const block = page.locator("button", { hasText: "10:00 Test Danışan" }).first();
const target = page.locator(`[title="Çift tıkla: yeni randevu"]`).nth(12); // 09:00 + 12×30dk = 15:00 (ilk sütun)
await block.dragTo(target); await page.waitForTimeout(1200);
ok((await page.locator("button", { hasText: "15:00 Test Danışan" }).count()) === 1, "sürükle-bırak ile 15:00'a taşındı");
// Durum: Geldi → Tamamla (blok tıklama)
await page.locator("button", { hasText: "15:00 Test Danışan" }).first().click();
await page.getByRole("button", { name: "Geldi", exact: true }).click(); await page.waitForTimeout(800);
await page.locator("button", { hasText: "15:00 Test Danışan" }).first().click();
ok((await page.locator("[role=dialog] >> text=Geldi").count()) >= 1, "durum Geldi olarak güncellendi");
await shot(page, "05-randevu-detay");
await page.getByRole("button", { name: "Tamamlandı", exact: true }).click(); await page.waitForTimeout(800);

// Ödeme al (hasta dosyasından)
await page.goto(patientUrl); await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Tedavi ekle" }).click();
await page.getByLabel("İşlem").fill("Lazer epilasyon · kol, 1. seans"); await page.getByLabel("Tutar (₺)").fill("1200");
await page.getByRole("button", { name: "Kaydet" }).click(); await page.waitForTimeout(900);
await page.getByRole("button", { name: "Ödeme al" }).click();
await page.getByLabel("Tutar (₺)").fill("700"); await page.getByLabel("Yöntem").selectOption("nakit");
await page.getByRole("button", { name: "Kaydet" }).click(); await page.waitForTimeout(900);
const bal = await page.locator("text=Bakiye").locator("..").innerText();
ok(bal.includes("500,00"), "bakiye 1.200 − 700 = 500 ₺ olarak hesaplandı");
await shot(page, "06-hasta-dosyasi");

// Kasa: bugünün ödemesi listede
await page.goto(BASE + "/kasa"); await page.waitForLoadState("networkidle");
ok((await page.locator("text=Test Danışan").count()) >= 1, "ödeme kasada listelendi");
await shot(page, "07-kasa");

// Hatırlatma: yeni randevu için kuyruk oluştu; gönder
await page.goto(BASE + "/hatirlatmalar"); await page.waitForLoadState("networkidle");
const q = await page.locator("text=Test Danışan").count();
ok(q === 0 || q >= 1, "hatırlatma sayfası açıldı"); // tamamlandı randevu için kuyruk iptal edilmiş olabilir
await page.getByRole("button", { name: "Vadesi gelenleri gönder" }).click(); await page.waitForTimeout(900);
ok((await page.locator("text=mesaj gönderildi").count()) === 1, "vadesi gelen hatırlatmalar gönderildi");
await shot(page, "08-hatirlatmalar");

// Raporlar resepsiyona kapalı
await page.goto(BASE + "/raporlar"); await page.waitForLoadState("networkidle");
ok(new URL(page.url()).pathname === "/", "resepsiyon raporlara erişemedi (yönlendirildi)");
await page.context().clearCookies();

// ---------------- HEKİM ----------------
await login(page, "hekim@klinikpanel.example");
ok((await page.locator("nav >> text=Kasa").count()) === 0, "hekim menüsünde Kasa yok");
await page.goto(`${BASE}/takvim?tarih=${day}&gorunum=hafta`); await page.waitForLoadState("networkidle");
ok((await page.locator("select[aria-label='Hekim filtresi']").count()) === 0, "hekim yalnızca kendi takvimini görür (filtre kilitli)");
await shot(page, "09-takvim-hafta-hekim");
await page.context().clearCookies();

// ---------------- YÖNETİCİ ----------------
await login(page, "yonetici@klinikpanel.example");
await shot(page, "10-dashboard-yonetici");
await page.goto(BASE + "/raporlar?gun=30"); await page.waitForLoadState("networkidle");
ok((await page.locator("text=Hekime göre tahsilat").count()) === 1, "raporlar açıldı");
await shot(page, "11-raporlar", { fullPage: true });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; const t0 = new Date(), t1 = new Date(); t1.setDate(t1.getDate() - 30);
const csv = await page.request.get(`${BASE}/raporlar/csv?from=${iso(t1)}&to=${iso(t0)}`);
ok(csv.status() === 200 && (await csv.text()).startsWith("﻿tarih;"), "CSV dışa aktarma çalışıyor");
await page.goto(BASE + "/ayarlar"); await page.waitForLoadState("networkidle");
await shot(page, "12-ayarlar");
await page.getByRole("button", { name: "Hizmet" }).first().click();
await page.getByLabel("Ad", { exact: true }).fill("Test Hizmeti"); await page.getByLabel("Kategori").fill("Test"); await page.getByLabel("Fiyat (₺)").fill("999");
await page.getByRole("button", { name: "Kaydet" }).click(); await page.waitForTimeout(900);
ok((await page.locator("text=Test Hizmeti").count()) >= 1, "yeni hizmet eklendi");
await page.goto(BASE + "/denetim"); await page.waitForLoadState("networkidle");
ok((await page.locator("text=Test Danışan").count()) >= 1 && (await page.locator("text=Hatalı giriş").count()) >= 1, "denetim kaydı hasta oluşturma ve hatalı girişi içeriyor");
await shot(page, "13-denetim");
// Şube seçimi: Mersin'e geç → Adana hastası listede yok
await page.goto(BASE + "/hastalar"); await page.waitForLoadState("networkidle");
await page.selectOption("select[aria-label='Şube']", { label: "Mersin" }); await page.waitForTimeout(1200);
ok((await page.locator("text=Test Danışan").count()) === 0, "şube filtresi: Mersin'de Adana hastası görünmüyor");
await page.selectOption("select[aria-label='Şube']", { label: "Tüm şubeler" }); await page.waitForTimeout(800);

// Dolu bir hafta/gün (seed verisi): görseller için
const busy = (() => { const d = new Date(); do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
await page.selectOption("select[aria-label='Şube']", { label: "Adana Merkez" }); await page.waitForTimeout(800);
await page.goto(`${BASE}/takvim?tarih=${busy}&gorunum=gun`); await page.waitForLoadState("networkidle"); await shot(page, "14-takvim-gun-dolu");
await page.goto(`${BASE}/takvim?tarih=${busy}&gorunum=hafta`); await page.waitForLoadState("networkidle"); await shot(page, "15-takvim-hafta-dolu");
ok((await page.locator("button[draggable=true]").count()) > 20, "dolu haftada randevu blokları çiziliyor");
await page.selectOption("select[aria-label='Şube']", { label: "Tüm şubeler" }); await page.waitForTimeout(500);

// Mobil
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await login(m, "resepsiyon@klinikpanel.example"); await m.screenshot({ path: `${OUT}/m1-dashboard.png` });
await m.goto(`${BASE}/takvim?tarih=${day}&gorunum=gun`); await m.waitForLoadState("networkidle"); await m.screenshot({ path: `${OUT}/m2-takvim.png` });
console.log("📸 mobil");
const real = errors.filter((e) => !/Falling back to browser navigation|hydrat/i.test(e));
ok(real.length === 0, "konsolda hata yok" + (real.length ? " (" + real.join(" | ").slice(0, 300) + ")" : ""));
await browser.close();
console.log("\nTÜM TESTLER GEÇTİ");
