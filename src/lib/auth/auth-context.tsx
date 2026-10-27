"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SEED_USERS } from "@/data/fixtures/users";
import type { User, UserRole } from "@/types/domain";
import { identityFromAuth, isLocalDemo } from "./identity";

interface AuthContextType {
  user: User | null; role: UserRole; isAuthenticated: boolean; isLoading: boolean;
  login: (email: string, password?: string, targetRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
}
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);
function rememberDemo(user: User) {
  localStorage.setItem("timora_active_user_id", user.id);
  localStorage.setItem("timora_active_role", user.role);
  document.cookie = `timora_user_role=${user.role}; path=/; SameSite=Strict; max-age=604800`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  React.useEffect(() => {
    let active = true;
    if (isLocalDemo) {
      const stored = localStorage.getItem("timora_active_role") as UserRole;
      const demo = SEED_USERS.find((item) => item.role === stored);
      if (demo) { rememberDemo(demo); setUser(demo); }
      setIsLoading(false);
      return;
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) { setIsLoading(false); return; }
    const client = createClient();
    client.auth.getUser().then(({ data, error }) => {
      if (active) { setUser(!error && data.user ? identityFromAuth(data.user) : null); setIsLoading(false); }
    }).catch(() => { if (active) setIsLoading(false); });
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ? identityFromAuth(session.user) : null);
    });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);

  React.useEffect(() => {
    if (!user || isLocalDemo) return;
    import("@/lib/repository/scheduling-repository").then(({ schedulingRepository, SupabaseSchedulingRepository }) => {
      if (schedulingRepository instanceof SupabaseSchedulingRepository) schedulingRepository.setUserContext(user.id, user.fullName, user.role);
    });
  }, [user]);

  const login: AuthContextType["login"] = async (email, password, targetRole) => {
    setIsLoading(true);
    try {
      if (isLocalDemo) {
        const demo = SEED_USERS.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
        if (!demo || password !== "timora2026") return { success: false, error: "Sign-in failed. Check your email and password and try again." };
        if (targetRole && demo.role !== targetRole) return { success: false, error: "This account does not have access to the selected workspace." };
        rememberDemo(demo); setUser(demo); return { success: true };
      }
      if (!password) return { success: false, error: "Enter your password." };
      const { data, error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) return { success: false, error: "Sign-in failed. Check your email and password and try again." };
      const identity = identityFromAuth(data.user);
      if (targetRole && identity.role !== targetRole) {
        await createClient().auth.signOut();
        setUser(null);
        return { success: false, error: "This account does not have access to the selected workspace." };
      }
      setUser(identity); return { success: true };
    } catch { return { success: false, error: "Sign-in is temporarily unavailable. Try again." }; }
    finally { setIsLoading(false); }
  };
  const logout = async () => {
    if (!isLocalDemo) {
      const { error } = await createClient().auth.signOut();
      if (error) throw new Error("Sign-out failed. Try again.");
    }
    localStorage.removeItem("timora_active_user_id"); localStorage.removeItem("timora_active_role");
    document.cookie = "timora_user_role=; path=/; max-age=0";
    setUser(null); router.push("/login");
  };
  const requestPasswordReset: AuthContextType["requestPasswordReset"] = async (email) => {
    if (isLocalDemo) return { success: false, message: "Demo accounts do not send email. Use a demo account from the directory." };
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim());
      if (error) return { success: false, message: "The reset request could not be sent. Try again." };
      return { success: true, message: "If an account exists for this address, you will receive reset instructions." };
    } catch { return { success: false, message: "The reset service is unavailable. Try again." }; }
  };
  return <AuthContext.Provider value={{ user, role: user?.role || "student_viewer", isAuthenticated: !!user, isLoading, login, logout, requestPasswordReset }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
