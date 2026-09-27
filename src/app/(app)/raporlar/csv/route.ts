import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { scopeOf } from "@/lib/scope";
import { paymentsBetween } from "@/lib/queries";
import { toCSV } from "@/lib/reports";
import { CAN } from "@/lib/auth";
export async function GET(req: Request) {
  const s = await getSession(); if (!s || !CAN.reports(s.role)) return new NextResponse("Yetkisiz", { status: 403 });
  const u = new URL(req.url); const from = u.searchParams.get("from") ?? "", to = u.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return new NextResponse("Tarih hatalı", { status: 400 });
  const rows = paymentsBetween(from, to, scopeOf(s).branchId).map((p) => ({ tarih: p.date, hasta: p.patientName, islem: p.serviceName, hekim: p.doctorName, yontem: p.method, tutar: (p.amount / 100).toFixed(2), not: p.note ?? "" }));
  return new NextResponse(toCSV(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="tahsilat-${from}-${to}.csv"` } });
}
