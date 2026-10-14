import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Faculty Sign In — Timora Academic OS",
  description: "Instructor Teaching Schedule & Academic Exchange Portal",
};

export default function FacultyLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <LoginForm
        forcedRole="faculty_instructor"
        portalTitle="Faculty & Department Sign-In"
        portalDescription="Personal teaching timetable, class exchanges, and extra session proposals"
      />
    </div>
  );
}
