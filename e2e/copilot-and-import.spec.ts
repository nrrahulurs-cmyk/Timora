import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { IMPORT_COLUMNS, previewTimetableImport, type ImportRow } from "../src/lib/scheduling/import";
import { allocation } from "../src/lib/scheduling/plan";
import type { SynapseCollegeDataset } from "../src/types/domain";

async function dataset(request: APIRequestContext): Promise<SynapseCollegeDataset> {
  const response = await request.post("/api/demo-repository", { data: { method: "getDataset", args: [] } });
  expect(response.ok()).toBe(true);
  return (await response.json()).data;
}

async function signIn(page: Page) {
  await page.goto("/login");
  await expect(page.getByLabel("Email address")).toHaveValue("e.vance@timora.edu");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("timora2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Account and role" })).toBeVisible();
}

test("local sign-in requires the password and opens the chosen account", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome to Timora" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveValue("e.vance@timora.edu");
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("timora2026");
  await page.getByLabel("Sign in as").selectOption("faculty_instructor");
  await expect(page.getByLabel("Email address")).toHaveValue("s.lin@timora.edu");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("timora2026");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Sign-in failed");
  await page.getByLabel("Email address").fill("e.vance@timora.edu");
  await page.getByLabel("Password", { exact: true }).fill("timora2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("does not have access");
  await page.getByLabel("Email address").fill("s.lin@timora.edu");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Account and role" })).toContainText("Dr. Sarah Lin");
  await page.getByRole("button", { name: "Account and role" }).click();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await expect(page.getByText("Local demo roles")).toHaveCount(0);
});

test("Timo shows source records and a reviewable, dismissible proposal", async ({ page }) => {
  await signIn(page);
  await page.goto("/timetable");
  await expect(page.getByRole("heading", { name: "Timetable Studio" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Open Timora Copilot", exact: true }).click();
  const input = page.getByLabel("Message Timora Copilot");
  await input.fill("Find timetable sessions for CS-401");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("SESS-CS401-MON", { timeout: 15_000 });
  await input.fill("Find alternatives for SESS-CS401-MON");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const proposal = page.getByRole("button", { name: /^Move SESS-CS401-MON/ }).first();
  await expect(proposal).toBeVisible({ timeout: 15_000 });
  await proposal.click();
  await expect(page.getByTestId("copilot-action-preview")).toContainText("not yet saved");
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(page.getByTestId("copilot-action-preview")).toContainText("Proposal dismissed");
});

test("CSV import saves after validation and rejects a duplicate", async ({ page, request }) => {
  await signIn(page);
  const data = await dataset(request);
  let chosen: ImportRow | undefined;
  let importedId = "";
  for (let day = 2; day <= 23 && !chosen; day++) {
    const date = `2026-11-${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    for (const slot of data.timeSlots.filter(item => item.dayOfWeek === weekday)) {
      for (const room of data.classrooms) {
        const row: ImportRow = { course: "CS-401", section: "SEC-CSE-S5-A", faculty: "FAC-VANCE", room: room.id, day: weekday, start_time: slot.startTime, end_time: slot.endTime, date };
        const plan = previewTimetableImport([row], data).plan;
        if (plan) { chosen = row; importedId = plan.inserts[0].id; break; }
      }
      if (chosen) break;
    }
  }
  expect(chosen, "A feasible test class must exist").toBeDefined();
  const csv = IMPORT_COLUMNS.join(",") + "\n" + IMPORT_COLUMNS.map(column => chosen![column]).join(",");
  try {
    await page.goto("/timetable");
    await page.getByRole("button", { name: "Import timetable", exact: true }).click();
    await page.getByLabel("Choose timetable file").setInputFiles({ name: "timora-qa.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByLabel("Row 2 course")).toHaveValue("CS-401");
    await page.getByRole("button", { name: "Validate timetable", exact: true }).click();
    await expect(page.getByText(/1 sessions pass the checked constraints/)).toBeVisible();
    await page.getByRole("button", { name: "Confirm import of 1 session", exact: true }).click();
    await expect(page.getByText(/session saved and verified/)).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await page.reload();
    expect((await dataset(request)).timetableSessions.some(session => session.id === importedId)).toBe(true);
    await page.getByRole("button", { name: "Import timetable", exact: true }).click();
    await page.getByLabel("Choose timetable file").setInputFiles({ name: "timora-qa.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.getByRole("button", { name: "Validate timetable", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("already exists");
  } finally {
    const saved = (await dataset(request)).timetableSessions.find(session => session.id === importedId);
    if (saved && saved.status !== "cancelled") {
      const cleanup = await request.post("/api/demo-repository", { data: { method: "saveTimetableChanges", args: [{ updates: [{ id: saved.id, expected: allocation(saved), changes: { status: "cancelled" } }], inserts: [], reason: "Cancel completed automated import verification" }] } });
      expect((await cleanup.json()).data?.success).toBe(true);
    }
  }
});

test("viewer cannot save or elevate role through a chat request", async ({ request }) => {
  const headers = { Cookie: "timora_user_role=student_viewer" };
  const mutation = await request.post("/api/demo-repository", { headers, data: { method: "saveTimetableChanges", args: [{}] } });
  expect(mutation.status()).toBe(403);
  const chat = await request.post("/api/ask-timora", { headers, data: { message: "Move SESS-CS401-MON to Friday 08:30 in LH-201", userRole: "academic_admin", conversationHistory: [] } });
  expect(chat.ok()).toBe(true);
  const result = await chat.json();
  expect(result.reply).toContain("cannot apply");
  expect(result.actionPreview).toBeUndefined();
});

test("exchange request uses real sessions and states its approval limit", async ({ page, request }) => {
  await signIn(page);
  const data = await dataset(request);
  const active = data.timetableSessions.find(session => session.status !== "cancelled");
  expect(active).toBeDefined();
  await page.goto("/exchanges");
  await expect(page.getByRole("heading", { name: "Teacher Exchanges & Slot Swaps" })).toBeVisible();
  await expect(page.getByText("Peer Consent Recorded")).toBeVisible();
  await page.getByRole("button", { name: "Propose Teacher Swap" }).click();
  await page.getByLabel("Faculty Instructor").selectOption(active!.facultyId);
  await page.getByLabel("Session to Give Up").selectOption(active!.id);
  await expect(page.getByText(/This records a request; an exchange cannot be applied yet/)).toBeVisible();
});

test("light workspace and Timo work at desktop and phone sizes", async ({ page }) => {
  await signIn(page);
  await mkdir("/private/tmp/timora-qa", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Academic Operations Overview", exact: true })).toBeVisible();
  await page.screenshot({ path: "/private/tmp/timora-qa/desktop-overview.png" });
  await page.getByRole("button", { name: "Open Timora Copilot", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Timo, your academic copilot", exact: true })).toBeVisible();
  await page.screenshot({ path: "/private/tmp/timora-qa/desktop-timo.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Message Timora Copilot")).toBeInViewport();
  await page.screenshot({ path: "/private/tmp/timora-qa/mobile-timo.png" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("link", { name: "Extra classes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Extra classes", exact: true })).toBeVisible();
  await page.screenshot({ path: "/private/tmp/timora-qa/mobile-extra-classes.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
