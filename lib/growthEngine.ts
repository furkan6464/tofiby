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

/** Absolute effort signal for a scored day (GP preferred; falls back to DCS × base). */
export function dayHeatEffort(score: DailyScore): number {
  if (score.dcs === null || score.dcs <= 0) return 0;
  return Math.max(score.gpEarned, score.dcs * GAME_CONFIG.BASE_POINTS_PER_DAY);
}

/**
 * Continuous heat intensity ∈ [0, 1].
 * Light days stay in the sweet dusty band; only heavy relative effort reaches dark pink.
 */
export function heatIntensity(
  score: DailyScore | undefined,
  peerEfforts: number[],
  /** Completed weight or GP-based effort for this day. */
  effort?: number,
): number {
  if (!score || score.dcs === null || score.dcs <= 0) return 0;

  const self = effort !== undefined && effort > 0 ? effort : dayHeatEffort(score);
  const active = peerEfforts.filter((e) => e > 0);

  let relative = score.dcs;
  if (active.length >= 3) {
    const sorted = [...active].sort((a, b) => a - b);
    const p90 = sorted[Math.max(0, Math.ceil(sorted.length * 0.9) - 1)];
    relative = Math.min(1, self / Math.max(p90, 1e-9));
  } else {
    // Strong-day baseline (≈2-week streak full DCS) so a normal day stays dusty, not max.
    const strongDay = GAME_CONFIG.BASE_POINTS_PER_DAY * consistencyMultiplier(14);
    relative = Math.min(1, self / Math.max(strongDay, 1e-9));
  }

  // Prefer volume for contrast; quality still matters. Gamma > 1 keeps light days soft.
  const blended = 0.35 * score.dcs + 0.65 * relative;
  return Math.min(1, Math.pow(Math.max(0, blended), 1.35));
}

/** Sweet dusty pink → dark pink. Low end stays soft so hard days read clearly darker. */
export function heatColor(intensity: number): string {
  if (intensity <= 0) return "var(--heat-0)";
  const stops: [number, number, number][] = [
    [214, 168, 186], // tatlı toz pembe
    [196, 118, 152],
    [168, 58, 108],
    [108, 18, 58], // koyu pembe
  ];
  const x = intensity * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r} ${g} ${bl})`;
}

export function heatLevel(score: DailyScore | undefined): 0 | 1 | 2 | 3 | 4 {
  const t = heatIntensity(score, score ? [dayHeatEffort(score)] : []);
  if (t <= 0) return 0;
  if (t < 0.28) return 1;
  if (t < 0.52) return 2;
  if (t < 0.78) return 3;
  return 4;
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
