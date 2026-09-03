import { hourInZone, weekdayOf } from "./dates";
import type { Creature, DailyScore, Task } from "./types";

export const ROOM_ITEMS = [
  "plant",
  "bookshelf",
  "bed",
  "photo",
  "desk",
  "toy",
] as const;

export type RoomItemId = (typeof ROOM_ITEMS)[number];

export function roomUnlocks(input: {
  creature: Creature;
  scores: DailyScore[];
  hasHiddenAchievement: boolean;
  married: boolean;
}): RoomItemId[] {
  const { creature, scores, hasHiddenAchievement, married } = input;
  const activeDays = scores.filter(
    (s) => s.userId === creature.ownerId && s.isStreakDay,
  ).length;
  const have = new Set(creature.unlockedRoomItems);
  const next: RoomItemId[] = [];
  const add = (id: RoomItemId) => {
    if (!have.has(id)) next.push(id);
  };
  if (creature.currentStreak >= 30 || creature.longestStreak >= 30) add("plant");
  if (activeDays >= 100) add("bookshelf");
  if (creature.adultReachedAt || ["adult", "elder"].includes(creature.stage)) add("bed");
  if (married || creature.marriedAt) add("photo");
  if (creature.stage === "elder") add("desk");
  if (hasHiddenAchievement) add("toy");
  return [...creature.unlockedRoomItems.filter((id) => ROOM_ITEMS.includes(id as RoomItemId)), ...next] as RoomItemId[];
}

export function isRestWeekday(dateKey: string, restDayOfWeek: number | null): boolean {
  if (restDayOfWeek === null || restDayOfWeek === undefined) return false;
  return weekdayOf(dateKey) === restDayOfWeek;
}

export function nightHours(hour: number): boolean {
  return hour >= 0 && hour < 7;
}

export function shouldSleep(input: {
  timezone: string;
  restDay: boolean;
  sick: boolean;
  lastActiveDate: string | null;
  today: string;
  now?: Date;
}): boolean {
  if (input.restDay || input.sick) return false;
  const hour = hourInZone(input.timezone, input.now);
  if (nightHours(hour)) return true;
  if (input.lastActiveDate) {
    const gap =
      Date.parse(`${input.today}T00:00:00Z`) -
      Date.parse(`${input.lastActiveDate}T00:00:00Z`);
    if (gap >= 3 * 86_400_000) return true;
  }
  return false;
}

export function analyzeRoutine(
  tasks: Task[],
  timezone: string,
  today: string,
): {
  counts: Record<"morning" | "noon" | "evening" | "night", number>;
  total: number;
  dominant: "morning" | "noon" | "evening" | "night" | null;
  pct: number;
} {
  const from = Date.parse(`${today}T00:00:00Z`) - 56 * 86_400_000;
  const counts = { morning: 0, noon: 0, evening: 0, night: 0 };
  let total = 0;
  for (const task of tasks) {
    if (!task.completed || !task.completedAt) continue;
    if (Date.parse(task.completedAt) < from) continue;
    const hour = hourInZone(timezone, new Date(task.completedAt));
    const bucket =
      hour >= 6 && hour < 12
        ? "morning"
        : hour >= 12 && hour < 17
          ? "noon"
          : hour >= 17 && hour < 22
            ? "evening"
            : "night";
    counts[bucket] += 1;
    total += 1;
  }
  if (total === 0) return { counts, total, dominant: null, pct: 0 };
  const dominant = (Object.keys(counts) as Array<keyof typeof counts>).sort(
    (a, b) => counts[b] - counts[a],
  )[0];
  const pct = counts[dominant] / total;
  return { counts, total, dominant: pct > 0.6 ? dominant : null, pct };
}

export function yearWrap(input: {
  userId: string;
  year: number;
  scores: DailyScore[];
  completedGoalCount: number;
}): {
  year: number;
  activeDays: number;
  totalGp: number;
  longestStreak: number;
  completedGoals: number;
  busiestWeekday: number | null;
} {
  const mine = input.scores.filter(
    (s) => s.userId === input.userId && s.date.startsWith(String(input.year)),
  );
  const byWeek: number[] = Array(7).fill(0);
  const countWeek: number[] = Array(7).fill(0);
  let run = 0;
  let best = 0;
  const sorted = [...mine].sort((a, b) => a.date.localeCompare(b.date));
  for (const s of sorted) {
    if (s.isStreakDay) {
      run += 1;
      best = Math.max(best, run);
    } else if (s.dcs !== null) {
      run = 0;
    }
    const wd = weekdayOf(s.date);
    countWeek[wd] += 1;
    byWeek[wd] += s.dcs ?? 0;
  }
  let busiest: number | null = null;
  let bestAvg = -1;
  for (let i = 0; i < 7; i++) {
    if (!countWeek[i]) continue;
    const avg = byWeek[i] / countWeek[i];
    if (avg > bestAvg) {
      bestAvg = avg;
      busiest = i;
    }
  }
  return {
    year: input.year,
    activeDays: mine.filter((s) => s.isStreakDay).length,
    totalGp: mine.reduce((sum, s) => sum + s.gpEarned, 0),
    longestStreak: best,
    completedGoals: input.completedGoalCount,
    busiestWeekday: busiest,
  };
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function consistencyProfile(input: {
  userId: string;
  today: string;
  scores: DailyScore[];
  longestStreak: number;
}) {
  const from = Date.parse(`${input.today}T00:00:00Z`) - 90 * 86_400_000;
  const window = input.scores.filter((s) => {
    if (s.userId !== input.userId) return false;
    return Date.parse(`${s.date}T00:00:00Z`) >= from;
  });
  const withDcs = window.filter((s) => s.dcs !== null);
  const avg =
    withDcs.length === 0
      ? 0
      : withDcs.reduce((sum, s) => sum + (s.dcs ?? 0), 0) / withDcs.length;
  const byWd: { n: number; sum: number }[] = Array.from({ length: 7 }, () => ({
    n: 0,
    sum: 0,
  }));
  for (const s of withDcs) {
    const wd = weekdayOf(s.date);
    byWd[wd].n += 1;
    byWd[wd].sum += s.dcs ?? 0;
  }
  const avgs = byWd.map((x, i) => ({
    day: i,
    avg: x.n ? x.sum / x.n : -1,
  }));
  const ranked = [...avgs].filter((x) => x.avg >= 0).sort((a, b) => b.avg - a.avg);
  return {
    overallPct: Math.round(avg * 100),
    averageDcs: avg,
    longestStreak: input.longestStreak,
    strongest: ranked.slice(0, 2).map((x) => DAY_KEYS[x.day]),
    weakest: ranked.length ? DAY_KEYS[ranked[ranked.length - 1].day] : null,
  };
}

export function pickStoryKind(input: {
  taskCount: number;
  dcs: number | null;
  streak: number;
  returned: boolean;
}): "none" | "perfect" | "streak7" | "streak14" | "streak30" | "return" | "idle" {
  if (input.returned) return "return";
  if (input.taskCount === 0) return "none";
  if (input.dcs === 1) return "perfect";
  if (input.streak > 0 && input.streak % 30 === 0) return "streak30";
  if (input.streak > 0 && input.streak % 14 === 0) return "streak14";
  if (input.streak > 0 && input.streak % 7 === 0) return "streak7";
  return "idle";
}
