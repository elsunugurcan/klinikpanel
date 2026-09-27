import { toMin } from "./time";
/** Çakışma kontrolü: aynı hekimde iptal/gelmedi dışındaki randevular birbirine giremez. */
export type Slotish = { id: number; start: string; duration: number; status: string };
export const BLOCKING = new Set(["planlandi", "onaylandi", "geldi", "tamamlandi"]);
export function findConflict(existing: Slotish[], start: string, duration: number, ignoreId?: number): Slotish | null {
  const s = toMin(start), e = s + duration;
  for (const a of existing) {
    if (a.id === ignoreId || !BLOCKING.has(a.status)) continue;
    const as = toMin(a.start), ae = as + a.duration;
    if (s < ae && as < e) return a;
  }
  return null;
}
export function isWithinHours(openHour: number, closeHour: number, start: string, duration: number) {
  const s = toMin(start);
  return s >= openHour * 60 && s + duration <= closeHour * 60;
}
/** Bir hekimin gün içindeki doluluk oranı (dakika bazında). */
export function utilization(appts: Slotish[], openHour: number, closeHour: number) {
  const total = (closeHour - openHour) * 60;
  const busy = appts.filter((a) => BLOCKING.has(a.status)).reduce((s, a) => s + a.duration, 0);
  return total > 0 ? Math.min(1, busy / total) : 0;
}
