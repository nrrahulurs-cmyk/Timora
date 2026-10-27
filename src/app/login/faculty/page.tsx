import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Faculty Sign In — Timora Academic OS",
  description: "Instructor Teaching Schedule & Academic Exchange Portal",
};

export default function FacultyLoginPage() {
  return <LoginForm forcedRole="faculty_instructor" portalTitle="Faculty access" />;
}
