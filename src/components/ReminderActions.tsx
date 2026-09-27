"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { sendDueReminders, sendReminderNow } from "@/app/actions";
export default function ReminderActions() {
  const router = useRouter(); const [pending, go] = useTransition(); const [msg, setMsg] = useState("");
  return <div className="flex items-center gap-3">{msg && <span className="text-sm text-[#006300]">{msg}</span>}<button disabled={pending} onClick={() => go(async () => { const r = await sendDueReminders(); setMsg(`${r.sent} mesaj gönderildi`); router.refresh(); })} className="btn-primary btn-sm"><Send size={14} /> Vadesi gelenleri gönder</button></div>;
}
export function SendOne({ id }: { id: number }) {
  const router = useRouter(); const [pending, go] = useTransition();
  return <button disabled={pending} onClick={() => go(async () => { await sendReminderNow(id); router.refresh(); })} className="btn-outline btn-sm">Şimdi gönder</button>;
}
