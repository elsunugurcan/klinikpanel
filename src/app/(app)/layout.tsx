import { cookies } from "next/headers";
import AppShell from "@/components/AppShell";
import { requireSession } from "@/lib/session";
import { branches } from "@/lib/queries";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const chosen = Number(cookies().get("kp_branch")?.value ?? 0) || null;
  return <AppShell session={s} branches={branches()} activeBranch={s.role === "yonetici" ? chosen : s.branchId}>{children}</AppShell>;
}
