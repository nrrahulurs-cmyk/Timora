import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Coordinator Sign In — Timora Academic OS",
  description: "Timetable Studio & Academic Resource Coordination Portal",
};

export default function CoordinatorLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <LoginForm
        forcedRole="timetable_coordinator"
        portalTitle="Timetable Coordinator Sign-In"
        portalDescription="Schedule collision resolution, facility allocation, and draft publishing"
      />
    </div>
  );
}
