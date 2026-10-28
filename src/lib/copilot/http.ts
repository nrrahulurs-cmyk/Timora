import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { answerCopilot, copilotRequestSchema } from "./service";
import { actionKind, applyExtraClassAction, applyScheduleAction, type CopilotActor } from "./actions";
import { withDemoRepository } from "@/lib/repository/demo-store";
import { SEED_USERS } from "@/data/fixtures/users";
import { isLocalDemo, identityFromAuth } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { LocalDemoSchedulingRepository, SupabaseSchedulingRepository, type SchedulingRepository } from "@/lib/repository/scheduling-repository";

export async function handleCopilot(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    const text = await request.text();
    if (text.length > 120_000) return NextResponse.json({ error: "The conversation is too large. Start a new conversation." }, { status: 413 });
    const body = JSON.parse(text);
    const confirmation = body.action === "confirm";
    const perform = async (repository: SchedulingRepository, actor: CopilotActor) => {
      if (confirmation) {
        const { confirmationToken } = z.object({ confirmationToken: z.string().min(1).max(100_000) }).parse(body);
        return actionKind(confirmationToken) === "EXTRA_CLASS"
          ? applyExtraClassAction(confirmationToken, actor, repository)
          : applyScheduleAction(confirmationToken, actor, repository);
      }
      return answerCopilot(copilotRequestSchema.parse(body), actor, repository);
    };
    let output;
    if (isLocalDemo) {
      const role = request.cookies.get("timora_user_role")?.value || "timetable_coordinator";
      const user = SEED_USERS.find((item) => item.role === role);
      if (!user) return NextResponse.json({ error: "The demo identity is invalid." }, { status: 403 });
      const actor = { id: user.id, name: user.fullName, role: user.role };
      if (process.env.NODE_ENV === "production") {
        const repository = new LocalDemoSchedulingRepository();
        repository.setActor(actor);
        output = await perform(repository, actor);
      } else {
        output = await withDemoRepository(async (repository) => {
          repository.setActor(actor);
          return perform(repository, actor);
        }, confirmation);
      }
    } else {
      const client = await createClient();
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) return NextResponse.json({ error: "Sign in to use the Copilot." }, { status: 401 });
      if (process.env.TIMORA_COPILOT_LIVE_ENABLED !== "true") return NextResponse.json({ error: "Live Copilot access is awaiting institutional authorization setup." }, { status: 503 });
      const user = identityFromAuth(data.user);
      const repository = new SupabaseSchedulingRepository(client);
      repository.setUserContext(user.id, user.fullName, user.role);
      // Live action replay protection and atomic RPC deployment must be verified separately.
      if (confirmation) return NextResponse.json({ error: "Live Copilot writes are not enabled. Review this change in Timetable Studio." }, { status: 503 });
      output = await perform(repository, { id: user.id, name: user.fullName, role: user.role });
    }
    return NextResponse.json(output, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Some request fields are invalid. Review the request and try again." : error instanceof Error ? error.message : "The request failed. Try again.";
    return NextResponse.json({ error: message, success: false, message }, { status: 422 });
  }
}
