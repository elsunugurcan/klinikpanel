"use client";
import { useFormState, useFormStatus } from "react-dom";
import { login } from "@/app/actions";
function Btn() { const { pending } = useFormStatus(); return <button disabled={pending} className="btn-primary w-full !py-3">{pending ? "Giriş yapılıyor…" : "Giriş"}</button>; }
export default function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFormState(login, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <div><label htmlFor="email" className="label">E-posta</label><input id="email" name="email" type="email" className="input" defaultValue="yonetici@klinikpanel.example" autoComplete="username" /></div>
      <div><label htmlFor="password" className="label">Parola</label><input id="password" name="password" type="password" className="input" autoComplete="current-password" /></div>
      {state?.error && <p className="rounded-lg bg-[#d03b3b]/10 px-3 py-2 text-sm text-[#9a2323]">{state.error}</p>}
      <Btn />
    </form>
  );
}
