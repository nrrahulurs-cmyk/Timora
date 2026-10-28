"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TimoAvatar } from "@/components/companion/timo-avatar";
import { TimoraBrand } from "@/components/brand/timora-brand";
import { useAuth } from "@/lib/auth/auth-context";
import { isLocalDemo } from "@/lib/auth/identity";
import type { UserRole } from "@/types/domain";

interface LoginFormProps {
  forcedRole?: UserRole;
  portalTitle?: string;
}

const portalRoles: { role: UserRole; label: string; email: string }[] = [
  { role: "timetable_coordinator", label: "Coordinator", email: "e.vance@timora.edu" },
  { role: "faculty_instructor", label: "Faculty", email: "s.lin@timora.edu" },
  { role: "academic_admin", label: "Administrator", email: "admin@timora.edu" },
  { role: "department_head", label: "Department head", email: "a.turing@timora.edu" },
  { role: "dean", label: "Dean", email: "dean.academics@timora.edu" },
  { role: "student_viewer", label: "Student", email: "student@timora.edu" },
];

export function LoginForm({ forcedRole, portalTitle }: LoginFormProps) {
  const router = useRouter();
  const { login, requestPasswordReset } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<UserRole | "">(forcedRole || (isLocalDemo ? "timetable_coordinator" : ""));
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState("");
  const [resetResult, setResetResult] = React.useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = React.useState(false);

  React.useEffect(() => {
    setSelectedRole(forcedRole || (isLocalDemo ? "timetable_coordinator" : ""));
    if (!isLocalDemo) return;
    setEmail(portalRoles.find((item) => item.role === (forcedRole || "timetable_coordinator"))?.email || "");
    setPassword("timora2026");
  }, [forcedRole]);

  const selectedLocalAccount = portalRoles.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      const result = await login(email.trim(), password, selectedRole || undefined);
      if (!result.success) {
        setErrorMessage(result.error || "Could not sign in. Check your details and try again.");
        return;
      }
      router.push(isLocalDemo && selectedLocalAccount?.role === "student_viewer" ? "/timetable" : "/");
    } catch {
      setErrorMessage("Sign-in is unavailable right now. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetSubmitting(true);
    setResetResult(null);
    try {
      const result = await requestPasswordReset(resetEmail);
      setResetResult(result.message);
    } catch {
      setResetResult("Could not send a reset link. Try again.");
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-[#f4f5fb] text-slate-900">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-[#e7eaff]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-32 h-[38rem] w-[38rem] rounded-full bg-[#fff0e8]/80 blur-3xl" />
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-6 sm:px-9 sm:py-8">
        <header className="flex items-center justify-between">
          <Link href="/login" className="inline-flex items-center gap-3 rounded-xl text-slate-900" aria-label="Timora sign in">
            <TimoraBrand />
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(390px,450px)] lg:gap-20 lg:py-14">
          <div className="hidden max-w-xl lg:block">
            <div className="mb-10 grid h-32 w-32 place-items-center rounded-[36px] bg-white/75 shadow-[0_18px_50px_-22px_rgba(72,75,119,0.24)] backdrop-blur-md">
              <TimoAvatar size="xl" state="ready" />
            </div>
            <p className="max-w-[12ch] text-[54px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#202722]">A clearer academic day.</p>
            <p className="mt-6 max-w-[34ch] text-base leading-relaxed text-slate-600">Classes, people and spaces in one calm place.</p>
          </div>

          <section className="w-full rounded-[28px] border border-white/90 bg-white/85 px-6 py-8 shadow-[0_24px_70px_-28px_rgba(44,53,83,0.23)] backdrop-blur-xl sm:px-10 sm:py-10" aria-labelledby="login-title">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#fff3ee] lg:hidden"><TimoAvatar size="md" state="ready" /></div>
            <h1 id="login-title" className="text-[30px] font-semibold leading-tight tracking-[-0.035em] text-[#202722] sm:text-[34px]">{portalTitle || "Welcome to Timora"}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Sign in with your institutional account.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="space-y-2"><label htmlFor="login-account-type" className="block text-sm font-medium text-slate-800">Sign in as</label><select id="login-account-type" value={selectedRole} onChange={(event) => { const role = event.target.value as UserRole | ""; setSelectedRole(role); if (isLocalDemo) { setEmail(portalRoles.find((item) => item.role === role)?.email || ""); setPassword("timora2026"); } setErrorMessage(null); }} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#b7442d] focus:ring-2 focus:ring-[#f7d8cf]"><option value="">Use assigned access</option>{portalRoles.map((item) => <option key={item.role} value={item.role}>{item.label}</option>)}</select></div>
              <div className="space-y-2">
                <label htmlFor="login-email-input" className="block text-sm font-medium text-slate-800">Email address</label>
                <input id="login-email-input" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@institution.edu" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-500 focus:border-[#b7442d] focus:ring-2 focus:ring-[#f7d8cf]" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4"><label htmlFor="login-password-input" className="text-sm font-medium text-slate-800">Password</label>{!isLocalDemo && <button type="button" onClick={() => { setResetEmail(email); setResetResult(null); setForgotOpen(true); }} className="text-xs font-medium text-[#a74730] hover:underline">Forgot password?</button>}</div>
                <div className="relative">
                  <input id="login-password-input" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition-colors focus:border-[#b7442d] focus:ring-2 focus:ring-[#f7d8cf]" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-lg text-slate-500 hover:text-slate-800">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>

              {errorMessage && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-800">{errorMessage}</p>}

              <Button id="login-submit-button" type="submit" disabled={loading} className="h-12 w-full justify-between rounded-xl bg-[#b7442d] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#993421]">
                <span>{loading ? "Opening workspace…" : "Sign in"}</span><ArrowRight size={17} aria-hidden="true" />
              </Button>
            </form>

          </section>
        </main>
      </div>

      {!isLocalDemo && <Dialog open={forgotOpen} onOpenChange={setForgotOpen}><DialogContent className="w-[calc(100%-32px)] max-w-md p-7"><DialogTitle className="text-xl">Reset your password</DialogTitle><DialogDescription className="text-sm leading-relaxed">Enter your account email. We’ll send a reset link if an account exists.</DialogDescription><form onSubmit={handlePasswordReset} className="space-y-4"><div className="space-y-2"><label htmlFor="reset-email" className="text-sm font-medium">Email address</label><input id="reset-email" type="email" autoComplete="email" required value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm" /></div>{resetResult && <p role="status" className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{resetResult}</p>}<Button type="submit" disabled={resetSubmitting} className="h-11 w-full">{resetSubmitting ? "Sending…" : "Send reset link"}</Button></form></DialogContent></Dialog>}
    </div>
  );
}
