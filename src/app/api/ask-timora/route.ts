import { NextRequest, NextResponse } from "next/server";
import { askTimoraCopilot, commitConfirmedAction } from "@/lib/gemini/assistant";
import type { UserRole } from "@/types/domain";

/**
 * POST /api/ask-timora
 * Authoritative Server-only endpoint connecting clients to Ask Timora Copilot.
 * Supports informational queries with controlled tool executions, live DB context,
 * and secure two-phase action commits (Interpret -> Validate -> Preview -> Confirm -> Revalidate -> Commit).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if this is a confirmation commit action
    if (body.action === "confirm") {
      const { confirmationToken, userRole } = body;
      if (!confirmationToken || typeof confirmationToken !== "string") {
        return NextResponse.json(
          { success: false, message: "Missing or invalid confirmationToken for action commit." },
          { status: 400 }
        );
      }

      // Enforce role authorization for commits
      const role: UserRole = userRole || "academic_admin";
      if (role === "student_viewer") {
        return NextResponse.json(
          {
            success: false,
            message: "Authorization Denied: Student accounts do not have permission to commit schedule modifications.",
          },
          { status: 403 }
        );
      }

      const commitResult = await commitConfirmedAction(confirmationToken, role);
      return NextResponse.json(commitResult, {
        status: commitResult.success ? 200 : 422,
      });
    }

    // Informational or preview query
    const { message, conversationHistory, userRole } = body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "A valid non-empty 'message' string is required." },
        { status: 400 }
      );
    }

    const role: UserRole = userRole || "academic_admin";
    const copilotResult = await askTimoraCopilot(
      message.trim(),
      Array.isArray(conversationHistory) ? conversationHistory : [],
      role
    );

    return NextResponse.json(copilotResult);
  } catch (error: any) {
    console.error("[Ask Timora API Error]:", error);
    return NextResponse.json(
      {
        error: "An unexpected server error occurred while processing your request.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
