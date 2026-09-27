import type { Role } from "@/db/schema";
export type Session = { uid: number; name: string; role: Role; branchId: number | null; doctorId: number | null; exp: number };
/** Rol yetkileri (istemci ve sunucuda ortak). */
export const CAN = {
  reports: (r: Role) => r === "yonetici",
  settings: (r: Role) => r === "yonetici",
  audit: (r: Role) => r === "yonetici",
  payments: (r: Role) => r !== "hekim",
  allBranches: (r: Role) => r === "yonetici",
  editPatients: (r: Role) => r !== "hekim",
} as const;
