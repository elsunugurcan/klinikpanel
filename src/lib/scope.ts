import { cookies } from "next/headers";
import type { Session } from "./auth";
/** Sayfaların veri kapsamı: yönetici seçtiği şube (veya tümü), diğerleri kendi şubesi; hekim yalnızca kendi randevuları. */
export function scopeOf(s: Session) {
  const chosen = Number(cookies().get("kp_branch")?.value ?? 0) || null;
  return { branchId: s.role === "yonetici" ? chosen : s.branchId, doctorId: s.role === "hekim" ? s.doctorId : null };
}
