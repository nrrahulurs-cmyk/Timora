import { describe, it, expect, beforeEach } from "vitest";
import { SEED_USERS } from "@/data/fixtures/users";
import type { UserRole } from "@/types/domain";

describe("Local account fixtures", () => {
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

  it("includes an administrator account", () => {
    const adminUser = SEED_USERS.find((u) => u.email === "admin@timora.edu");
    expect(adminUser).toBeDefined();
    expect(adminUser?.role).toBe("academic_admin");
  });

  it("includes a coordinator account", () => {
    const coordinatorUser = SEED_USERS.find((u) => u.email === "e.vance@timora.edu");
    expect(coordinatorUser).toBeDefined();
    expect(coordinatorUser?.role).toBe("timetable_coordinator");
    expect(coordinatorUser?.departmentId).toBe("DEPT-CSE");
  });

  it("includes a faculty account", () => {
    const facultyUser = SEED_USERS.find((u) => u.email === "s.lin@timora.edu");
    expect(facultyUser).toBeDefined();
    expect(facultyUser?.role).toBe("faculty_instructor");
  });

  it("does not include an unrelated account", () => {
    const unauthorizedEmail = "hacker@random.com";
    const found = SEED_USERS.find((u) => u.email === unauthorizedEmail);
    expect(found).toBeUndefined();
  });

});
