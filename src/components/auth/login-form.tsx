"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building,
  GraduationCap,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import type { UserRole } from "@/types/domain";

interface LoginFormProps {
  forcedRole?: UserRole;
  portalTitle?: string;
  portalDescription?: string;
}

const ROLE_PRESETS = [
  {
    role: "academic_admin" as UserRole,
    title: "Administrator",
    email: "admin@timora.edu",
    desc: "Institutional Governance & System Control",
    icon: ShieldCheck,
  },
  {
    role: "timetable_coordinator" as UserRole,
    title: "Coordinator",
    email: "e.vance@timora.edu",
    desc: "Conflict Resolution & Matrix Scheduling",
    icon: Calendar,
  },
  {
    role: "faculty_instructor" as UserRole,
    title: "Faculty",
    email: "s.lin@timora.edu",
    desc: "Classroom Teaching & Exchange Requests",
    icon: Building,
  },
  {
    role: "student_viewer" as UserRole,
    title: "Student",
    email: "student@timora.edu",
    desc: "Cohort Timetable & Lecture Schedules",
    icon: GraduationCap,
  },
];

export function LoginForm({
  forcedRole,
  portalTitle,
  portalDescription,
}: LoginFormProps) {
  const router = useRouter();
  const { login, requestPasswordReset } = useAuth();

  const [selectedRole, setSelectedRole] = React.useState<UserRole>(
    forcedRole || "timetable_coordinator"
  );
  const [email, setEmail] = React.useState(
    forcedRole
      ? ROLE_PRESETS.find((p) => p.role === forcedRole)?.email || "e.vance@timora.edu"
      : "e.vance@timora.edu"
  );
  const [password, setPassword] = React.useState("timora2026");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Forgot password dialog state
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState("");
  const [resetResult, setResetResult] = React.useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = React.useState(false);

  const handleSelectPreset = (preset: (typeof ROLE_PRESETS)[0]) => {
    setSelectedRole(preset.role);
    setEmail(preset.email);
    setPassword("timora2026");
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const result = await login(email, password, forcedRole || selectedRole);
      if (result.success) {
        // Role-based target redirect
        if (forcedRole === "student_viewer" || selectedRole === "student_viewer") {
          router.push("/timetable");
        } else {
          router.push("/");
        }
      } else {
        setErrorMessage(result.error || "Authentication failed. Check your email or password.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSubmitting(true);
    setResetResult(null);

    const res = await requestPasswordReset(resetEmail || email);
    setResetResult(res.message);
    setResetSubmitting(false);
  };

  const activePreset = ROLE_PRESETS.find((p) => p.role === (forcedRole || selectedRole));

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-white border-slate-200/80 shadow-sm rounded-xl overflow-hidden">
        {/* Top Branding Accent Bar */}
        <div className="h-1.5 w-full bg-[rgb(var(--color-primary))]" />

        <CardHeader className="pt-6 pb-4 text-center space-y-2">
          {/* Brand Icon & Name */}
          <div className="inline-flex items-center justify-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[rgb(var(--color-primary))] text-white flex items-center justify-center font-bold text-lg shadow-xs">
              T
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              Timora
            </span>
          </div>

          <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">
            {portalTitle || (activePreset ? `${activePreset.title} Sign-In` : "Academic Sign-In")}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 max-w-xs mx-auto">
            {portalDescription || "Enterprise Timetable Management & Academic Operations Platform"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {/* Quick Role Persona Switcher (If not locked to a specific role) */}
          {!forcedRole && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                Select Institutional Role
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-200">
                {ROLE_PRESETS.map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedRole === p.role;
                  return (
                    <button
                      key={p.role}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all text-center ${
                        isSelected
                          ? "bg-white text-[rgb(var(--color-primary))] font-semibold shadow-xs border border-slate-200/80"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 mb-1" />
                      <span className="text-[10px] leading-tight truncate w-full">{p.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Institutional Email Address
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@timora.edu"
                leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                className="h-9.5 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                id="login-email-input"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 block">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-[11px] text-[rgb(var(--color-primary))] hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
                  className="h-9.5 text-xs bg-slate-50/50 border-slate-200 focus:bg-white pr-9"
                  id="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[rgb(var(--color-primary))] focus:ring-[rgb(var(--color-primary))]"
                />
                <span>Remember this terminal</span>
              </label>

              <Badge variant="outline" size="sm" className="text-[10px] bg-slate-50 border-slate-200 font-mono">
                Supabase Auth + RLS
              </Badge>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 gap-2 bg-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary-hover))] text-white font-semibold text-xs shadow-xs"
              id="login-submit-button"
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Timora</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Credentials Footer */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-center">
            <span className="text-[11px] text-slate-400 font-medium block">
              Evaluator Quick Access Personas
            </span>
            <div className="flex flex-wrap justify-center gap-1.5">
              {ROLE_PRESETS.map((p) => (
                <button
                  key={p.role}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors font-mono"
                >
                  {p.title}: {p.email}
                </button>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="py-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500 justify-center">
          <span>Timora Institute of Technology • Academic Scheduling OS v2.4</span>
        </CardFooter>
      </Card>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <Card className="bg-white border-slate-200 max-w-sm w-full p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
              <button
                onClick={() => {
                  setForgotOpen(false);
                  setResetResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your institutional email address. If registered, we will transmit a password recovery authorization token.
            </p>

            {resetResult && (
              <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-xs text-blue-800">
                {resetResult}
              </div>
            )}

            <form onSubmit={handlePasswordResetSubmit} className="space-y-3">
              <Input
                type="email"
                required
                value={resetEmail || email}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="name@timora.edu"
                className="h-8.5 text-xs"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForgotOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetSubmitting}
                  size="sm"
                  className="h-8 text-xs bg-[rgb(var(--color-primary))] text-white"
                >
                  {resetSubmitting ? "Dispatching..." : "Send Reset Link"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
