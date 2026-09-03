import { GAME_CONFIG } from "./gameConfig";
import { addDays, weekdayOf } from "./dates";
import { dailyCompletionScore, dcsForGoal } from "./growthEngine";
import { analyzeRoutine } from "./bond";
import type {
  BusySlot,
  DailyScore,
  Goal,
  Milestone,
  Task,
} from "./types";

export function goalProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0;
  const total = milestones.reduce((s, m) => s + m.weight, 0);
  if (total <= 0) return 0;
  const done = milestones
    .filter((m) => m.completedAt)
    .reduce((s, m) => s + m.weight, 0);
  return Math.round((done / total) * 100);
}

export function isTaskDone(task: Task) {
  return task.completed || task.status === "done";
}

/** Planned vs completed work — not estimated minutes on unfinished tasks. */
export function goalWorkProgress(tasks: Task[]): { pct: number; minutes: number } {
  const active = tasks.filter((t) => t.status !== "postponed");
  const plannedMinutes = active.reduce((s, t) => s + (t.estimatedDurationMinutes ?? 0), 0);
  const doneTasks = active.filter(isTaskDone);
  const minutes = doneTasks.reduce((s, t) => s + (t.estimatedDurationMinutes ?? 0), 0);
  if (plannedMinutes > 0) return { pct: Math.min(100, Math.round((minutes / plannedMinutes) * 100)), minutes };
  const plannedDays = new Set(active.map((t) => t.date)).size;
  const workedDays = new Set(doneTasks.map((t) => t.date)).size;
  if (plannedDays > 0) return { pct: Math.min(100, Math.round((workedDays / plannedDays) * 100)), minutes };
  return { pct: 0, minutes };
}

export function remainingToStreak(tasks: Task[]): {
  planned: number;
  done: number;
  remaining: number;
  met: boolean;
} {
  const active = tasks.filter((t) => t.status !== "postponed");
  const planned = active.length;
  const done = active.filter((t) => t.completed || t.status === "done").length;
  const plannedW = active.reduce((s, t) => s + t.weight, 0);
  const doneW = active
    .filter((t) => t.completed || t.status === "done")
    .reduce((s, t) => s + t.weight, 0);
  const threshold = plannedW * GAME_CONFIG.DCS_STREAK_THRESHOLD;
  if (planned === 0) return { planned: 0, done: 0, remaining: 0, met: false };
  if (doneW >= threshold) return { planned, done, remaining: 0, met: true };
  const leftover = active
    .filter((t) => !t.completed && t.status !== "done")
    .sort((a, b) => b.weight - a.weight);
  let acc = doneW;
  let n = 0;
  for (const task of leftover) {
    acc += task.weight;
    n += 1;
    if (acc >= threshold) break;
  }
  return { planned, done, remaining: n, met: false };
}

export function postponeTo(kind: "tomorrow" | "week" | "date", today: string, custom?: string) {
  if (kind === "tomorrow") return addDays(today, 1);
  if (kind === "week") return addDays(today, 7 - weekdayOf(today) || 7);
  return custom || addDays(today, 1);
}

export function weeklyReview(input: {
  userId: string;
  week: string[];
  tasks: Task[];
  scores: DailyScore[];
  goals: Goal[];
}) {
  const weekTasks = input.tasks.filter(
    (t) => t.userId === input.userId && input.week.includes(t.date) && t.status !== "postponed",
  );
  const done = weekTasks.filter((t) => t.completed || t.status === "done").length;
  const scores = input.scores.filter(
    (s) => s.userId === input.userId && input.week.includes(s.date),
  );
  const dcsVals = scores.filter((s) => s.dcs !== null).map((s) => s.dcs as number);
  const avg = dcsVals.length ? dcsVals.reduce((a, b) => a + b, 0) / dcsVals.length : 0;
  const activeDays = scores.filter((s) => s.isStreakDay).length;
  const gp = scores.reduce((s, x) => s + x.gpEarned, 0);
  let bestDay = "";
  let best = -1;
  for (const s of scores) {
    if ((s.dcs ?? -1) > best) {
      best = s.dcs ?? -1;
      bestDay = s.date;
    }
  }
  const byGoal = new Map<string, number>();
  for (const t of weekTasks) {
    if (!t.goalId) continue;
    byGoal.set(t.goalId, (byGoal.get(t.goalId) ?? 0) + (t.estimatedDurationMinutes ?? 30));
  }
  let topGoal = "";
  let topMin = 0;
  for (const [id, mins] of byGoal) {
    if (mins > topMin) {
      topMin = mins;
      topGoal = input.goals.find((g) => g.id === id)?.title ?? "";
    }
  }
  return {
    done,
    total: weekTasks.length,
    avgDcs: avg,
    activeDays,
    gp,
    bestDay,
    topGoal,
  };
}

export function insightBundle(input: {
  userId: string;
  today: string;
  timezone: string;
  tasks: Task[];
  scores: DailyScore[];
  goals: Goal[];
}) {
  const from30 = Date.parse(`${input.today}T00:00:00Z`) - 30 * 86_400_000;
  const window = input.scores.filter(
    (s) => s.userId === input.userId && Date.parse(`${s.date}T00:00:00Z`) >= from30,
  );
  const withDcs = window.filter((s) => s.dcs !== null);
  const avg = withDcs.length
    ? withDcs.reduce((s, x) => s + (x.dcs ?? 0), 0) / withDcs.length
    : 0;
  const first = withDcs.slice(0, Math.floor(withDcs.length / 2));
  const last = withDcs.slice(Math.floor(withDcs.length / 2));
  const avgFirst = first.length ? first.reduce((s, x) => s + (x.dcs ?? 0), 0) / first.length : 0;
  const avgLast = last.length ? last.reduce((s, x) => s + (x.dcs ?? 0), 0) / last.length : avg;
  const delta = Math.round((avgLast - avgFirst) * 100);
  const mine = input.tasks.filter((t) => t.userId === input.userId && t.status !== "postponed");
  const days = new Set(window.map((s) => s.date)).size || 1;
  const avgTasks = mine.filter((t) => Date.parse(`${t.date}T00:00:00Z`) >= from30).length / days;
  const routine = analyzeRoutine(mine, input.timezone, input.today);
  const byGoal = input.goals
    .filter((g) => g.userId === input.userId && g.status === "active")
    .map((g) => {
      const related = mine.filter((t) => t.goalId === g.id);
      const dcs = dcsForGoal(related, g.id);
      return { id: g.id, title: g.title, dcs: dcs ?? 0 };
    })
    .sort((a, b) => b.dcs - a.dcs);
  return {
    consistencyPct: Math.round(avg * 100),
    delta,
    avgTasks,
    avgDcs: avg,
    routine,
    strongestGoal: byGoal[0] ?? null,
    weakestGoal: byGoal.length > 1 ? byGoal[byGoal.length - 1] : null,
  };
}

export function overloadedWeekdays(tasks: Task[], today: string): { weekday: number; planned: number; suggested: number }[] {
  const from = Date.parse(`${today}T00:00:00Z`) - 42 * 86_400_000;
  const weeks: Record<number, { planned: number; done: number }[]> = {};
  for (let w = 0; w < 6; w++) {
    for (let d = 0; d < 7; d++) {
      weeks[d] = weeks[d] ?? [];
      weeks[d][w] = { planned: 0, done: 0 };
    }
  }
  for (const task of tasks) {
    if (task.status === "postponed") continue;
    const ts = Date.parse(`${task.date}T00:00:00Z`);
    if (ts < from) continue;
    const week = Math.min(5, Math.floor((Date.parse(`${today}T00:00:00Z`) - ts) / (7 * 86_400_000)));
    const wd = weekdayOf(task.date);
    const slot = weeks[wd][5 - week];
    if (!slot) continue;
    slot.planned += 1;
    if (task.completed || task.status === "done") slot.done += 1;
  }
  const out: { weekday: number; planned: number; suggested: number }[] = [];
  for (let wd = 0; wd < 7; wd++) {
    const rows = weeks[wd].filter((x) => x.planned > 0);
    const weak = rows.filter((x) => x.done / x.planned < 0.5).length;
    if (rows.length >= 4 && weak >= 4) {
      const avgPlan = rows.reduce((s, x) => s + x.planned, 0) / rows.length;
      out.push({
        weekday: wd,
        planned: Math.round(avgPlan),
        suggested: Math.max(1, Math.round(avgPlan * 0.6)),
      });
    }
  }
  return out;
}

export function collectBusy(tasks: Task[], extras: BusySlot[], userId: string, date: string): BusySlot[] {
  const fromTasks: BusySlot[] = tasks
    .filter((t) => t.userId === userId && t.date === date && t.status !== "postponed" && t.time)
    .map((t) => {
      const [h, m] = (t.time ?? "09:00").split(":").map(Number);
      const start = h * 60 + m;
      const dur = t.estimatedDurationMinutes ?? 30;
      return {
        id: `task-${t.id}`,
        userId,
        date,
        startMin: start,
        endMin: start + dur,
        source: "app" as const,
        title: t.title,
      };
    });
  return [...fromTasks, ...extras.filter((b) => b.userId === userId && b.date === date)];
}

export function findFreeSlots(busy: BusySlot[], dayStart = 8 * 60, dayEnd = 22 * 60): { startMin: number; endMin: number }[] {
  const blocks = [...busy].sort((a, b) => a.startMin - b.startMin);
  const free: { startMin: number; endMin: number }[] = [];
  let cursor = dayStart;
  for (const b of blocks) {
    if (b.startMin > cursor) free.push({ startMin: cursor, endMin: b.startMin });
    cursor = Math.max(cursor, b.endMin);
  }
  if (cursor < dayEnd) free.push({ startMin: cursor, endMin: dayEnd });
  return free.filter((s) => s.endMin - s.startMin >= 25);
}

export function scheduleHours(input: {
  hours: number;
  title: string;
  week: string[];
  tasks: Task[];
  busy: BusySlot[];
  userId: string;
}): { date: string; time: string; minutes: number }[] {
  const minutesNeeded = input.hours * 60;
  const placed: { date: string; time: string; minutes: number }[] = [];
  let left = minutesNeeded;
  for (const date of input.week) {
    if (left <= 0) break;
    const busy = collectBusy(input.tasks, input.busy, input.userId, date);
    for (const slot of findFreeSlots(busy)) {
      if (left <= 0) break;
      const take = Math.min(60, slot.endMin - slot.startMin, left);
      if (take < 25) continue;
      const h = Math.floor(slot.startMin / 60);
      const m = slot.startMin % 60;
      placed.push({
        date,
        time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        minutes: take,
      });
      left -= take;
    }
  }
  return placed;
}

export function goalAnalytics(input: {
  goal: Goal;
  milestones: Milestone[];
  tasks: Task[];
  scores: DailyScore[];
  today: string;
}) {
  const related = input.tasks.filter((t) => t.goalId === input.goal.id && t.status !== "postponed");
  const last30 = related.filter(
    (t) => Date.parse(`${t.date}T00:00:00Z`) >= Date.parse(`${input.today}T00:00:00Z`) - 30 * 86_400_000,
  );
  const plannedDays = new Set(last30.map((t) => t.date)).size;
  const workedDays = new Set(
    last30.filter(isTaskDone).map((t) => t.date),
  ).size;
  const dcsDays = [...new Set(last30.map((t) => t.date))].map((d) =>
    dailyCompletionScore(last30.filter((t) => t.date === d)),
  );
  const avg = dcsDays.filter((x) => x !== null) as number[];
  const work = goalWorkProgress(last30);
  let streak = 0;
  let best = 0;
  const days = [...new Set(related.map((t) => t.date))].sort();
  for (const d of days) {
    const ok = dailyCompletionScore(related.filter((t) => t.date === d));
    if (ok !== null && ok >= GAME_CONFIG.DCS_STREAK_THRESHOLD) {
      streak += 1;
      best = Math.max(best, streak);
    } else if (ok !== null) streak = 0;
  }
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.parse(`${input.today}T00:00:00Z`) - (6 - i) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return {
      date,
      dcs: dailyCompletionScore(related.filter((t) => t.date === date)),
    };
  });
  const remain = input.goal.targetDate
    ? Math.max(0, Math.round((Date.parse(`${input.goal.targetDate}T00:00:00Z`) - Date.parse(`${input.today}T00:00:00Z`)) / 86_400_000))
    : null;
  return {
    pct: work.pct,
    plannedDays,
    workedDays,
    avgDcs: avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length : 0,
    minutes: work.minutes,
    longest: best,
    last7,
    remain,
  };
}
