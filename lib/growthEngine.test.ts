import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GAME_CONFIG, HATCH_TRIGGER } from "./gameConfig";
import {
  applyDayFinalization,
  consistencyMultiplier,
  dailyCompletionScore,
  dailyGp,
  fairnessScenario,
  isStreakDay,
  isUnionReady,
  nextHealth,
  nextStreak,
  nextSyncPoints,
  recoveryBarPct,
  stageForGp,
  unionBarPct,
} from "./growthEngine";
import type { Task } from "./types";

function task(partial: Partial<Task> & { weight: number; completed: boolean }): Task {
  return {
    id: "t",
    userId: "u",
    goalId: null,
    date: "2026-01-01",
    title: "x",
    note: "",
    completedAt: null,
    ...partial,
  };
}

describe("growthEngine", () => {
  it("reads every numeric knob from GAME_CONFIG", () => {
    assert.equal(GAME_CONFIG.DCS_STREAK_THRESHOLD, 0.8);
    assert.equal(GAME_CONFIG.BASE_POINTS_PER_DAY, 10);
    assert.equal(GAME_CONFIG.CONSISTENCY_K, 0.3);
    assert.equal(GAME_CONFIG.HATCH_TRIGGER, HATCH_TRIGGER);
    assert.equal(GAME_CONFIG.STAGE_THRESHOLDS.baby, "first_streak_day");
    assert.equal(GAME_CONFIG.SICK_TRIGGER_ZERO_DAYS, 7);
    assert.equal(GAME_CONFIG.SICK_RECOVERY_STREAK_DAYS, 3);
    assert.equal(GAME_CONFIG.SICK_RECOVERY_DCS_THRESHOLD, 0.6);
  });

  it("treats empty days as neutral (null DCS)", () => {
    assert.equal(dailyCompletionScore([]), null);
    assert.equal(isStreakDay(null), false);
    assert.equal(nextStreak(7, null), 7);
    assert.equal(dailyGp(null, 7), 0);
  });

  it("counts a streak day only at the configured DCS threshold", () => {
    const tasks = [
      task({ weight: 1, completed: true }),
      task({ weight: 1, completed: true }),
      task({ weight: 1, completed: false }),
    ];
    const dcs = dailyCompletionScore(tasks);
    assert.ok(dcs !== null && dcs > 0.66 && dcs < 0.67);
    assert.equal(isStreakDay(dcs), false);
    const weighted = [
      task({ weight: 2, completed: true }),
      task({ weight: 2, completed: true }),
      task({ weight: 1, completed: false }),
    ];
    assert.equal(isStreakDay(dailyCompletionScore(weighted)), true);
  });

  it("resets streak when the threshold is missed", () => {
    assert.equal(nextStreak(12, 0.5), 0);
    assert.equal(nextStreak(12, 0.8), 13);
  });

  it("matches the documented 20-day fairness gap", () => {
    const { scatteredGp, consistentGp, ratio } = fairnessScenario();
    assert.ok(scatteredGp > 240 && scatteredGp < 244);
    assert.ok(consistentGp > 330 && consistentGp < 342);
    assert.ok(ratio > 1.35 && ratio < 1.45);
  });

  it("uses ln(S+1) so the multiplier grows but tapers", () => {
    const cm1 = consistencyMultiplier(1);
    const cm20 = consistencyMultiplier(20);
    const cm40 = consistencyMultiplier(40);
    assert.ok(cm1 > 1.2 && cm1 < 1.22);
    assert.ok(cm20 > cm1);
    assert.ok(cm40 - cm20 < cm20 - cm1);
  });

  it("keeps egg until hatch even with GP, then maps later stages by GP", () => {
    assert.equal(stageForGp(0, false), "egg");
    assert.equal(stageForGp(400, false), "egg");
    assert.equal(stageForGp(0, true), "baby");
    assert.equal(stageForGp(249, true), "baby");
    assert.equal(stageForGp(250, true), "child");
    assert.equal(stageForGp(800, true), "teen");
    assert.equal(stageForGp(2200, true), "adult");
    assert.equal(stageForGp(5500, true), "elder");
  });

  it("hatches on the first streak day regardless of GP", () => {
    const out = applyDayFinalization({
      currentStreak: 0,
      longestStreak: 0,
      totalGp: 0,
      dcs: 1,
      hatched: false,
      health: "active",
      consecutiveZeroDays: 0,
      recoveryStreak: 0,
    });
    assert.equal(out.justHatched, true);
    assert.equal(out.hatched, true);
    assert.equal(out.stage, "baby");
  });

  it("does not hatch on a non-streak day", () => {
    const out = applyDayFinalization({
      currentStreak: 0,
      longestStreak: 0,
      totalGp: 0,
      dcs: 0.5,
      hatched: false,
      health: "active",
      consecutiveZeroDays: 0,
      recoveryStreak: 0,
    });
    assert.equal(out.justHatched, false);
    assert.equal(out.hatched, false);
    assert.equal(out.stage, "egg");
  });

  it("blocks union until both 180 days AND +2000 GP after adult", () => {
    const adultAt = "2026-01-01";
    assert.equal(unionBarPct(null, null, 3000, "2026-12-01"), 0);
    const grind = unionBarPct(adultAt, 2200, 2200 + 20000, "2026-01-11");
    assert.ok(grind < 40);
    assert.equal(isUnionReady(adultAt, 2200, 22000, "2026-01-11", "adult"), false);
    const wait = unionBarPct(adultAt, 2200, 2200, "2026-12-01");
    assert.ok(wait <= 70);
    assert.equal(isUnionReady(adultAt, 2200, 2200, "2026-12-01", "adult"), false);
    assert.equal(unionBarPct(adultAt, 2200, 4200, "2026-06-30"), 100);
    assert.equal(isUnionReady(adultAt, 2200, 4200, "2026-06-30", "adult"), true);
  });

  it("scores sync points as reward-only except mutual idle decay", () => {
    assert.equal(nextSyncPoints(10, 1, 1), 15);
    assert.equal(nextSyncPoints(10, 1, 0.2), 10);
    assert.equal(nextSyncPoints(10, 0, 0), 9);
    assert.equal(nextSyncPoints(10, null, null), 9);
  });

  it("turns sick after 7 zero-activity days and freezes GP", () => {
    let health: "active" | "sick" = "active";
    let zeros = 0;
    let recovery = 0;
    let gp = 100;
    for (let i = 0; i < 7; i++) {
      const out = applyDayFinalization({
        currentStreak: 0,
        longestStreak: 4,
        totalGp: gp,
        dcs: 0,
        hatched: true,
        health,
        consecutiveZeroDays: zeros,
        recoveryStreak: recovery,
      });
      health = out.health;
      zeros = out.consecutiveZeroDays;
      recovery = out.recoveryStreak;
      gp = out.totalGp;
      assert.equal(out.gpEarned, 0);
    }
    assert.equal(health, "sick");
    assert.equal(gp, 100);
  });

  it("recovers after 3 consecutive days at DCS >= 0.6 and resumes GP", () => {
    let health: "active" | "sick" = "sick";
    let recovery = 0;
    let gp = 100;
    for (let i = 0; i < 2; i++) {
      const out = applyDayFinalization({
        currentStreak: 0,
        longestStreak: 4,
        totalGp: gp,
        dcs: 0.7,
        hatched: true,
        health,
        consecutiveZeroDays: 7,
        recoveryStreak: recovery,
      });
      health = out.health;
      recovery = out.recoveryStreak;
      gp = out.totalGp;
      assert.equal(health, "sick");
      assert.equal(out.gpEarned, 0);
    }
    const done = applyDayFinalization({
      currentStreak: 2,
      longestStreak: 4,
      totalGp: gp,
      dcs: 0.7,
      hatched: true,
      health,
      consecutiveZeroDays: 7,
      recoveryStreak: recovery,
    });
    assert.equal(done.health, "active");
    assert.ok(done.gpEarned > 0);
    const reset = nextHealth({
      health: "sick",
      consecutiveZeroDays: 7,
      recoveryStreak: 2,
      dcs: 0.4,
    });
    assert.equal(reset.recoveryStreak, 0);
    assert.equal(reset.health, "sick");
    assert.equal(recoveryBarPct(2), (2 / 3) * 100);
  });
});
