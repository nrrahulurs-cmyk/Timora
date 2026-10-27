import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withDemoRepository } from "@/lib/repository/demo-store";
import { demoQueries, demoMutations } from "@/lib/repository/demo-protocol";
import { SEED_USERS } from "@/data/fixtures/users";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return NextResponse.json({ error: "Demo workspace is disabled." }, { status: 404 });
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 1_000_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    const { method, args } = z.object({ method: z.string(), args: z.array(z.unknown()).max(10) }).strict().parse(JSON.parse(text));
    if (!demoQueries.has(method) && !demoMutations.has(method)) return NextResponse.json({ error: "Unknown workspace operation." }, { status: 400 });
    const role = request.cookies.get("timora_user_role")?.value || "timetable_coordinator";
    const actor = SEED_USERS.find((user) => user.role === role);
    if (!actor) return NextResponse.json({ error: "Choose a valid demo identity." }, { status: 403 });
    const administrators = ["academic_admin", "dean", "timetable_coordinator"];
    const allowed = demoQueries.has(method) || administrators.includes(role) || (role === "department_head" && /^(advance|reject)/.test(method)) || (role === "faculty_instructor" && /^(createExtraClassRequest|createTeacherExchangeRequest|updateTopicDelivery)$/.test(method));
    if (!allowed) return NextResponse.json({ error: "Your role cannot perform this operation." }, { status: 403 });
    const data = await withDemoRepository(async (repository) => {
      repository.setActor({ id: actor.id, name: actor.fullName, role: actor.role });
      if (/^(advance|approve|reject)/.test(method)) args[1] = actor.fullName;
      if (role === "faculty_instructor" && method.startsWith("create")) {
        const input = z.record(z.string(), z.unknown()).parse(args[0]);
        const dataset = await repository.getDataset();
        const facultyId = method === "createExtraClassRequest" ? input.facultyId : input.requesterFacultyId;
        if (!dataset.faculty.some(item => item.id === facultyId && item.userId === actor.id)) throw new Error("You can submit requests only for your own teaching assignments.");
      }
      if (role === "department_head" && /^(advance|reject)/.test(method)) {
        const dataset = await repository.getDataset();
        const request = method.includes("ExtraClass") ? dataset.extraClassRequests.find(item => item.id === args[0]) : dataset.teacherExchangeRequests.find(item => item.id === args[0]);
        const facultyId = request && ("facultyId" in request ? request.facultyId : request.requesterFacultyId);
        if (!dataset.faculty.some(item => item.id === facultyId && item.departmentId === actor.departmentId)) throw new Error("You can review requests only within your department.");
      }
      const operation = repository[method as keyof typeof repository] as (...parameters: unknown[]) => Promise<unknown>;
      return operation.apply(repository, args);
    }, demoMutations.has(method));
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The operation could not be completed." }, { status: 422 });
  }
}
