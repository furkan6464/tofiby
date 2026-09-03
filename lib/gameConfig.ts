export const HATCH_TRIGGER = "first_streak_day" as const;

export const GAME_CONFIG = {
  DCS_STREAK_THRESHOLD: 0.8,
  BASE_POINTS_PER_DAY: 10,
  CONSISTENCY_K: 0.3,
  HATCH_TRIGGER,
  STAGE_THRESHOLDS: {
    egg: 0,
    /** Hatch is not a GP gate — first streak day (see HATCH_TRIGGER). */
    baby: HATCH_TRIGGER,
    child: 250,
    teen: 800,
    adult: 2200,
    elder: 5500,
  },
  UNION_MIN_DAYS_POST_ADULT: 180,
  UNION_GP_POST_ADULT: 2000,
  UNION_TIME_WEIGHT: 70,
  UNION_GP_WEIGHT: 30,
  SYNC_POINTS_PER_MUTUAL_DAY: 5,
  SYNC_POINTS_COOLDOWN_PENALTY: 1,
  SYNC_POINTS_MARRIAGE_THRESHOLD: 150,
  DAILY_POKE_LIMIT: 1,
  GENETICS_PARENT_SPECIES_CHANCE: 0.45,
  GENETICS_MUTATION_CHANCE: 0.10,
  GENETICS_HUE_JITTER_DEGREES: 15,
  MIDNIGHT_GRACE_HOURS: 2,
  DEFAULT_TASK_WEIGHT: 1,
  PRIORITY_TASK_WEIGHT: 2,
  FRIENDSHIP_BOND_MIN_DAYS: 14,
  SLEEPY_HOUR: 23,
  IDLE_BLINK_MIN_MS: 4000,
  IDLE_BLINK_MAX_MS: 10000,
  AMBIENT_MOVE_MIN_MS: 15000,
  AMBIENT_MOVE_MAX_MS: 30000,
  SPRITE_FPS: 6,
  SICK_SPRITE_FPS: 3,
  TASK_HORIZON_DAYS: 120,
  SICK_TRIGGER_ZERO_DAYS: 7,
  SICK_RECOVERY_STREAK_DAYS: 3,
  SICK_RECOVERY_DCS_THRESHOLD: 0.6,
  MAX_REST_DAYS_PER_WEEK: 1,
} as const;

export type CreatureStage = "egg" | "baby" | "child" | "teen" | "adult" | "elder";
export type HealthStatus = "active" | "sick";

export const STAGE_ORDER: CreatureStage[] = [
  "egg",
  "baby",
  "child",
  "teen",
  "adult",
  "elder",
];

export const GP_STAGE_THRESHOLDS: Record<Exclude<CreatureStage, "egg" | "baby">, number> = {
  child: GAME_CONFIG.STAGE_THRESHOLDS.child,
  teen: GAME_CONFIG.STAGE_THRESHOLDS.teen,
  adult: GAME_CONFIG.STAGE_THRESHOLDS.adult,
  elder: GAME_CONFIG.STAGE_THRESHOLDS.elder,
};
