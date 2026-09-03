import { addDays, weekdayOf } from "./dates";
import type { FrequencyPattern } from "./types";

const WEEKDAYS = [1, 2, 3, 4, 5];

export function spreadDays(times: number): number[] {
  const n = Math.min(7, Math.max(1, times));
  const pool = [1, 2, 3, 4, 5, 6, 0];
  if (n === 7) return pool;
  const out: number[] = [];
  const step = pool.length / n;
  for (let i = 0; i < n; i++) {
    const day = pool[Math.round(i * step) % pool.length];
    if (!out.includes(day)) out.push(day);
  }
  return out;
}

export function matchesFrequency(date: string, freq: FrequencyPattern): boolean {
  const wd = weekdayOf(date);
  switch (freq.kind) {
    case "daily":
      return true;
    case "weekdays":
      return WEEKDAYS.includes(wd);
    case "times_per_week":
      return spreadDays(freq.timesPerWeek ?? 3).includes(wd);
    case "custom":
      return (freq.weekdays ?? []).includes(wd);
    default:
      return false;
  }
}

export function enumerateDates(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}
