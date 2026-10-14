import { test, expect } from "@playwright/test";

test.describe("Timora Scheduling & Conflict Resolution Journey", () => {
  test("Complete Main Journey: Open conflict -> Understand reason -> Select alternative -> Preview diff -> Apply resolution", async ({
    page,
  }) => {
    // 1. Navigate to Conflicts page
    await page.goto("/conflicts");

    // Verify Conflicts Header and KPI cards
    await expect(page.locator("h1")).toContainText(/Conflict Resolution Center/i);
    await expect(page.locator("text=Active Conflicts").first()).toBeVisible();

    // 2. Locate CONF-01 (Room Clash in LH-201)
    const conf01Card = page.locator(".border", { hasText: "CONF-01" }).first();
    await expect(conf01Card).toBeVisible();

    // Click "Resolve Conflict" specifically on CONF-01 card
    await conf01Card.getByRole("button", { name: /Resolve Conflict/i }).click();

    // 3. Understand Reason in Drawer
    await expect(page.getByRole("heading", { name: /Classroom Double-Booking in LH-201/i })).toBeVisible();
    await expect(page.locator("text=Why Current Allocation Is Invalid:")).toBeVisible();
    await expect(page.locator("text=Room Constraint").first()).toBeVisible();
    await expect(page.locator("text=Affected Sessions").first()).toBeVisible();

    // 4. Select Valid Alternative (Option 1: SOL-01-A)
    const option1 = page.locator("text=Option 1: SOL-01-A").first();
    await expect(option1).toBeVisible();
    await option1.click();

    // 5. Preview Changes in Diff
    const previewDiffButton = page.getByRole("button", { name: /Preview Diff/i });
    if (await previewDiffButton.isVisible()) {
      await previewDiffButton.click();
      await expect(page.locator("text=Deterministic Verification: Safe to Apply")).toBeVisible();
      await expect(page.locator("text=Sessions Being Modified").first()).toBeVisible();
      await expect(page.locator("text=Before Allocation").first()).toBeVisible();
    }

    // 6. Apply Correction
    const applyButton = page.getByRole("button", { name: /Apply Resolution/i });
    await expect(applyButton).toBeVisible();
    await expect(applyButton).toBeEnabled();
    await applyButton.click();

    // Verify Success Toast and Undo capability
    await expect(page.locator("text=Conflict Resolved Successfully").first()).toBeVisible({ timeout: 10000 });
    const undoButton = page.getByRole("button", { name: /Undo Last Change/i });
    await expect(undoButton).toBeVisible();

    // Self-restore: click undo to restore pristine schedule state
    await undoButton.click();
    await expect(page.locator("text=Conflict Resolution Undone").first()).toBeVisible({ timeout: 10000 });

    // 7. Verify persisted timetable remains valid
    await page.keyboard.press("Escape");

    // Navigate to Timetable Studio to verify timetable loads cleanly
    await page.goto("/timetable");
    await expect(page.locator("h1")).toContainText(/Timetable Studio/i);
    await expect(page.getByRole("button", { name: /Publish Schedule/i })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("Unsolvable Conflict (CONF-05): Displays physical barriers and prevents automated override", async ({
    page,
  }) => {
    await page.goto("/conflicts");

    // Filter to "No Feasible Alternative"
    const noAltFilter = page.getByRole("button", { name: /No Feasible Alternative/i });
    await expect(noAltFilter).toBeVisible();
    await noAltFilter.click();

    // Locate CONF-05
    await expect(page.locator("text=CONF-05").first()).toBeVisible();
    await expect(page.locator("text=NO ALTERNATIVE ON CAMPUS").first()).toBeVisible();

    // Open Diagnostics
    const inspectBtn = page.getByRole("button", { name: /Inspect Diagnostics/i }).first();
    await inspectBtn.click();

    // Verify explanation of no feasible solution
    await expect(page.locator("text=No Feasible On-Campus Alternative Found")).toBeVisible();
    await expect(page.locator("text=Statutory Compliance & Physical Barriers:")).toBeVisible();
    await expect(page.locator("text=Strict Regulatory Prohibitions:")).toBeVisible();

    // Verify that Apply Resolution is NOT available, only Escalate to Dean
    await expect(page.getByRole("button", { name: /Apply Resolution/i })).not.toBeVisible();
    const escalateBtn = page.getByRole("button", { name: /Escalate to Dean/i });
    await expect(escalateBtn).toBeVisible();
    await escalateBtn.click();

    // Verify escalation toast
    await expect(page.locator("text=Administrative Escalation Initiated").first()).toBeVisible();
  });

  test("Analytics Dashboard: Displays Recharts utilization, workload, and syllabus completion", async ({
    page,
  }) => {
    await page.goto("/analytics");

    // Verify Page Header
    await expect(page.locator("h1")).toContainText(/Institutional Scheduling Analytics/i);

    // Verify KPI Metric Cards
    await expect(page.locator("text=Facility Occupancy Index")).toBeVisible();
    await expect(page.locator("text=Peak Time Band Saturation")).toBeVisible();
    await expect(page.locator("text=Active Learning Rooms")).toBeVisible();
    await expect(page.locator("text=Workload Compliance Rate")).toBeVisible();

    // Verify Chart Sections
    await expect(page.locator("text=Occupied vs. Available Eligible Room-Slots by Day")).toBeVisible();
    await expect(page.locator("text=Faculty Workload Distribution vs. Statutory Ceilings")).toBeVisible();
    await expect(page.locator("text=Schedule Conflicts by Category & Severity")).toBeVisible();
    await expect(page.locator("text=Syllabus Delivery Progress vs. Target Benchmarks")).toBeVisible();
    await expect(page.locator("text=Academic Operations Request Pipeline")).toBeVisible();

    // Verify Utilization Benchmark Data Table
    await expect(page.locator("text=Classroom & Facility Utilization Benchmarks")).toBeVisible();
    await expect(page.locator("text=LH-201").first()).toBeVisible();
    await expect(page.locator("text=LH-102").first()).toBeVisible();
  });

  test("Version Publishing & Rollback: Audited non-destructive schedule lifecycle", async ({
    page,
  }) => {
    await page.goto("/history");

    // Verify History Header
    await expect(page.locator("h1")).toContainText(/Change History, Publishing & Version Governance/i);

    // Verify Published vs Draft Timeline Cards
    await expect(page.locator("text=Current Live Version").first()).toBeVisible();
    await expect(page.locator("text=Staged Working Draft").first()).toBeVisible();
    await expect(page.locator("text=Version History & Release Management")).toBeVisible();

    // Test Pre-Publication Preview Trigger
    const previewPublishBtn = page.getByRole("button", { name: /Publish Current Draft/i }).first();
    await expect(previewPublishBtn).toBeVisible();
    await previewPublishBtn.click();

    // Verify Pre-Publication Modal content
    await expect(page.locator("text=Pre-Publication Validation & Before/After Diff")).toBeVisible();
    await expect(page.locator("text=Baseline Version").first()).toBeVisible();
    await expect(page.locator("text=Proposed Version").first()).toBeVisible();
    await expect(page.locator("text=Scheduled Sessions").first()).toBeVisible();

    // Close Modal
    await page.keyboard.press("Escape");

    // Verify Audit History Table
    await expect(page.locator("text=Chronological Audit Trail")).toBeVisible();
    await expect(page.locator("text=Dr. Eleanor Vance").first()).toBeVisible();
  });

  test("Ask Timora Copilot: Responds deterministically even with AI fallback", async ({
    request,
  }) => {
    // Test API route directly to verify deterministic fallback and safety
    const response = await request.post("/api/ask-synapse", {
      data: {
        message: "Find conflicts currently in the schedule",
        userRole: "academic_admin",
      },
    });

    expect(response.ok()).toBe(true);
    const json = await response.json();
    expect(json.reply).toBeDefined();
    expect(json.reply.length).toBeGreaterThan(10);
    // Should reference conflicts or schedule analysis
    expect(json.reply.toLowerCase()).toMatch(/conflict|clash|schedule|lh-201|found/i);
    expect(json.toolResults).toBeDefined();
    expect(json.toolResults.length).toBeGreaterThan(0);
  });
});
