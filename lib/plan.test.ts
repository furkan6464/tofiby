import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collectBusy,
  findFreeSlots,
  goalCardProgress,
  goalProgress,
  goalWorkProgress,
  insightBundle,
  postponeTo,
  remainingToStreak,
  scheduleHours,
  splitStudySessions,
} from "./plan";
import { daysForStudy, weekKeys } from "./dates";
import { sampleTask } from "./testTask";
import type { Milestone } from "./types";

describe("plan", () => {
  it("moves goal card progress when a due task is done", () => {
    const goal = {
      id: "g",
      userId: "u",
      title: "İngilizce",
      note: "",
      startDate: "2026-09-01",
      targetDate: null,
      weeklyFrequency: 5,
      dailyDurationMinutes: 30,
      frequency: { kind: "daily" as const },
      color: "#8B5CF6",
      status: "active" as const,
      createdAt: "2026-09-01",
    };
    const tasks = [
      sampleTask({ id: "1", goalId: "g", date: "2026-09-05", weight: 1, completed: true }),
      sampleTask({ id: "2", goalId: "g", date: "2026-09-06", weight: 1, completed: false }),
      sampleTask({ id: "3", goalId: "g", date: "2026-10-01", weight: 1, completed: false }),
    ];
    const card = goalCardProgress({ goal, milestones: [], tasks, today: "2026-09-06" });
    assert.equal(card.pct, 50);
  });

  it("computes milestone-weighted goal progress", () => {
    const stones: Milestone[] = [
      { id: "1", goalId: "g", title: "A1", orderIndex: 0, weight: 1, completedAt: "2026-01-01" },
      { id: "2", goalId: "g", title: "A2", orderIndex: 1, weight: 1, completedAt: null },
      { id: "3", goalId: "g", title: "B1", orderIndex: 2, weight: 2, completedAt: null },
    ];
    assert.equal(goalProgress(stones), 25);
  });

  it("counts only completed minutes toward goal work", () => {
    const tasks = [
      sampleTask({ id: "1", goalId: "g", date: "2026-09-03", estimatedDurationMinutes: 60, weight: 1, completed: true }),
      sampleTask({ id: "2", goalId: "g", date: "2026-09-04", estimatedDurationMinutes: 60, weight: 1, completed: false }),
      sampleTask({ id: "3", goalId: "g", date: "2026-09-05", estimatedDurationMinutes: 60, weight: 1, completed: false }),
      sampleTask({ id: "4", goalId: "g", date: "2026-09-06", estimatedDurationMinutes: 60, weight: 1, completed: false }),
      sampleTask({ id: "5", goalId: "g", date: "2026-09-07", estimatedDurationMinutes: 60, weight: 1, completed: false }),
      sampleTask({ id: "6", goalId: "g", date: "2026-09-08", estimatedDurationMinutes: 60, weight: 1, completed: false }),
      sampleTask({ id: "7", goalId: "g", date: "2026-09-09", estimatedDurationMinutes: 60, weight: 1, completed: false }),
      sampleTask({ id: "8", goalId: "g", date: "2026-09-10", estimatedDurationMinutes: 60, weight: 1, completed: false }),
    ];
    const work = goalWorkProgress(tasks);
    assert.equal(work.minutes, 60);
    assert.equal(work.pct, 13);
  });

  it("does not inflate avg daily tasks with future horizon tasks", () => {
    const tasks = [
      sampleTask({ id: "1", date: "2026-09-03", weight: 1, completed: true }),
      ...Array.from({ length: 100 }, (_, i) =>
        sampleTask({
          id: `f${i}`,
          date: `2026-10-${String((i % 28) + 1).padStart(2, "0")}`,
          weight: 1,
          completed: false,
        }),
      ),
    ];
    const bundle = insightBundle({
      userId: "u",
      today: "2026-09-03",
      timezone: "Europe/Istanbul",
      tasks,
      scores: [],
      goals: [],
    });
    assert.ok(bundle.avgTasks <= 2);
  });

  it("counts remaining tasks to hit the DCS streak threshold", () => {
    const tasks = [
      sampleTask({ id: "1", weight: 1, completed: true }),
      sampleTask({ id: "2", weight: 1, completed: false }),
      sampleTask({ id: "3", weight: 1, completed: false }),
      sampleTask({ id: "4", weight: 1, completed: false }),
      sampleTask({ id: "5", weight: 1, completed: false }),
    ];
    const info = remainingToStreak(tasks);
    assert.equal(info.planned, 5);
    assert.equal(info.done, 1);
    assert.equal(info.remaining, 3);
    assert.equal(info.met, false);
  });

  it("moves postpone-to-tomorrow by one day", () => {
    assert.equal(postponeTo("tomorrow", "2026-09-03"), "2026-09-04");
  });

  it("places hours into free slots without overlapping busy time", () => {
    const placed = scheduleHours({
      hours: 2,
      title: "Python",
      week: ["2026-09-03"],
      tasks: [
        sampleTask({
          id: "busy",
          weight: 1,
          completed: false,
          date: "2026-09-03",
          time: "09:00",
          estimatedDurationMinutes: 60,
        }),
      ],
      busy: [],
      userId: "u",
    });
    assert.ok(placed.length >= 2);
    const busy = collectBusy(
      [
        sampleTask({
          id: "busy",
          weight: 1,
          completed: false,
          date: "2026-09-03",
          time: "09:00",
          estimatedDurationMinutes: 60,
        }),
      ],
      [],
      "u",
      "2026-09-03",
    );
    const free = findFreeSlots(busy);
    assert.ok(free.every((s) => s.endMin > s.startMin));
    assert.ok(!placed.some((p) => p.time === "09:00"));
  });

  it("never places study hours on days before today", () => {
    const today = "2026-09-06";
    const placed = scheduleHours({
      hours: 3,
      title: "SQL",
      week: weekKeys(today),
      tasks: [],
      busy: [],
      userId: "u",
      today,
      nowMin: 12 * 60,
    });
    assert.ok(placed.length > 0);
    assert.ok(placed.every((p) => p.date >= today));
  });

  it("skips today's morning slot when the afternoon has already started", () => {
    const placed = scheduleHours({
      hours: 1,
      title: "SQL",
      week: ["2026-09-06"],
      tasks: [],
      busy: [],
      userId: "u",
      today: "2026-09-06",
      nowMin: 15 * 60,
    });
    assert.ok(placed.every((p) => {
      const [h, m] = p.time.split(":").map(Number);
      return h * 60 + m >= 15 * 60;
    }));
    assert.ok(!placed.some((p) => p.time === "08:00" || p.time === "09:00"));
  });

  it("splits hours into one-hour study sessions", () => {
    assert.deepEqual(splitStudySessions(6), [60, 60, 60, 60, 60, 60]);
    assert.deepEqual(splitStudySessions(3), [60, 60, 60]);
    assert.deepEqual(splitStudySessions(2.5), [60, 60, 30]);
  });

  it("spreads six hours across different days instead of stacking one day", () => {
    const today = "2026-09-07";
    const placed = scheduleHours({
      hours: 6,
      title: "SQL",
      week: weekKeys(today),
      tasks: [],
      busy: [],
      userId: "u",
      today,
      nowMin: 8 * 60,
    });
    const days = new Set(placed.map((p) => p.date));
    assert.equal(placed.length, 6);
    assert.ok(days.size >= 6);
    assert.ok([...days].every((d) => placed.filter((p) => p.date === d).length === 1));
    assert.ok(placed.every((p) => p.minutes <= 60));
  });

  it("opens next week when this week has too few days left", () => {
    const today = "2026-09-06";
    const days = daysForStudy(today, 6, "this");
    assert.ok(days.includes(today));
    assert.ok(days.length >= 6);
    assert.ok(days.some((d) => d > today));
  });
});
