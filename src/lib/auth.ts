import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { CAN, type Session } from "./roles";
export { CAN, type Session };

const SECRET = process.env.SESSION_SECRET ?? "klinikpanel-dev-secret-degistir";
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");
const sig = (payload: string) => createHmac("sha256", SECRET).update(payload).digest("base64url");

export function signSession(s: Omit<Session, "exp">, ttlHours = 10): string {
  const payload = b64(JSON.stringify({ ...s, exp: Date.now() + ttlHours * 3600e3 }));
  return `${payload}.${sig(payload)}`;
}
export function verifySession(token: string | undefined | null): Session | null {
  if (!token) return null;
  const [payload, s] = token.split(".");
  if (!payload || !s) return null;
  const expected = sig(payload);
  if (expected.length !== s.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(s))) return null;
  try { const data = JSON.parse(unb64(payload)) as Session; return data.exp > Date.now() ? data : null; } catch { return null; }
}
export const hashPassword = (p: string) => bcrypt.hashSync(p, 10);
export const verifyPassword = (p: string, hash: string) => bcrypt.compareSync(p, hash);
