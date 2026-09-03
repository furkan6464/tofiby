import type { Task } from "./types";

export function sampleTask(
  partial: Partial<Task> & { weight: number; completed: boolean },
): Task {
  return {
    id: "t",
    userId: "u",
    goalId: null,
    milestoneId: null,
    date: "2026-01-01",
    time: null,
    title: "x",
    description: "",
    note: "",
    estimatedDurationMinutes: null,
    priority: "medium",
    tag: null,
    repeatPattern: null,
    checklist: [],
    reminderOffsetMinutes: 120,
    status: partial.completed ? "done" : "pending",
    postponedToDate: null,
    completedAt: null,
    ...partial,
  };
}
