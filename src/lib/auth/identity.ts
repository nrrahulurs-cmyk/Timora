import type { User as AuthUser } from "@supabase/supabase-js";
import type { User, UserRole } from "@/types/domain";

export const USER_ROLES: UserRole[] = ["academic_admin", "timetable_coordinator", "dean", "department_head", "faculty_instructor", "student_viewer"];
export const isLocalDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true" && process.env.NODE_ENV !== "production";

/** app_metadata is managed by the server; user_metadata may only supply display text. */
export function identityFromAuth(auth: AuthUser): User {
  const candidate = auth.app_metadata?.role as UserRole;
  return {
    id: auth.id, email: auth.email || "", fullName: auth.user_metadata?.full_name || auth.email || "Institution member",
    role: USER_ROLES.includes(candidate) ? candidate : "student_viewer",
    departmentId: auth.app_metadata?.department_id,
    createdAt: auth.created_at, updatedAt: auth.updated_at || auth.created_at,
  };
}
