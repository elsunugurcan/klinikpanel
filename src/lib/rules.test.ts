import { describe, it, expect } from "vitest";
import { findConflict, isWithinHours, utilization } from "./availability";
import { planReminders, isDue, reminderText } from "./reminders";
import { dailySeries, sumBy, noShowRate, pctChange, toCSV } from "./reports";
import { signSession, verifySession, hashPassword, verifyPassword, CAN } from "./auth";
import { startOfWeek, toISODate } from "./time";

describe("randevu çakışma", () => {
  const ex = [{ id: 1, start: "10:00", duration: 30, status: "planlandi" }, { id: 2, start: "11:00", duration: 60, status: "iptal" }, { id: 3, start: "13:00", duration: 45, status: "tamamlandi" }];
  it("çakışan aralıkları yakalar, bitişikleri serbest bırakır", () => {
    expect(findConflict(ex, "10:15", 30)?.id).toBe(1);
    expect(findConflict(ex, "09:30", 30)).toBeNull();
    expect(findConflict(ex, "10:30", 30)).toBeNull();
    expect(findConflict(ex, "13:30", 30)?.id).toBe(3);
  });
  it("iptal edilen randevular engel değildir; kendi kaydı yok sayılır", () => {
    expect(findConflict(ex, "11:00", 60)).toBeNull();
    expect(findConflict(ex, "10:00", 30, 1)).toBeNull();
  });
  it("mesai saatleri ve doluluk", () => {
    expect(isWithinHours(9, 19, "18:30", 30)).toBe(true);
    expect(isWithinHours(9, 19, "18:45", 30)).toBe(false);
    expect(isWithinHours(9, 19, "08:30", 30)).toBe(false);
    expect(utilization(ex, 9, 19)).toBeCloseTo(75 / 600, 5);
  });
});

describe("hatırlatmalar", () => {
  it("24 saat ve 2 saat önce planlanır; geçmiş olanlar atlanır", () => {
    const now = new Date(2026, 9, 5, 9, 0);
    const r = planReminders("2026-10-06", "14:00", now);
    expect(r.map((x) => x.kind)).toEqual(["24s", "2s"]);
    expect(r[0].scheduledAt).toBe("2026-10-05T14:00"); expect(r[1].scheduledAt).toBe("2026-10-06T12:00");
    const r2 = planReminders("2026-10-05", "10:00", now);
    expect(r2.map((x) => x.kind)).toEqual([]); // 24s geçmiş, 2s de geçmiş (08:00)
    const r3 = planReminders("2026-10-05", "12:00", now);
    expect(r3.map((x) => x.kind)).toEqual(["2s"]);
  });
  it("vade kontrolü ve mesaj metni", () => {
    expect(isDue("2026-10-05T14:00", new Date(2026, 9, 5, 14, 0))).toBe(true);
    expect(isDue("2026-10-05T14:01", new Date(2026, 9, 5, 14, 0))).toBe(false);
    expect(reminderText("24s", "Ayşe Demir", "Nova Klinik", "2026-10-06", "14:00", "Dr. Kaya")).toContain("yarın 06.10.2026 saat 14:00");
  });
});

describe("raporlar", () => {
  it("günlük seri boş günleri sıfırla doldurur", () => {
    const s = dailySeries([{ date: "2026-10-01", amount: 100 }, { date: "2026-10-01", amount: 50 }, { date: "2026-10-03", amount: 20 }], "2026-10-01", "2026-10-03");
    expect(s).toEqual([{ date: "2026-10-01", amount: 150 }, { date: "2026-10-02", amount: 0 }, { date: "2026-10-03", amount: 20 }]);
  });
  it("gruplama, gelmeme oranı, yüzde değişim, CSV", () => {
    expect(sumBy([{ k: "a", v: 1 }, { k: "b", v: 5 }, { k: "a", v: 2 }], (r) => r.k, (r) => r.v)).toEqual([{ key: "b", value: 5 }, { key: "a", value: 3 }]);
    expect(noShowRate([{ status: "tamamlandi" }, { status: "gelmedi" }, { status: "iptal" }, { status: "planlandi" }])).toBe(0.5);
    expect(pctChange(120, 100)).toBeCloseTo(0.2); expect(pctChange(10, 0)).toBe(1);
    const csv = toCSV([{ ad: "Ayşe; Demir", tutar: 10 }]);
    expect(csv).toContain('"Ayşe; Demir";10');
  });
});

describe("oturum ve yetki", () => {
  it("imzalı oturum doğrulanır, kurcalanmış token reddedilir", () => {
    const t = signSession({ uid: 1, name: "Test", role: "yonetici", branchId: 1, doctorId: null });
    expect(verifySession(t)?.uid).toBe(1);
    expect(verifySession(t.slice(0, -2) + "xx")).toBeNull();
    expect(verifySession("abc")).toBeNull();
    expect(verifySession(null)).toBeNull();
  });
  it("parola özeti doğrulanır", () => { const h = hashPassword("demo123"); expect(verifyPassword("demo123", h)).toBe(true); expect(verifyPassword("yanlis", h)).toBe(false); });
  it("rol yetkileri", () => { expect(CAN.reports("yonetici")).toBe(true); expect(CAN.reports("resepsiyon")).toBe(false); expect(CAN.payments("hekim")).toBe(false); expect(CAN.editPatients("resepsiyon")).toBe(true); });
  it("hafta pazartesiden başlar", () => { expect(toISODate(startOfWeek(new Date(2026, 9, 8)))).toBe("2026-10-05"); expect(toISODate(startOfWeek(new Date(2026, 9, 5)))).toBe("2026-10-05"); expect(toISODate(startOfWeek(new Date(2026, 9, 4)))).toBe("2026-09-28"); });
});
