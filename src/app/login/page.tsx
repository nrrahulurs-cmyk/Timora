import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign In — Timora Academic Scheduling OS",
  description: "Enterprise Timetable Management & Academic Operations Platform",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}
