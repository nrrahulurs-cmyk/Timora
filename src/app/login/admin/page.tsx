import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Administrator Sign In — Timora Academic OS",
  description: "Institutional Governance & System Control Portal",
};

export default function AdminLoginPage() {
  return <LoginForm forcedRole="academic_admin" portalTitle="Administrator access" />;
}
