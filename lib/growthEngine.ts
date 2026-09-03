import {
  GAME_CONFIG,
  GP_STAGE_THRESHOLDS,
  STAGE_ORDER,
  type CreatureStage,
  type HealthStatus,
} from "./gameConfig";
import { diffDays } from "./dates";
import type { DailyScore, Task } from "./types";

export function consistencyMultiplier(streak: number): number {
  return 1 + GAME_CONFIG.CONSISTENCY_K * Math.log(streak + 1);
}

export function activeDayTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status !== "postponed");
}

export function dailyCompletionScore(tasks: Task[]): number | null {
  const active = activeDayTasks(tasks);
  if (active.length === 0) return null;
  const planned = active.reduce((sum, t) => sum + t.weight, 0);
  if (planned <= 0) return null;
  const done = active
    .filter((t) => t.completed || t.status === "done")
    .reduce((sum, t) => sum + t.weight, 0);
  return done / planned;
}

/** Reporting-only DCS for one goal. Does not affect GP or evolution. */
export function dcsForGoal(tasks: Task[], goalId: string): number | null {
  return dailyCompletionScore(tasks.filter((t) => t.goalId === goalId));
}

export function isStreakDay(dcs: number | null): boolean {
  if (dcs === null) return false;
  return dcs >= GAME_CONFIG.DCS_STREAK_THRESHOLD;
}

export function isZeroActivityDay(dcs: number | null): boolean {
  return dcs === null || dcs === 0;
}

export function dailyGp(dcs: number | null, streakAfterToday: number): number {
  if (dcs === null) return 0;
  return (
    GAME_CONFIG.BASE_POINTS_PER_DAY *
    consistencyMultiplier(streakAfterToday) *
    dcs
  );
}

export function nextStreak(currentStreak: number, dcs: number | null): number {
  if (dcs === null) return currentStreak;
  if (isStreakDay(dcs)) return currentStreak + 1;
  return 0;
}

/**
 * Egg stays until the first streak day (HATCH_TRIGGER), independent of GP.
 * After hatch, baby is the floor; later stages use GP thresholds.
 */
export function stageForGp(totalGp: number, hatched: boolean): CreatureStage {
  if (!hatched) return "egg";
  if (totalGp >= GP_STAGE_THRESHOLDS.elder) return "elder";
  if (totalGp >= GP_STAGE_THRESHOLDS.adult) return "adult";
  if (totalGp >= GP_STAGE_THRESHOLDS.teen) return "teen";
  if (totalGp >= GP_STAGE_THRESHOLDS.child) return "child";
  return "baby";
}

export function nextStage(stage: CreatureStage): CreatureStage | null {
  const i = STAGE_ORDER.indexOf(stage);
  return i < 0 || i === STAGE_ORDER.length - 1 ? null : STAGE_ORDER[i + 1];
}

export function gpToNextStage(
  totalGp: number,
  hatched: boolean,
): {
  current: CreatureStage;
  next: CreatureStage | null;
  have: number;
  need: number;
  ratio: number;
} {
  const current = stageForGp(totalGp, hatched);
  if (!hatched) {
    return { current: "egg", next: "baby", have: 0, need: 0, ratio: 0 };
  }
  const nxt = nextStage(current);
  if (current === "baby") {
    const ceil = GP_STAGE_THRESHOLDS.child;
    return {
      current,
      next: "child",
      have: totalGp,
      need: Math.max(0, ceil - totalGp),
      ratio: Math.min(1, totalGp / ceil),
    };
  }
  const floor =
    current === "child"
      ? GP_STAGE_THRESHOLDS.child
      : current === "teen"
        ? GP_STAGE_THRESHOLDS.teen
        : current === "adult"
          ? GP_STAGE_THRESHOLDS.adult
          : GP_STAGE_THRESHOLDS.elder;
  const ceil = nxt && nxt !== "baby" ? (GP_STAGE_THRESHOLDS as Record<string, number>)[nxt] ?? floor : floor;
  const span = Math.max(1, ceil - floor);
  const have = Math.max(0, totalGp - floor);
  return {
    current,
    next: nxt,
    have,
    need: nxt ? Math.max(0, ceil - totalGp) : 0,
    ratio: nxt ? Math.min(1, have / span) : 1,
  };
}

export function unionBarPct(
  adultReachedAt: string | null,
  adultGpSnapshot: number | null,
  totalGp: number,
  today: string,
): number {
  if (!adultReachedAt || adultGpSnapshot === null) return 0;
  const days = Math.max(0, diffDays(adultReachedAt.slice(0, 10), today));
  const gpSince = Math.max(0, totalGp - adultGpSnapshot);
  const timePart = Math.min(
    GAME_CONFIG.UNION_TIME_WEIGHT,
    (days / GAME_CONFIG.UNION_MIN_DAYS_POST_ADULT) *
      GAME_CONFIG.UNION_TIME_WEIGHT,
  );
  const gpPart = Math.min(
    GAME_CONFIG.UNION_GP_WEIGHT,
    (gpSince / GAME_CONFIG.UNION_GP_POST_ADULT) * GAME_CONFIG.UNION_GP_WEIGHT,
  );
  return Math.min(100, timePart + gpPart);
}

export function isUnionReady(
  adultReachedAt: string | null,
  adultGpSnapshot: number | null,
  totalGp: number,
  today: string,
  stage: CreatureStage,
): boolean {
  if (stage !== "adult" && stage !== "elder") return false;
  if (!adultReachedAt || adultGpSnapshot === null) return false;
  const days = diffDays(adultReachedAt.slice(0, 10), today);
  const gpSince = totalGp - adultGpSnapshot;
  return (
    days >= GAME_CONFIG.UNION_MIN_DAYS_POST_ADULT &&
    gpSince >= GAME_CONFIG.UNION_GP_POST_ADULT
  );
}

export function nextSyncPoints(
  current: number,
  dcsA: number | null,
  dcsB: number | null,
): number {
  const aOk = isStreakDay(dcsA);
  const bOk = isStreakDay(dcsB);
  if (aOk && bOk) return current + GAME_CONFIG.SYNC_POINTS_PER_MUTUAL_DAY;
  const aIdle = dcsA === null || dcsA === 0;
  const bIdle = dcsB === null || dcsB === 0;
  if (aIdle && bIdle) {
    return Math.max(0, current - GAME_CONFIG.SYNC_POINTS_COOLDOWN_PENALTY);
  }
  return current;
}

export function nextHealth(input: {
  health: HealthStatus;
  consecutiveZeroDays: number;
  recoveryStreak: number;
  dcs: number | null;
}): {
  health: HealthStatus;
  consecutiveZeroDays: number;
  recoveryStreak: number;
} {
  if (input.health === "sick") {
    const good =
      input.dcs !== null && input.dcs >= GAME_CONFIG.SICK_RECOVERY_DCS_THRESHOLD;
    const recoveryStreak = good ? input.recoveryStreak + 1 : 0;
    if (recoveryStreak >= GAME_CONFIG.SICK_RECOVERY_STREAK_DAYS) {
      return { health: "active", consecutiveZeroDays: 0, recoveryStreak: 0 };
    }
    return {
      health: "sick",
      consecutiveZeroDays: input.consecutiveZeroDays,
      recoveryStreak,
    };
  }
  if (isZeroActivityDay(input.dcs)) {
    const consecutiveZeroDays = input.consecutiveZeroDays + 1;
    if (consecutiveZeroDays >= GAME_CONFIG.SICK_TRIGGER_ZERO_DAYS) {
      return { health: "sick", consecutiveZeroDays, recoveryStreak: 0 };
    }
    return {
      health: "active",
      consecutiveZeroDays,
      recoveryStreak: 0,
    };
  }
  return { health: "active", consecutiveZeroDays: 0, recoveryStreak: 0 };
}

export function recoveryBarPct(recoveryStreak: number): number {
  return Math.min(
    100,
    (recoveryStreak / GAME_CONFIG.SICK_RECOVERY_STREAK_DAYS) * 100,
  );
}

export function applyDayFinalization(input: {
  currentStreak: number;
  longestStreak: number;
  totalGp: number;
  dcs: number | null;
  hatched: boolean;
  health: HealthStatus;
  consecutiveZeroDays: number;
  recoveryStreak: number;
  isRestDay?: boolean;
}): {
  currentStreak: number;
  longestStreak: number;
  totalGp: number;
  gpEarned: number;
  isStreakDay: boolean;
  hatched: boolean;
  justHatched: boolean;
  stage: CreatureStage;
  health: HealthStatus;
  consecutiveZeroDays: number;
  recoveryStreak: number;
} {
  if (input.isRestDay) {
    return {
      currentStreak: input.currentStreak,
      longestStreak: input.longestStreak,
      totalGp: input.totalGp,
      gpEarned: 0,
      isStreakDay: false,
      hatched: input.hatched,
      justHatched: false,
      stage: stageForGp(input.totalGp, input.hatched),
      health: input.health,
      consecutiveZeroDays: input.consecutiveZeroDays,
      recoveryStreak: input.recoveryStreak,
    };
  }
  const health = nextHealth({
    health: input.health,
    consecutiveZeroDays: input.consecutiveZeroDays,
    recoveryStreak: input.recoveryStreak,
    dcs: input.dcs,
  });
  const streak = nextStreak(input.currentStreak, input.dcs);
  const justHatched = !input.hatched && isStreakDay(input.dcs);
  const hatched = input.hatched || justHatched;
  const frozen = health.health === "sick";
  const gpEarned = frozen ? 0 : dailyGp(input.dcs, streak);
  const totalGp = input.totalGp + gpEarned;
  return {
    currentStreak: streak,
    longestStreak: Math.max(input.longestStreak, streak),
    totalGp,
    gpEarned,
    isStreakDay: isStreakDay(input.dcs),
    hatched,
    justHatched,
    stage: stageForGp(totalGp, hatched),
    ...health,
  };
}

export function scoreFromTasks(
  userId: string,
  date: string,
  tasks: Task[],
  streakBefore: number,
  frozen = false,
  isRestDay = false,
): DailyScore {
  if (isRestDay) {
    return {
      userId,
      date,
      dcs: null,
      isStreakDay: false,
      gpEarned: 0,
      finalized: false,
    };
  }
  const dcs = dailyCompletionScore(tasks);
  const streakAfter = nextStreak(streakBefore, dcs);
  return {
    userId,
    date,
    dcs,
    isStreakDay: isStreakDay(dcs),
    gpEarned: frozen ? 0 : dailyGp(dcs, streakAfter),
    finalized: false,
  };
}

export function heatLevel(score: DailyScore | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!score || score.dcs === null || score.dcs === 0) return 0;
  if (score.isStreakDay) return 4;
  if (score.dcs >= 0.7) return 3;
  if (score.dcs >= 0.4) return 2;
  return 1;
}

export function fairnessScenario(): {
  scatteredGp: number;
  consistentGp: number;
  ratio: number;
} {
  const scatteredGp = 20 * dailyGp(1, 1);
  let consistentGp = 0;
  for (let s = 1; s <= 20; s++) consistentGp += dailyGp(1, s);
  return {
    scatteredGp,
    consistentGp,
    ratio: consistentGp / scatteredGp,
  };
}
