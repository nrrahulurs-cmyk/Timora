import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Student Sign In — Timora Academic OS",
  description: "Student Timetable Viewer & Class Schedule Portal",
};

export default function StudentLoginPage() {
  return <LoginForm forcedRole="student_viewer" portalTitle="Student access" />;
}
