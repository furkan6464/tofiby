import { GAME_CONFIG } from "./gameConfig";
import type { Task } from "./types";

/** Minimum number of highest-weight tasks needed to hit the streak DCS threshold. */
export function enoughToday(tasks: Task[]): {
  need: number;
  total: number;
  done: number;
  met: boolean;
} {
  const active = tasks.filter((t) => t.status !== "postponed");
  const total = active.length;
  if (total === 0) return { need: 0, total: 0, done: 0, met: false };
  const planned = active.reduce((sum, t) => sum + t.weight, 0);
  const threshold = planned * GAME_CONFIG.DCS_STREAK_THRESHOLD;
  const doneW = active
    .filter((t) => t.completed || t.status === "done")
    .reduce((sum, t) => sum + t.weight, 0);
  const done = active.filter((t) => t.completed || t.status === "done").length;
  if (doneW >= threshold) return { need: 0, total, done, met: true };
  const remaining = [...active].sort((a, b) => b.weight - a.weight);
  let acc = 0;
  let n = 0;
  for (const task of remaining) {
    acc += task.weight;
    n += 1;
    if (acc >= threshold) break;
  }
  return { need: n, total, done, met: false };
}
