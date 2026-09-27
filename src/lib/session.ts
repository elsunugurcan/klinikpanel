import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, type Session } from "./auth";
import { db, schema } from "@/db";

export const COOKIE = "kp_session";
export async function getSession(): Promise<Session | null> { return verifySession(cookies().get(COOKIE)?.value); }
export async function requireSession(): Promise<Session> { const s = await getSession(); if (!s) redirect("/giris"); return s; }
export async function audit(s: Session | null, action: string, entity: string, entityId?: number | null, details?: string) {
  db.insert(schema.auditLogs).values({ userId: s?.uid ?? null, userName: s?.name ?? "sistem", action, entity, entityId: entityId ?? null, details: details ?? null }).run();
}
/** Yöneticiler tüm şubeleri, diğerleri kendi şubesini görür. */
export function branchScope(s: Session, requested?: number | null): number | null {
  if (s.role === "yonetici") return requested ?? null;
  return s.branchId;
}
