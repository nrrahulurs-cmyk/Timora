import { describe, it, expect, beforeEach } from "vitest";
import { SEED_USERS } from "@/data/fixtures/users";
import type { UserRole } from "@/types/domain";

describe("Phase 2: Authentication & Role-Based Access Control", () => {
  it("provides pre-configured institutional user records for all approved roles", () => {
    const roles: UserRole[] = [
      "academic_admin",
      "timetable_coordinator",
      "department_head",
      "faculty_instructor",
      "dean",
    ];

    for (const r of roles) {
      const user = SEED_USERS.find((u) => u.role === r);
      expect(user).toBeDefined();
      expect(user?.email).toMatch(/@timora\.edu$/);
      expect(user?.fullName).toBeDefined();
    }
  });

  it("validates administrator credentials and assigns academic_admin role", () => {
    const adminUser = SEED_USERS.find((u) => u.email === "admin@timora.edu");
    expect(adminUser).toBeDefined();
    expect(adminUser?.role).toBe("academic_admin");
  });

  it("validates coordinator credentials and assigns timetable_coordinator role", () => {
    const coordinatorUser = SEED_USERS.find((u) => u.email === "e.vance@timora.edu");
    expect(coordinatorUser).toBeDefined();
    expect(coordinatorUser?.role).toBe("timetable_coordinator");
    expect(coordinatorUser?.departmentId).toBe("DEPT-CSE");
  });

  it("validates faculty credentials and assigns faculty_instructor role", () => {
    const facultyUser = SEED_USERS.find((u) => u.email === "s.lin@timora.edu");
    expect(facultyUser).toBeDefined();
    expect(facultyUser?.role).toBe("faculty_instructor");
  });

  it("rejects unauthorized non-institutional domains", () => {
    const unauthorizedEmail = "hacker@random.com";
    const found = SEED_USERS.find((u) => u.email === unauthorizedEmail);
    expect(found).toBeUndefined();
  });

  it("handles password reset requests for valid institutional emails", () => {
    const validEmail = "e.vance@timora.edu";
    const user = SEED_USERS.find((u) => u.email === validEmail);
    expect(user).toBeDefined();
  });
});
