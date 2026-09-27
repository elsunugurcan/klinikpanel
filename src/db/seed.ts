import { db, schema } from "./index";
import { hashPassword } from "@/lib/auth";
import { addDaysISO, toISODate, toHHMM } from "@/lib/time";
import { planReminders } from "@/lib/reminders";
import { findConflict } from "@/lib/availability";

// Deterministik rastgele (mulberry32) — her kurulumda aynı demo verisi
let a = 20260927 >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];

const FIRST_F = ["Ayşe", "Elif", "Zeynep", "Merve", "Selin", "Büşra", "Ceren", "Derya", "Esra", "Gizem", "Hande", "İrem", "Melis", "Nazlı", "Pınar", "Seda", "Tuğba", "Yasemin", "Beyza", "Dilara"];
const FIRST_M = ["Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Emre", "Burak", "Can", "Cem", "Kerem", "Murat", "Onur", "Serkan", "Tolga", "Umut", "Volkan", "Yusuf", "Barış", "Eren", "Furkan"];
const LAST = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Aydın", "Öztürk", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt", "Özdemir", "Polat", "Şimşek", "Taş"];

async function main() {
  if (db.select().from(schema.branches).all().length) { console.log("· veriler zaten var"); return; }
  db.insert(schema.branches).values([{ name: "Adana Merkez", city: "Adana", phone: "0322 000 00 01", openHour: 9, closeHour: 19 }, { name: "Mersin", city: "Mersin", phone: "0324 000 00 02", openHour: 10, closeHour: 18 }]).run();
  db.insert(schema.doctors).values([
    { name: "Elif Kaya", title: "Uzm. Dr.", specialty: "Dermatoloji", branchId: 1, color: "#0f766e" },
    { name: "Mert Aydın", title: "Op. Dr.", specialty: "Plastik Cerrahi", branchId: 1, color: "#2563eb" },
    { name: "Selin Arslan", title: "Dr.", specialty: "Medikal Estetik", branchId: 1, color: "#db2777" },
    { name: "Kerem Demir", title: "Uzm. Dr.", specialty: "Dermatoloji", branchId: 2, color: "#d97706" },
    { name: "Nazlı Koç", title: "Dr.", specialty: "Medikal Estetik", branchId: 2, color: "#7c3aed" },
  ]).run();
  db.insert(schema.services).values([
    { name: "Dermatoloji Muayenesi", category: "Muayene", duration: 20, price: 150000 }, { name: "Lazer Epilasyon (bölge)", category: "Lazer", duration: 30, price: 120000 },
    { name: "Hydrafacial", category: "Cilt Bakımı", duration: 45, price: 250000 }, { name: "Kimyasal Peeling", category: "Cilt Bakımı", duration: 30, price: 180000 },
    { name: "Dudak Dolgusu", category: "Estetik", duration: 30, price: 650000 }, { name: "Botulinum (3 bölge)", category: "Estetik", duration: 20, price: 550000 },
    { name: "Mezoterapi", category: "Estetik", duration: 30, price: 220000 }, { name: "Saç Ekimi Konsültasyonu", category: "Saç", duration: 30, price: 0 }, { name: "PRP", category: "Saç", duration: 40, price: 300000 },
  ]).run();
  const pass = hashPassword("demo123");
  db.insert(schema.users).values([
    { name: "Ayşe Yılmaz", email: "yonetici@klinikpanel.example", passwordHash: pass, role: "yonetici", branchId: 1, doctorId: null },
    { name: "Elif Kaya", email: "hekim@klinikpanel.example", passwordHash: pass, role: "hekim", branchId: 1, doctorId: 1 },
    { name: "Deniz Acar", email: "resepsiyon@klinikpanel.example", passwordHash: pass, role: "resepsiyon", branchId: 1, doctorId: null },
    { name: "Burcu Sarı", email: "mersin@klinikpanel.example", passwordHash: pass, role: "resepsiyon", branchId: 2, doctorId: null },
  ]).run();

  // Hastalar
  const patients: { id: number; branchId: number; name: string }[] = [];
  for (let i = 0; i < 72; i++) {
    const g = rnd() < 0.62 ? "K" : "E";
    const first = g === "K" ? pick(FIRST_F) : pick(FIRST_M), last = pick(LAST);
    const branchId = rnd() < 0.7 ? 1 : 2;
    const yr = 1965 + Math.floor(rnd() * 40);
    const r = db.insert(schema.patients).values({ code: `HK-${String(1000 + i)}`, firstName: first, lastName: last, phone: `05${Math.floor(300000000 + rnd() * 99999999)}`, email: rnd() < 0.6 ? `${first.toLocaleLowerCase("tr-TR").replace(/[^a-z]/g, "")}.${last.toLocaleLowerCase("tr-TR").replace(/[^a-z]/g, "")}@ornek.com` : null,
      birthDate: `${yr}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 28)).padStart(2, "0")}`, gender: g, allergies: rnd() < 0.15 ? pick(["Penisilin", "Lidokain", "Lateks", "Polen"]) : null, notes: rnd() < 0.2 ? pick(["Hamilelik planlıyor", "Kan sulandırıcı kullanıyor", "Keloid öyküsü", "Fotosensitif ilaç"]) : null, branchId,
      createdAt: `${addDaysISO(toISODate(new Date()), -Math.floor(rnd() * 400))} 10:00:00` }).returning({ id: schema.patients.id }).get();
    patients.push({ id: r.id, branchId, name: `${first} ${last}` });
  }

  // Randevular: son 60 gün + gelecek 14 gün
  const doctors = db.select().from(schema.doctors).all(), services = db.select().from(schema.services).all(), branches = db.select().from(schema.branches).all();
  const today = toISODate(new Date()); const now = new Date();
  let created = 0, paymentsN = 0;
  for (let off = -60; off <= 14; off++) {
    const date = addDaysISO(today, off);
    const wd = new Date(date + "T12:00:00").getDay();
    if (wd === 0) continue;
    for (const d of doctors) {
      const b = branches.find((x) => x.id === d.branchId)!;
      const n = wd === 6 ? 2 + Math.floor(rnd() * 3) : 4 + Math.floor(rnd() * 5);
      const dayAppts: { id: number; start: string; duration: number; status: string }[] = [];
      for (let k = 0; k < n; k++) {
        const s = pick(services); const start = toHHMM(b.openHour * 60 + 30 * Math.floor(rnd() * ((b.closeHour - b.openHour) * 2 - 2)));
        if (findConflict(dayAppts, start, s.duration)) continue;
        const p = pick(patients.filter((x) => x.branchId === d.branchId));
        let status = "planlandi";
        if (off < 0) { const r = rnd(); status = r < 0.78 ? "tamamlandi" : r < 0.88 ? "gelmedi" : "iptal"; }
        else if (off === 0) { const r = rnd(); status = r < 0.5 ? "tamamlandi" : r < 0.65 ? "geldi" : r < 0.9 ? "onaylandi" : "planlandi"; }
        else status = rnd() < 0.6 ? "onaylandi" : "planlandi";
        const r = db.insert(schema.appointments).values({ branchId: d.branchId, doctorId: d.id, patientId: p.id, serviceId: s.id, date, start, duration: s.duration, status, note: rnd() < 0.15 ? pick(["Kontrol", "2. seans", "İlk görüşme", "Ağrı hassasiyeti var"]) : null, createdBy: 3, createdAt: `${addDaysISO(date, -Math.floor(rnd() * 10))} 11:00:00` }).returning({ id: schema.appointments.id }).get();
        dayAppts.push({ id: r.id, start, duration: s.duration, status }); created++;
        if (status === "tamamlandi" && s.price > 0) {
          db.insert(schema.treatments).values({ patientId: p.id, doctorId: d.id, appointmentId: r.id, date, title: s.name, notes: rnd() < 0.3 ? "Sorunsuz tamamlandı, kontrol 4 hafta sonra." : null, price: s.price }).run();
          const partial = rnd() < 0.12;
          db.insert(schema.payments).values({ branchId: d.branchId, patientId: p.id, appointmentId: r.id, amount: partial ? Math.round(s.price / 2 / 100) * 100 : s.price, method: pick(["kart", "kart", "nakit", "havale"]), date, createdBy: 3 }).run(); paymentsN++;
        }
        if (off >= 0 && (status === "planlandi" || status === "onaylandi")) {
          for (const pr of planReminders(date, start, now)) db.insert(schema.reminders).values({ appointmentId: r.id, channel: rnd() < 0.7 ? "sms" : "whatsapp", kind: pr.kind, scheduledAt: pr.scheduledAt }).run();
        }
      }
    }
  }
  db.insert(schema.auditLogs).values([
    { userId: 1, userName: "Ayşe Yılmaz", action: "giris", entity: "oturum", details: "Yönetici girişi" },
    { userId: 3, userName: "Deniz Acar", action: "olustur", entity: "hasta", entityId: patients[0].id, details: patients[0].name },
    { userId: 3, userName: "Deniz Acar", action: "olustur", entity: "randevu", entityId: 1, details: "Web üzerinden alındı" },
  ]).run();
  console.log(`✓ 2 şube, 5 hekim, 9 hizmet, 4 kullanıcı, ${patients.length} hasta, ${created} randevu, ${paymentsN} ödeme`);
}
main();
