import { localISO, parseDate, toMin } from "./time";
export type PlannedReminder = { kind: "24s" | "2s"; scheduledAt: string };
/** Randevudan 24 saat ve 2 saat önce; geçmişte kalanlar planlanmaz. */
export function planReminders(date: string, start: string, now: Date): PlannedReminder[] {
  const d = parseDate(date); const min = toMin(start);
  const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(min / 60), min % 60);
  const out: PlannedReminder[] = [];
  for (const [kind, hours] of [["24s", 24], ["2s", 2]] as const) {
    const t = new Date(at.getTime() - hours * 3600e3);
    if (t.getTime() > now.getTime()) out.push({ kind, scheduledAt: localISO(t) });
  }
  return out;
}
export const isDue = (scheduledAt: string, now: Date) => scheduledAt <= localISO(now);
export function reminderText(kind: "24s" | "2s", patient: string, clinic: string, date: string, start: string, doctor: string) {
  const when = kind === "24s" ? "yarın" : "bugün";
  return `Sayın ${patient}, ${clinic} ${when} ${date.split("-").reverse().join(".")} saat ${start} ${doctor} randevunuzu hatırlatırız. İptal için: 0322 000 00 00`;
}
