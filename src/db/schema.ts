import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const branches = sqliteTable("branches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  city: text("city").notNull(),
  phone: text("phone").notNull(),
  openHour: integer("open_hour").notNull().default(9),
  closeHour: integer("close_hour").notNull().default(19),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),                 // yonetici | hekim | resepsiyon
  branchId: integer("branch_id").references(() => branches.id),
  doctorId: integer("doctor_id"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const doctors = sqliteTable("doctors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  title: text("title").notNull(),
  specialty: text("specialty").notNull(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  color: text("color").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  duration: integer("duration").notNull(),      // dakika
  price: integer("price").notNull(),            // kuruş
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const patients = sqliteTable("patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),        // HK-000123
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  birthDate: text("birth_date"),
  gender: text("gender"),                       // K | E | -
  allergies: text("allergies"),
  notes: text("notes"),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({ phoneIdx: index("patients_phone_idx").on(t.phone), nameIdx: index("patients_name_idx").on(t.lastName, t.firstName) }));

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  serviceId: integer("service_id").notNull().references(() => services.id),
  date: text("date").notNull(),                 // YYYY-MM-DD
  start: text("start").notNull(),               // HH:MM
  duration: integer("duration").notNull(),
  status: text("status").notNull().default("planlandi"), // planlandi | onaylandi | geldi | tamamlandi | gelmedi | iptal
  note: text("note"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({ dayIdx: index("appt_day_idx").on(t.date, t.doctorId) }));

export const treatments = sqliteTable("treatments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  date: text("date").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  price: integer("price").notNull().default(0),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  amount: integer("amount").notNull(),          // kuruş
  method: text("method").notNull(),             // nakit | kart | havale
  date: text("date").notNull(),
  note: text("note"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  channel: text("channel").notNull(),           // sms | whatsapp
  kind: text("kind").notNull(),                 // 24s | 2s
  scheduledAt: text("scheduled_at").notNull(),  // ISO yerel "YYYY-MM-DDTHH:MM"
  status: text("status").notNull().default("bekliyor"), // bekliyor | gonderildi | iptal
  sentAt: text("sent_at"),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  userName: text("user_name").notNull(),
  action: text("action").notNull(),             // olustur | guncelle | sil | goruntule | giris
  entity: text("entity").notNull(),             // hasta | randevu | odeme | ...
  entityId: integer("entity_id"),
  details: text("details"),
  at: text("at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Branch = typeof branches.$inferSelect;
export type User = typeof users.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Treatment = typeof treatments.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Role = "yonetici" | "hekim" | "resepsiyon";
export const STATUSES = ["planlandi", "onaylandi", "geldi", "tamamlandi", "gelmedi", "iptal"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = { planlandi: "Planlandı", onaylandi: "Onaylandı", geldi: "Geldi", tamamlandi: "Tamamlandı", gelmedi: "Gelmedi", iptal: "İptal" };
