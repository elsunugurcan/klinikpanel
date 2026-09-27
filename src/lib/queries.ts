import { db, schema } from "@/db";
import { and, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import type { Appointment, Patient } from "@/db/schema";

export const branches = () => db.select().from(schema.branches).all();
export const doctors = (branchId?: number | null) => db.select().from(schema.doctors).where(branchId ? eq(schema.doctors.branchId, branchId) : undefined).all();
export const services = () => db.select().from(schema.services).where(eq(schema.services.active, true)).all();
export const allServices = () => db.select().from(schema.services).all();
export const users = () => db.select().from(schema.users).all();

export type ApptFull = Appointment & { patientName: string; patientPhone: string; doctorName: string; doctorColor: string; serviceName: string; price: number };
export function appointmentsBetween(from: string, to: string, opts: { branchId?: number | null; doctorId?: number | null } = {}): ApptFull[] {
  const conds = [gte(schema.appointments.date, from), lte(schema.appointments.date, to)];
  if (opts.branchId) conds.push(eq(schema.appointments.branchId, opts.branchId));
  if (opts.doctorId) conds.push(eq(schema.appointments.doctorId, opts.doctorId));
  return db.select({
    a: schema.appointments, patientName: sql<string>`${schema.patients.firstName} || ' ' || ${schema.patients.lastName}`, patientPhone: schema.patients.phone,
    doctorName: schema.doctors.name, doctorColor: schema.doctors.color, serviceName: schema.services.name, price: schema.services.price,
  }).from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .innerJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId))
    .innerJoin(schema.services, eq(schema.services.id, schema.appointments.serviceId))
    .where(and(...conds)).orderBy(schema.appointments.date, schema.appointments.start).all()
    .map((r) => ({ ...r.a, patientName: r.patientName, patientPhone: r.patientPhone, doctorName: r.doctorName, doctorColor: r.doctorColor, serviceName: r.serviceName, price: r.price }));
}
export const appointmentsOfDoctor = (doctorId: number, date: string) => db.select().from(schema.appointments).where(and(eq(schema.appointments.doctorId, doctorId), eq(schema.appointments.date, date))).all();

export function searchPatients(q: string, branchId: number | null, limit = 50): Patient[] {
  const conds = [];
  if (branchId) conds.push(eq(schema.patients.branchId, branchId));
  if (q) { const l = `%${q}%`; conds.push(or(like(schema.patients.firstName, l), like(schema.patients.lastName, l), like(schema.patients.phone, l), like(schema.patients.code, l), like(sql`${schema.patients.firstName} || ' ' || ${schema.patients.lastName}`, l))); }
  return db.select().from(schema.patients).where(conds.length ? and(...conds) : undefined).orderBy(desc(schema.patients.id)).limit(limit).all();
}
export const patient = (id: number) => db.select().from(schema.patients).where(eq(schema.patients.id, id)).get() ?? null;
export const patientAppointments = (id: number) => db.select({ a: schema.appointments, doctorName: schema.doctors.name, serviceName: schema.services.name, price: schema.services.price }).from(schema.appointments).innerJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId)).innerJoin(schema.services, eq(schema.services.id, schema.appointments.serviceId)).where(eq(schema.appointments.patientId, id)).orderBy(desc(schema.appointments.date), desc(schema.appointments.start)).all().map((r) => ({ ...r.a, doctorName: r.doctorName, serviceName: r.serviceName, price: r.price }));
export const patientTreatments = (id: number) => db.select({ t: schema.treatments, doctorName: schema.doctors.name }).from(schema.treatments).innerJoin(schema.doctors, eq(schema.doctors.id, schema.treatments.doctorId)).where(eq(schema.treatments.patientId, id)).orderBy(desc(schema.treatments.date)).all().map((r) => ({ ...r.t, doctorName: r.doctorName }));
export const patientPayments = (id: number) => db.select().from(schema.payments).where(eq(schema.payments.patientId, id)).orderBy(desc(schema.payments.date)).all();
export const patientBalance = (id: number) => { const t = patientTreatments(id).reduce((s, x) => s + x.price, 0); const p = patientPayments(id).reduce((s, x) => s + x.amount, 0); return { treated: t, paid: p, balance: t - p }; };

export function paymentsBetween(from: string, to: string, branchId: number | null) {
  const conds = [gte(schema.payments.date, from), lte(schema.payments.date, to)];
  if (branchId) conds.push(eq(schema.payments.branchId, branchId));
  return db.select({ p: schema.payments, patientName: sql<string>`${schema.patients.firstName} || ' ' || ${schema.patients.lastName}`, serviceName: schema.services.name, doctorName: schema.doctors.name })
    .from(schema.payments).innerJoin(schema.patients, eq(schema.patients.id, schema.payments.patientId))
    .leftJoin(schema.appointments, eq(schema.appointments.id, schema.payments.appointmentId))
    .leftJoin(schema.services, eq(schema.services.id, schema.appointments.serviceId)).leftJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId))
    .where(and(...conds)).orderBy(desc(schema.payments.date), desc(schema.payments.id)).all().map((r) => ({ ...r.p, patientName: r.patientName, serviceName: r.serviceName ?? "—", doctorName: r.doctorName ?? "—" }));
}
export function remindersList(branchId: number | null) {
  return db.select({ r: schema.reminders, a: schema.appointments, patientName: sql<string>`${schema.patients.firstName} || ' ' || ${schema.patients.lastName}`, phone: schema.patients.phone, doctorName: schema.doctors.name })
    .from(schema.reminders).innerJoin(schema.appointments, eq(schema.appointments.id, schema.reminders.appointmentId)).innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId)).innerJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId))
    .where(branchId ? eq(schema.appointments.branchId, branchId) : undefined).orderBy(schema.reminders.scheduledAt).all()
    .map((x) => ({ ...x.r, date: x.a.date, start: x.a.start, patientName: x.patientName, phone: x.phone, doctorName: x.doctorName }));
}
export const auditList = (limit = 200) => db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.id)).limit(limit).all();
export const patientsByIds = (ids: number[]) => ids.length ? db.select().from(schema.patients).where(inArray(schema.patients.id, ids)).all() : [];
