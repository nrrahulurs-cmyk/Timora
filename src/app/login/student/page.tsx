import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Student Sign In — Timora Academic OS",
  description: "Student Timetable Viewer & Class Schedule Portal",
};

export default function StudentLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <LoginForm
        forcedRole="student_viewer"
        portalTitle="Student Schedule Sign-In"
        portalDescription="View weekly cohort timetable, room assignments, and academic schedule updates"
      />
    </div>
  );
}
