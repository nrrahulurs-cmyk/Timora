import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Coordinator Sign In — Timora Academic OS",
  description: "Timetable Studio & Academic Resource Coordination Portal",
};

export default function CoordinatorLoginPage() {
  return <LoginForm forcedRole="timetable_coordinator" portalTitle="Coordinator access" />;
}
