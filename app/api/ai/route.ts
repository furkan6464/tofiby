import { NextResponse } from "next/server";
import { chat, chatContinue, parseSchedule, planGoal, suggestStudyHours } from "@/lib/aiClient";
import type {
  AiAction,
  AiToolTrace,
  ChatMessage,
  CreatureSnapshot,
  GoalPlanInput,
  StudySuggestInput,
} from "@/lib/aiTypes";

export const runtime = "nodejs";
export const maxDuration = 60;

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_input" }, { status: 400 });
  }
  const action = body.action as AiAction;
  try {
    if (action === "parseSchedule") {
      const mime = String(body.mime ?? "");
      const data = String(body.data ?? "");
      if (data.length > 6_000_000) {
        return NextResponse.json({ ok: false, error: "bad_input" }, { status: 413 });
      }
      return NextResponse.json(await parseSchedule({ mime, data }, String(body.note ?? "")));
    }
    if (action === "suggestStudyHours") {
      return NextResponse.json(await suggestStudyHours(body.payload as StudySuggestInput));
    }
    if (action === "planGoal") {
      return NextResponse.json(await planGoal(body.payload as GoalPlanInput));
    }
    if (action === "chat") {
      return NextResponse.json(
        await chat((body.messages as ChatMessage[]) ?? [], body.snapshot as CreatureSnapshot),
      );
    }
    if (action === "chatContinue") {
      return NextResponse.json(
        await chatContinue(
          (body.messages as ChatMessage[]) ?? [],
          body.snapshot as CreatureSnapshot,
          (body.traces as AiToolTrace[]) ?? [],
        ),
      );
    }
    return NextResponse.json({ ok: false, error: "bad_input" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 200 });
  }
}
