import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Administrator Sign In — Timora Academic OS",
  description: "Institutional Governance & System Control Portal",
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <LoginForm
        forcedRole="academic_admin"
        portalTitle="Institutional Administrator Sign-In"
        portalDescription="Governance, curriculum authorization, and university policy administration"
      />
    </div>
  );
}
