"use server";
import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashPassword, signSession, verifyPassword, CAN } from "@/lib/auth";
import { COOKIE, audit, getSession, requireSession } from "@/lib/session";
import { findConflict, isWithinHours } from "@/lib/availability";
import { planReminders, isDue } from "@/lib/reminders";
import { appointmentsOfDoctor } from "@/lib/queries";
import { STATUSES } from "@/db/schema";

export type Errors = Record<string, string>;
const zerr = (e: z.ZodError): Errors => { const o: Errors = {}; for (const i of e.issues) o[String(i.path[0] ?? "form")] = i.message; return o; };
const phone = z.string().transform((v) => v.replace(/[\s\-()]/g, "")).pipe(z.string().regex(/^(\+90|0)?5\d{9}$/, "Telefon 05xx xxx xx xx biçiminde olmalı"));

// ---------------- Oturum ----------------
export async function login(_prev: { error?: string } | null, fd: FormData): Promise<{ error?: string }> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase(), password = String(fd.get("password") ?? "");
  const u = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (!u || !u.active || !verifyPassword(password, u.passwordHash)) { await audit(null, "giris_hatali", "oturum", null, email); return { error: "E-posta veya parola hatalı." }; }
  const token = signSession({ uid: u.id, name: u.name, role: u.role as "yonetici", branchId: u.branchId, doctorId: u.doctorId });
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 10 * 3600 });
  await audit({ uid: u.id, name: u.name, role: u.role as "yonetici", branchId: u.branchId, doctorId: u.doctorId, exp: 0 }, "giris", "oturum", null, u.role);
  redirect(String(fd.get("next") || "/"));
}
export async function logout() { const s = await getSession(); await audit(s, "cikis", "oturum"); cookies().delete(COOKIE); redirect("/giris"); }

// ---------------- Hastalar ----------------
const patientSchema = z.object({
  firstName: z.string().trim().min(2, "Ad en az 2 karakter"), lastName: z.string().trim().min(2, "Soyad en az 2 karakter"), phone,
  email: z.string().trim().email("Geçerli e-posta").optional().or(z.literal("")), birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  gender: z.enum(["K", "E", "-"]).optional(), allergies: z.string().trim().max(200).optional(), notes: z.string().trim().max(1000).optional(), branchId: z.coerce.number().int().positive(),
});
export async function savePatient(id: number | null, raw: unknown): Promise<{ ok: true; id: number } | { ok: false; errors: Errors }> {
  const s = await requireSession();
  if (!CAN.editPatients(s.role)) return { ok: false, errors: { form: "Bu işlem için yetkiniz yok." } };
  const p = patientSchema.safeParse(raw); if (!p.success) return { ok: false, errors: zerr(p.error) };
  const d = p.data; const branchId = s.role === "yonetici" ? d.branchId : (s.branchId ?? d.branchId);
  const values = { firstName: d.firstName, lastName: d.lastName, phone: d.phone.replace(/^\+90/, "0").replace(/^5/, "05"), email: d.email || null, birthDate: d.birthDate || null, gender: d.gender ?? "-", allergies: d.allergies || null, notes: d.notes || null, branchId };
  let pid = id;
  if (id) { db.update(schema.patients).set(values).where(eq(schema.patients.id, id)).run(); await audit(s, "guncelle", "hasta", id, `${d.firstName} ${d.lastName}`); }
  else { const n = db.select({ c: schema.patients.id }).from(schema.patients).all().length; pid = db.insert(schema.patients).values({ ...values, code: `HK-${1000 + n}` }).returning({ id: schema.patients.id }).get().id; await audit(s, "olustur", "hasta", pid, `${d.firstName} ${d.lastName}`); }
  revalidatePath("/hastalar"); revalidatePath(`/hastalar/${pid}`);
  return { ok: true, id: pid! };
}
export async function addTreatment(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const s = await requireSession();
  const p = z.object({ patientId: z.number().int(), doctorId: z.number().int(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), title: z.string().trim().min(2, "Başlık gerekli"), notes: z.string().trim().max(2000).optional(), price: z.coerce.number().min(0), appointmentId: z.number().int().optional().nullable() }).safeParse(raw);
  if (!p.success) return { ok: false, error: Object.values(zerr(p.error))[0] };
  const d = p.data;
  db.insert(schema.treatments).values({ patientId: d.patientId, doctorId: d.doctorId, date: d.date, title: d.title, notes: d.notes || null, price: Math.round(d.price * 100), appointmentId: d.appointmentId ?? null }).run();
  await audit(s, "olustur", "tedavi", d.patientId, d.title);
  revalidatePath(`/hastalar/${d.patientId}`); return { ok: true };
}

// ---------------- Randevular ----------------
const apptSchema = z.object({
  patientId: z.number().int().positive("Hasta seçin"), doctorId: z.number().int().positive("Hekim seçin"), serviceId: z.number().int().positive("Hizmet seçin"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih seçin"), start: z.string().regex(/^\d{2}:\d{2}$/, "Saat seçin"), note: z.string().trim().max(300).optional(),
});
export async function saveAppointment(id: number | null, raw: unknown): Promise<{ ok: true; id: number } | { ok: false; errors: Errors }> {
  const s = await requireSession();
  const p = apptSchema.safeParse(raw); if (!p.success) return { ok: false, errors: zerr(p.error) };
  const d = p.data;
  const doctor = db.select().from(schema.doctors).where(eq(schema.doctors.id, d.doctorId)).get();
  const service = db.select().from(schema.services).where(eq(schema.services.id, d.serviceId)).get();
  const pat = db.select().from(schema.patients).where(eq(schema.patients.id, d.patientId)).get();
  if (!doctor || !service || !pat) return { ok: false, errors: { form: "Kayıt bulunamadı." } };
  if (s.role === "hekim" && s.doctorId !== d.doctorId) return { ok: false, errors: { form: "Yalnızca kendi randevularınızı düzenleyebilirsiniz." } };
  if (s.role !== "yonetici" && s.branchId !== doctor.branchId) return { ok: false, errors: { form: "Bu hekim başka bir şubede." } };
  const branch = db.select().from(schema.branches).where(eq(schema.branches.id, doctor.branchId)).get()!;
  if (!isWithinHours(branch.openHour, branch.closeHour, d.start, service.duration)) return { ok: false, errors: { start: `Şube çalışma saatleri ${String(branch.openHour).padStart(2, "0")}:00–${String(branch.closeHour).padStart(2, "0")}:00` } };
  const conflict = findConflict(appointmentsOfDoctor(d.doctorId, d.date), d.start, service.duration, id ?? undefined);
  if (conflict) return { ok: false, errors: { start: `Çakışma: ${doctor.name} ${conflict.start}'da ${conflict.duration} dk dolu.` } };
  const values = { branchId: doctor.branchId, doctorId: d.doctorId, patientId: d.patientId, serviceId: d.serviceId, date: d.date, start: d.start, duration: service.duration, note: d.note || null };
  let aid = id;
  if (id) {
    db.update(schema.appointments).set(values).where(eq(schema.appointments.id, id)).run();
    db.update(schema.reminders).set({ status: "iptal" }).where(and(eq(schema.reminders.appointmentId, id), eq(schema.reminders.status, "bekliyor"))).run();
    await audit(s, "guncelle", "randevu", id, `${pat.firstName} ${pat.lastName} · ${d.date} ${d.start}`);
  } else {
    aid = db.insert(schema.appointments).values({ ...values, status: "planlandi", createdBy: s.uid }).returning({ id: schema.appointments.id }).get().id;
    await audit(s, "olustur", "randevu", aid, `${pat.firstName} ${pat.lastName} · ${service.name} · ${d.date} ${d.start}`);
  }
  for (const r of planReminders(d.date, d.start, new Date())) db.insert(schema.reminders).values({ appointmentId: aid!, channel: "sms", kind: r.kind, scheduledAt: r.scheduledAt }).run();
  revalidatePath("/takvim"); revalidatePath("/"); revalidatePath("/hatirlatmalar");
  return { ok: true, id: aid! };
}
export async function setAppointmentStatus(id: number, status: string): Promise<{ ok: boolean; error?: string }> {
  const s = await requireSession();
  if (!(STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Geçersiz durum" };
  const a = db.select().from(schema.appointments).where(eq(schema.appointments.id, id)).get();
  if (!a) return { ok: false, error: "Randevu yok" };
  if (s.role === "hekim" && s.doctorId !== a.doctorId) return { ok: false, error: "Yetki yok" };
  db.update(schema.appointments).set({ status }).where(eq(schema.appointments.id, id)).run();
  if (status === "iptal" || status === "gelmedi") db.update(schema.reminders).set({ status: "iptal" }).where(and(eq(schema.reminders.appointmentId, id), eq(schema.reminders.status, "bekliyor"))).run();
  await audit(s, "guncelle", "randevu", id, `durum → ${status}`);
  revalidatePath("/takvim"); revalidatePath("/"); revalidatePath("/hatirlatmalar");
  return { ok: true };
}
/** Sürükle-bırak: yalnızca saat/gün değişir, çakışma yeniden kontrol edilir. */
export async function rescheduleAppointment(id: number, date: string, start: string): Promise<{ ok: boolean; error?: string }> {
  const s = await requireSession();
  const a = db.select().from(schema.appointments).where(eq(schema.appointments.id, id)).get();
  if (!a) return { ok: false, error: "Randevu yok" };
  if (s.role === "hekim" && s.doctorId !== a.doctorId) return { ok: false, error: "Yetki yok" };
  const branch = db.select().from(schema.branches).where(eq(schema.branches.id, a.branchId)).get()!;
  if (!isWithinHours(branch.openHour, branch.closeHour, start, a.duration)) return { ok: false, error: "Çalışma saatleri dışında." };
  const conflict = findConflict(appointmentsOfDoctor(a.doctorId, date), start, a.duration, id);
  if (conflict) return { ok: false, error: `Çakışma: ${conflict.start}'da ${conflict.duration} dk dolu.` };
  db.update(schema.appointments).set({ date, start }).where(eq(schema.appointments.id, id)).run();
  db.update(schema.reminders).set({ status: "iptal" }).where(and(eq(schema.reminders.appointmentId, id), eq(schema.reminders.status, "bekliyor"))).run();
  for (const r of planReminders(date, start, new Date())) db.insert(schema.reminders).values({ appointmentId: id, channel: "sms", kind: r.kind, scheduledAt: r.scheduledAt }).run();
  await audit(s, "guncelle", "randevu", id, `taşındı → ${date} ${start}`);
  revalidatePath("/takvim"); revalidatePath("/"); return { ok: true };
}

// ---------------- Kasa ----------------
export async function addPayment(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const s = await requireSession();
  if (!CAN.payments(s.role)) return { ok: false, error: "Yetki yok" };
  const p = z.object({ patientId: z.number().int(), appointmentId: z.number().int().nullable().optional(), amount: z.coerce.number().positive("Tutar 0'dan büyük olmalı"), method: z.enum(["nakit", "kart", "havale"]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().trim().max(200).optional() }).safeParse(raw);
  if (!p.success) return { ok: false, error: Object.values(zerr(p.error))[0] };
  const d = p.data; const pat = db.select().from(schema.patients).where(eq(schema.patients.id, d.patientId)).get(); if (!pat) return { ok: false, error: "Hasta yok" };
  db.insert(schema.payments).values({ branchId: pat.branchId, patientId: d.patientId, appointmentId: d.appointmentId ?? null, amount: Math.round(d.amount * 100), method: d.method, date: d.date, note: d.note || null, createdBy: s.uid }).run();
  await audit(s, "olustur", "odeme", d.patientId, `${d.amount} ₺ ${d.method}`);
  revalidatePath("/kasa"); revalidatePath(`/hastalar/${d.patientId}`); revalidatePath("/"); return { ok: true };
}

// ---------------- Hatırlatmalar ----------------
/** Vadesi gelen hatırlatmaları "gönderir" (SMS sağlayıcısı entegrasyonu için tek nokta). */
export async function sendDueReminders(): Promise<{ sent: number }> {
  const s = await requireSession();
  const now = new Date();
  const due = db.select().from(schema.reminders).where(eq(schema.reminders.status, "bekliyor")).all().filter((r) => isDue(r.scheduledAt, now));
  for (const r of due) db.update(schema.reminders).set({ status: "gonderildi", sentAt: now.toISOString() }).where(eq(schema.reminders.id, r.id)).run();
  if (due.length) await audit(s, "gonder", "hatirlatma", null, `${due.length} mesaj`);
  revalidatePath("/hatirlatmalar"); return { sent: due.length };
}
export async function sendReminderNow(id: number): Promise<{ ok: boolean }> {
  const s = await requireSession();
  db.update(schema.reminders).set({ status: "gonderildi", sentAt: new Date().toISOString() }).where(and(eq(schema.reminders.id, id), ne(schema.reminders.status, "gonderildi"))).run();
  await audit(s, "gonder", "hatirlatma", id); revalidatePath("/hatirlatmalar"); return { ok: true };
}

// ---------------- Ayarlar ----------------
export async function saveService(id: number | null, raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const s = await requireSession(); if (!CAN.settings(s.role)) return { ok: false, error: "Yetki yok" };
  const p = z.object({ name: z.string().trim().min(2, "Ad gerekli"), category: z.string().trim().min(2, "Kategori gerekli"), duration: z.coerce.number().int().min(5).max(480), price: z.coerce.number().min(0), active: z.boolean().optional() }).safeParse(raw);
  if (!p.success) return { ok: false, error: Object.values(zerr(p.error))[0] };
  const d = p.data; const v = { name: d.name, category: d.category, duration: d.duration, price: Math.round(d.price * 100), active: d.active ?? true };
  if (id) db.update(schema.services).set(v).where(eq(schema.services.id, id)).run(); else db.insert(schema.services).values(v).run();
  await audit(s, id ? "guncelle" : "olustur", "hizmet", id, d.name); revalidatePath("/ayarlar"); return { ok: true };
}
export async function saveUser(id: number | null, raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const s = await requireSession(); if (!CAN.settings(s.role)) return { ok: false, error: "Yetki yok" };
  const p = z.object({ name: z.string().trim().min(2), email: z.string().trim().email("Geçerli e-posta"), role: z.enum(["yonetici", "hekim", "resepsiyon"]), branchId: z.coerce.number().int().nullable(), doctorId: z.coerce.number().int().nullable().optional(), password: z.string().min(6, "Parola en az 6 karakter").optional().or(z.literal("")), active: z.boolean().optional() }).safeParse(raw);
  if (!p.success) return { ok: false, error: Object.values(zerr(p.error))[0] };
  const d = p.data;
  const v: Partial<typeof schema.users.$inferInsert> = { name: d.name, email: d.email.toLowerCase(), role: d.role, branchId: d.branchId, doctorId: d.role === "hekim" ? d.doctorId ?? null : null, active: d.active ?? true };
  if (d.password) v.passwordHash = hashPassword(d.password);
  if (id) db.update(schema.users).set(v).where(eq(schema.users.id, id)).run();
  else { if (!d.password) return { ok: false, error: "Yeni kullanıcı için parola gerekli" }; db.insert(schema.users).values(v as typeof schema.users.$inferInsert).run(); }
  await audit(s, id ? "guncelle" : "olustur", "kullanici", id, d.email); revalidatePath("/ayarlar"); return { ok: true };
}
export async function saveBranch(id: number, raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const s = await requireSession(); if (!CAN.settings(s.role)) return { ok: false, error: "Yetki yok" };
  const p = z.object({ name: z.string().trim().min(2), city: z.string().trim().min(2), phone: z.string().trim().min(7), openHour: z.coerce.number().int().min(0).max(23), closeHour: z.coerce.number().int().min(1).max(24) }).refine((v) => v.closeHour > v.openHour, { message: "Kapanış açılıştan sonra olmalı", path: ["closeHour"] }).safeParse(raw);
  if (!p.success) return { ok: false, error: Object.values(zerr(p.error))[0] };
  db.update(schema.branches).set(p.data).where(eq(schema.branches.id, id)).run();
  await audit(s, "guncelle", "sube", id, p.data.name); revalidatePath("/ayarlar"); revalidatePath("/takvim"); return { ok: true };
}

// ---------------- Arama (istemci bileşenleri için) ----------------
export async function findPatients(q: string): Promise<{ id: number; name: string; phone: string; code: string }[]> {
  const s = await requireSession();
  const { searchPatients } = await import("@/lib/queries");
  const branchId = s.role === "yonetici" ? null : s.branchId;
  return searchPatients(q, branchId, 8).map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, phone: p.phone, code: p.code }));
}
