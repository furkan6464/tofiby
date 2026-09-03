import { GAME_CONFIG } from "./gameConfig";
import { zonedParts } from "./dates";
import { dailyCompletionScore } from "./growthEngine";
import type { Task } from "./types";

export function reminderPayloads(input: {
  tasks: Task[];
  timezone: string;
  today: string;
  now?: Date;
  seen: Set<string>;
}): { key: string; title: string; body: { kind: "soon" | "now" | "streak"; task?: string; need?: number } }[] {
  const now = input.now ?? new Date();
  const parts = zonedParts(now, input.timezone);
  const minutesNow = parts.hour * 60 + parts.minute;
  const out: {
    key: string;
    title: string;
    body: { kind: "soon" | "now" | "streak"; task?: string; need?: number };
  }[] = [];
  const todayTasks = input.tasks.filter((x) => x.date === input.today);
  for (const task of todayTasks) {
    if (task.completed || task.status === "postponed" || !task.time) continue;
    const [h, m] = task.time.split(":").map(Number);
    const start = h * 60 + m;
    const offset = task.reminderOffsetMinutes ?? 120;
    if (minutesNow >= start - offset && minutesNow < start - offset + 2) {
      const key = `soon-${task.id}-${input.today}`;
      if (!input.seen.has(key)) out.push({ key, title: task.title, body: { kind: "soon", task: task.title } });
    }
    if (minutesNow >= start && minutesNow < start + 2) {
      const key = `now-${task.id}-${input.today}`;
      if (!input.seen.has(key)) out.push({ key, title: task.title, body: { kind: "now", task: task.title } });
    }
  }
  if (parts.hour === 23 && parts.minute < 2) {
    const dcs = dailyCompletionScore(todayTasks);
    if (dcs !== null && dcs < GAME_CONFIG.DCS_STREAK_THRESHOLD) {
      const need = Math.max(0, Math.round((GAME_CONFIG.DCS_STREAK_THRESHOLD - dcs) * 100));
      const key = `streak-${input.today}`;
      if (!input.seen.has(key)) {
        out.push({ key, title: "Tofiby", body: { kind: "streak", need } });
      }
    }
  }
  return out;
}
