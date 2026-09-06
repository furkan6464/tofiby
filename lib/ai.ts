"use client";

import { collectBusy, findFreeSlots } from "./plan";
import { addDays, todayKey, weekdayOf } from "./dates";
import { timeFromMinutes } from "./timeBlock";
import { useApp, useSession } from "./store";
import type {
  AiResult,
  AiToolTrace,
  ChatMessage,
  ChatReply,
  CreatureSnapshot,
  FreeWindow,
  GoalPlanDraft,
  GoalPlanInput,
  ScheduleLesson,
  StudySlot,
  StudySuggestInput,
} from "./aiTypes";
import type { BusySlot, Goal, Task } from "./types";

export function useAiEnabled() {
  return Boolean(useSession()?.aiOptIn);
}

let pendingGrant: (() => void) | null = null;

function currentAiOptIn() {
  const s = useApp.getState();
  const user = s.users.find((u) => u.id === s.sessionUserId);
  return Boolean(user?.aiOptIn);
}

export function requestAiAccess(onGranted: () => void) {
  if (currentAiOptIn()) {
    onGranted();
    return;
  }
  pendingGrant = onGranted;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("tofiby:ai-ask"));
}

export function grantAiAccess() {
  useApp.getState().updateSettings({ aiOptIn: true });
  const fn = pendingGrant;
  pendingGrant = null;
  fn?.();
}

export function denyAiAccess() {
  pendingGrant = null;
}

export function openAiChat(threadId?: string) {
  requestAiAccess(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("tofiby:aichat", { detail: { threadId } }));
  });
}

export function openAiHistory() {
  requestAiAccess(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("tofiby:aichat", { detail: { history: true } }));
  });
}

async function post<T>(body: Record<string, unknown>): Promise<AiResult<T>> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as AiResult<T>;
    if (json && typeof json === "object" && "ok" in json) return json;
    return { ok: false, error: "unavailable" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result ?? "");
      resolve(s.includes(",") ? s.split(",")[1] : s);
    };
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

export async function parseSchedule(file: File, note = ""): Promise<AiResult<ScheduleLesson[]>> {
  if (file.size > 3_500_000) return { ok: false, error: "bad_input" };
  const mime = file.type || "image/jpeg";
  const data = await fileToBase64(file);
  return post({ action: "parseSchedule", mime, data, note });
}

export async function suggestStudyHours(payload: StudySuggestInput): Promise<AiResult<StudySlot[]>> {
  return post({ action: "suggestStudyHours", payload });
}

export async function planGoal(payload: GoalPlanInput): Promise<AiResult<GoalPlanDraft>> {
  return post({ action: "planGoal", payload });
}

export async function chat(
  messages: ChatMessage[],
  snapshot: CreatureSnapshot,
): Promise<AiResult<ChatReply>> {
  return post({ action: "chat", messages, snapshot });
}

export async function distillMemory(
  messages: ChatMessage[],
  existing: string[],
  snapshot: CreatureSnapshot,
): Promise<AiResult<{ notes: { text: string; source: "said" | "observed" }[] }>> {
  return post({ action: "distillMemory", messages, existing, snapshot });
}

export async function chatContinue(
  messages: ChatMessage[],
  snapshot: CreatureSnapshot,
  traces: AiToolTrace[],
): Promise<AiResult<ChatReply>> {
  return post({ action: "chatContinue", messages, snapshot, traces });
}

export function weekFreeWindows(
  userId: string,
  timezone: string,
  tasks: Task[],
  busy: BusySlot[],
  days = 7,
): FreeWindow[] {
  const today = todayKey(timezone);
  const out: FreeWindow[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const slots = findFreeSlots(collectBusy(tasks, busy, userId, date));
    for (const slot of slots.slice(0, 4)) {
      out.push({
        date,
        weekday: weekdayOf(date),
        start: timeFromMinutes(slot.startMin),
        end: timeFromMinutes(slot.endMin),
      });
    }
  }
  return out;
}

export function goalNeedMinutes(goal: Pick<Goal, "weeklyFrequency" | "dailyDurationMinutes">) {
  const freq = goal.weeklyFrequency ?? 5;
  const mins = goal.dailyDurationMinutes ?? 30;
  return { weeklyFrequency: freq, weeklyMinutes: freq * mins };
}
