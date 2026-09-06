"use client";

import { distillMemory } from "./ai";
import { todayKey } from "./dates";
import { useApp } from "./store";
import { cloudClearMemory, cloudDeleteMemory, cloudUpsertMemory } from "./cloud";
import type { ChatMessage, CreatureSnapshot } from "./aiTypes";

const GUESS =
  /muhtemelen|galiba|sanırım|sanirim|herhalde|tahminim|varsay|belki de|olabilir ki|görünüşe/i;

export function isSolidMemory(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < 8 || clean.length > 160) return false;
  if (GUESS.test(clean)) return false;
  return true;
}

export function memoryCount(userId: string) {
  const s = useApp.getState();
  return (s.chatThreads ?? [])
    .filter((t) => t.userId === userId)
    .reduce((n, t) => n + t.messages.length, 0);
}

export function shouldDistillMemory() {
  const s = useApp.getState();
  const user = s.users.find((u) => u.id === s.sessionUserId);
  if (!user?.aiOptIn) return false;
  const seen = memoryCount(user.id);
  if (seen < 8) return false;
  const cursor = (s.aiMemoryCursor ?? {})[user.id];
  if (!cursor) return true;
  if (seen - cursor.seen >= 16) return true;
  const today = todayKey(user.timezone);
  return cursor.at.slice(0, 10) < today && seen > cursor.seen;
}

export async function maybeDistillMemory(snapshot?: CreatureSnapshot) {
  if (!shouldDistillMemory()) return;
  const s = useApp.getState();
  const user = s.users.find((u) => u.id === s.sessionUserId);
  if (!user) return;
  const existing = (s.aiMemory ?? []).filter((n) => n.userId === user.id);
  const recent = (s.chatThreads ?? [])
    .filter((t) => t.userId === user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .flatMap((t) => t.messages)
    .slice(-40)
    .map((m) => ({ role: m.role, text: m.text }) as ChatMessage);
  if (recent.length < 4) return;
  const result = await distillMemory(
    recent,
    existing.map((n) => n.text),
    snapshot ?? {
      name: "",
      stage: "",
      streak: 0,
      longest: 0,
      totalGp: 0,
      health: "",
      todayDcs: null,
      todayDone: 0,
      todayPlanned: 0,
      today: todayKey(user.timezone),
      weekday: 0,
      preferredWindow: user.preferredWindow,
      restDay: user.restDayOfWeek,
      calendarEmpty: false,
      week: [],
      goals: [],
      memory: existing.map((n) => n.text),
    },
  );
  const seen = memoryCount(user.id);
  useApp.getState().markMemoryDistilled(seen);
  if (!result.ok) return;
  const kept = result.data.notes.filter((n) => isSolidMemory(n.text));
  const added = useApp.getState().addMemoryNotes(kept);
  for (const note of added) void cloudUpsertMemory(note);
}

export function deleteMemoryNote(id: string) {
  useApp.getState().removeMemory(id);
  void cloudDeleteMemory(id);
}

export function wipeMemory() {
  const s = useApp.getState();
  const user = s.users.find((u) => u.id === s.sessionUserId);
  useApp.getState().clearMemory();
  if (user) void cloudClearMemory(user.id);
}
