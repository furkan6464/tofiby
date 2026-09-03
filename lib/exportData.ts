import type { Goal, Milestone, Task, UserProfile, Creature, DailyScore } from "./types";

export function dumpJson(input: {
  user: UserProfile;
  creature: Creature | null;
  goals: Goal[];
  milestones: Milestone[];
  tasks: Task[];
  scores: DailyScore[];
}) {
  return JSON.stringify(input, null, 2);
}

export function dumpCsv(tasks: Task[]) {
  const header = [
    "id",
    "date",
    "time",
    "title",
    "status",
    "goalId",
    "milestoneId",
    "priority",
    "estimatedDurationMinutes",
    "completedAt",
  ];
  const rows = tasks.map((t) =>
    [
      t.id,
      t.date,
      t.time ?? "",
      csvCell(t.title),
      t.status,
      t.goalId ?? "",
      t.milestoneId ?? "",
      t.priority,
      t.estimatedDurationMinutes ?? "",
      t.completedAt ?? "",
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function downloadText(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
