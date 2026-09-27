import { requireSession } from "@/lib/session";
import { scopeOf } from "@/lib/scope";
import { appointmentsBetween, branches, doctors, services } from "@/lib/queries";
import { addDaysISO, parseDate, toISODate } from "@/lib/time";
import Calendar from "@/components/Calendar";
export const dynamic = "force-dynamic";
export const metadata = { title: "Takvim" };
export default async function Page({ searchParams }: { searchParams: { tarih?: string; gorunum?: string; hekim?: string; yeni?: string } }) {
  const s = await requireSession(); const { branchId, doctorId } = scopeOf(s);
  const today = toISODate(new Date());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.tarih ?? "") ? searchParams.tarih! : today;
  const view = searchParams.gorunum === "gun" ? "gun" : "hafta";
  const d = parseDate(date); const off = (d.getDay() + 6) % 7; const weekStart = toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - off));
  const from = view === "hafta" ? weekStart : date, to = view === "hafta" ? addDaysISO(weekStart, 6) : date;
  const docs = doctors(branchId).filter((x) => x.active);
  const br = branches(); const scoped = branchId ? br.filter((b) => b.id === branchId) : br;
  const hours: [number, number] = [Math.min(...scoped.map((b) => b.openHour)), Math.max(...scoped.map((b) => b.closeHour))];
  const doctorFilter = doctorId ?? (Number(searchParams.hekim) || null);
  return <Calendar appts={appointmentsBetween(from, to, { branchId, doctorId })} doctors={docs.map((x) => ({ id: x.id, name: x.name, title: x.title, color: x.color, branchId: x.branchId }))} services={services().map((x) => ({ id: x.id, name: x.name, duration: x.duration, category: x.category }))} hours={hours} date={date} view={view} doctorFilter={doctorFilter} lockDoctor={doctorId} openNew={searchParams.yeni === "1"} today={today} />;
}
