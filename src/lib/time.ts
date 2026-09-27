export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const parseDate = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
export const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addDaysISO = (iso: string, n: number) => toISODate(addDays(parseDate(iso), n));
export const startOfWeek = (d: Date) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; }; // Pazartesi
export const weekdayShort = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) => parseDate(iso).toLocaleDateString("tr-TR", opts);
export const fmtDateShort = (iso: string) => parseDate(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
export const localISO = (d: Date) => `${toISODate(d)}T${toHHMM(d.getHours() * 60 + d.getMinutes())}`;
export const monthKey = (iso: string) => iso.slice(0, 7);
