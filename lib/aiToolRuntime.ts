"use client";

import { GOAL_COLORS } from "./goalColors";
import { t } from "./i18n";
import { nextWeekKeys, remainingWeekKeys, todayKey } from "./dates";
import { isPastSlot } from "./aiPlanning";
import { goalCardProgress, isActiveGoal } from "./plan";
import { useApp } from "./store";
import { APP_ROUTES, BLOCKED_PAGE } from "./aiRules";
import { toolKind } from "./aiTools";
import type { AiToolCall, AiToolResult, ChatCalendarAdd, ChatUndo, TaskDraft } from "./aiTypes";
import type { Task } from "./types";
import { calendarAddMinutes } from "./aiCalendar";

function str(v: unknown) {
  return String(v ?? "").trim();
}

function resolveGoal(args: Record<string, unknown>) {
  const s = useApp.getState();
  const user = s.users.find((u) => u.id === s.sessionUserId);
  const id = str(args.goalId);
  const title = str(args.goalTitle).toLowerCase();
  const mine = s.goals.filter((g) => g.userId === user?.id && isActiveGoal(g));
  if (id) return mine.find((g) => g.id === id) ?? null;
  if (!title) return mine[0] ?? null;
  return (
    mine.find((g) => g.title.toLowerCase() === title) ??
    mine.find((g) => g.title.toLowerCase().includes(title)) ??
    null
  );
}

function resolveTask(args: Record<string, unknown>): Task | null {
  const s = useApp.getState();
  const user = s.users.find((u) => u.id === s.sessionUserId);
  const id = str(args.taskId);
  const title = str(args.taskTitle || args.title).toLowerCase();
  const mine = s.tasks.filter((x) => x.userId === user?.id);
  if (id) return mine.find((x) => x.id === id) ?? null;
  if (!title) return null;
  const today = user ? todayKey(user.timezone) : "";
  return (
    mine.find((x) => x.title.toLowerCase() === title && x.date >= today) ??
    mine.find((x) => x.title.toLowerCase().includes(title) && x.date >= today) ??
    mine.find((x) => x.title.toLowerCase().includes(title)) ??
    null
  );
}

function hrefFor(page: string) {
  const raw = page.trim();
  if (APP_ROUTES.some((r) => r.href === raw)) return raw;
  const hit = APP_ROUTES.find(
    (r) =>
      r.label.toLowerCase() === raw.toLowerCase() ||
      r.href.slice(1).toLowerCase() === raw.toLowerCase().replace(/^\//, ""),
  );
  return hit?.href ?? null;
}

export function runAiTools(
  calls: AiToolCall[],
  ctx: { navigate?: (href: string) => void; hasFile?: boolean },
): { results: AiToolResult[]; undos: ChatUndo[] } {
  const results: AiToolResult[] = [];
  const undos: ChatUndo[] = [];
  for (const call of calls) {
    const kind = toolKind(call.name);
    if (kind === "blocked" || kind === "unknown") {
      const page = BLOCKED_PAGE[call.name];
      results.push({
        id: call.id,
        name: call.name,
        ok: false,
        data: {
          error: "blocked",
          hint: "Bu eylem sohbetten yapılamaz.",
          href: page?.href ?? "/ayarlar",
          label: page?.label ?? "Ayarlar",
        },
      });
      continue;
    }
    const ran = runOne(call, ctx);
    results.push(ran.result);
    if (ran.undo) undos.push(ran.undo);
  }
  return { results, undos };
}

export function applyScheduleHours(input: {
  title: string;
  hours: number;
  goalId?: string | null;
  week: string[];
  preferStartMin?: number | null;
}): { added: number; taskIds: string[]; leftoverHours: number; weekFull: boolean; undo?: ChatUndo } {
  const s = useApp.getState();
  const placed = s.planHours(input.title, input.hours, input.week, input.goalId ?? null, input.preferStartMin);
  const leftoverHours = Math.max(0, Math.round((placed.minutesNeeded - placed.minutesPlaced) / 60));
  const weekFull = placed.minutesPlaced < placed.minutesNeeded;
  return {
    added: placed.added,
    taskIds: placed.taskIds,
    leftoverHours,
    weekFull,
    undo:
      placed.added > 0
        ? {
            id: placed.taskIds[0] ?? uidSafe(),
            label: t("ai.didHours", { title: input.title, n: input.hours - leftoverHours || input.hours }),
            kind: "scheduleStudyHours",
            payload: { taskIds: placed.taskIds },
          }
        : undefined,
  };
}

export function applyTaskDraft(draft: TaskDraft): { undo?: ChatUndo; error?: string } {
  const s = useApp.getState();
  if (!draft.title || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return { error: "missing" };
  if (isPastSlot(draft.date, draft.time)) return { error: "past_slot" };
  const created = s.addTask({
    title: draft.title,
    date: draft.date,
    time: draft.time || null,
    estimatedDurationMinutes: draft.durationMinutes ?? null,
    priority: draft.priority === "high" || draft.priority === "low" ? draft.priority : "medium",
    goalId: draft.goalId ?? null,
  });
  if (!created) return { error: "failed" };
  const when = draft.time ? `${draft.date} ${draft.time}` : draft.date;
  return {
    undo: {
      id: created,
      label: t("ai.didTask", { title: draft.title, when }),
      kind: "createTask",
      payload: { taskIds: [created] },
    },
  };
}

function runOne(
  call: AiToolCall,
  ctx: { navigate?: (href: string) => void; hasFile?: boolean },
): { result: AiToolResult; undo?: ChatUndo } {
  const s = useApp.getState();
  const user = s.users.find((u) => u.id === s.sessionUserId);
  const args = call.args;
  const today = user ? todayKey(user.timezone) : "";

  if (call.name === "getUserStats") {
    const creature = s.creatures.find((c) => c.ownerId === user?.id && c.status === "active");
    const score = s.scores.find((x) => x.userId === user?.id && x.date === today);
    return {
      result: {
        id: call.id,
        name: call.name,
        ok: true,
        data: {
          streak: creature?.currentStreak ?? 0,
          longest: creature?.longestStreak ?? 0,
          gp: creature?.totalGp ?? 0,
          stage: creature?.stage ?? "egg",
          todayDcs: score?.dcs ?? null,
          health: creature?.health ?? "ok",
        },
      },
    };
  }

  if (call.name === "getGoalProgress") {
    const goal = resolveGoal(args);
    if (!goal) {
      return { result: { id: call.id, name: call.name, ok: false, data: { error: "goal_not_found" } } };
    }
    const card = goalCardProgress({
      goal,
      milestones: s.milestones,
      tasks: s.tasks,
      today,
    });
    return {
      result: {
        id: call.id,
        name: call.name,
        ok: true,
        data: { goalId: goal.id, title: goal.title, pct: card.pct, next: card.nextTitle, left: card.nextLeft },
      },
    };
  }

  if (call.name === "navigateTo") {
    const href = hrefFor(str(args.page));
    if (!href) {
      return { result: { id: call.id, name: call.name, ok: false, data: { error: "unknown_page" } } };
    }
    ctx.navigate?.(href);
    return { result: { id: call.id, name: call.name, ok: true, data: { href } } };
  }

  if (call.name === "parseSchedulePhoto") {
    return {
      result: {
        id: call.id,
        name: call.name,
        ok: Boolean(ctx.hasFile),
        data: ctx.hasFile
          ? { parsed: true }
          : { needFile: true, hint: "Ders programı fotoğrafını veya PDF'ini ataşla." },
      },
    };
  }

  if (call.name === "createTask") {
    const title = str(args.title);
    const date = str(args.date);
    if (!title) {
      return { result: { id: call.id, name: call.name, ok: false, data: { error: "missing_title" } } };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { result: { id: call.id, name: call.name, ok: false, data: { error: "missing_date" } } };
    }
    if (isPastSlot(date, str(args.time) || null)) {
      return { result: { id: call.id, name: call.name, ok: false, data: { error: "past_slot" } } };
    }
    const goal = resolveGoal(args);
    const time = str(args.time) || null;
    const priority = str(args.priority);
    const created = s.addTask({
      title,
      date,
      time,
      estimatedDurationMinutes: Number(args.durationMinutes) || null,
      priority: priority === "high" || priority === "low" ? priority : "medium",
      goalId: goal?.id ?? null,
    });
    if (!created) {
      return { result: { id: call.id, name: call.name, ok: false, data: { error: "failed" } } };
    }
    const when = time ? `${date} ${time}` : date;
    return {
      result: { id: call.id, name: call.name, ok: true, data: { taskId: created, title, date, time } },
      undo: {
        id: created,
        label: t("ai.didTask", { title, when }),
        kind: "createTask",
        payload: { taskIds: [created] },
      },
    };
  }

  if (call.name === "createGoal") {
    const title = str(args.title);
    if (!title) {
      return { result: { id: call.id, name: call.name, ok: false, data: { error: "missing_title" } } };
    }
    const made = s.addGoal({
      title,
      taskTitle: title,
      note: "",
      targetDate: /^\d{4}-\d{2}-\d{2}$/.test(str(args.targetDate)) ? str(args.targetDate) : null,
      weeklyFrequency: Math.min(7, Math.max(1, Number(args.weeklyFrequency) || 5)),
      dailyDurationMinutes: Math.min(180, Math.max(10, Number(args.dailyDurationMinutes) || 30)),
      frequency: { kind: "times_per_week", timesPerWeek: Number(args.weeklyFrequency) || 5 },
      color: GOAL_COLORS[0],
    });
    if (!made) {
      return { result: { id: call.id, name: call.name, ok: false, data: { error: "failed" } } };
    }
    return {
      result: { id: call.id, name: call.name, ok: true, data: { goalId: made.id, taskCount: made.taskIds.length } },
      undo: {
        id: made.id,
        label: t("ai.didGoal", { title }),
        kind: "createGoal",
        payload: { goalId: made.id, taskIds: made.taskIds },
      },
    };
  }

  if (call.name === "scheduleStudyHours") {
    const hours = Number(args.hoursPerWeek);
    if (!Number.isFinite(hours) || hours <= 0) {
      return { result: { id: call.id, name: call.name, ok: false, data: { error: "bad_hours" } } };
    }
    const goal = resolveGoal({ ...args, goalTitle: args.goalTitle || args.title });
    const title = goal?.title || str(args.goalTitle) || str(args.title) || "Çalışma";
    const week = str(args.week) === "next" ? nextWeekKeys(today) : remainingWeekKeys(today);
    const prefer = Number(args.preferStartMin);
    const placed = applyScheduleHours({
      title,
      hours,
      goalId: goal?.id ?? null,
      week,
      preferStartMin: Number.isFinite(prefer) ? prefer : null,
    });
    return {
      result: {
        id: call.id,
        name: call.name,
        ok: placed.added > 0,
        data: {
          added: placed.added,
          taskIds: placed.taskIds,
          title,
          leftoverHours: placed.leftoverHours,
          weekFull: placed.weekFull,
        },
      },
      undo: placed.undo,
    };
  }

  if (call.name === "postponeTask") {
    const task = resolveTask(args);
    const to = str(args.newDate);
    if (!task || !/^\d{4}-\d{2}-\d{2}$/.test(to) || isPastSlot(to)) {
      return { result: { id: call.id, name: call.name, ok: false, data: { error: "task_or_date" } } };
    }
    const from = task.date;
    s.postponeTask(task.id, to);
    return {
      result: { id: call.id, name: call.name, ok: true, data: { taskId: task.id, from, to } },
      undo: {
        id: task.id,
        label: t("ai.didPostpone", { title: task.title, date: to }),
        kind: "postponeTask",
        payload: { taskId: task.id, prevDate: from },
      },
    };
  }

  if (call.name === "markTaskComplete") {
    const task = resolveTask(args);
    if (!task) {
      return { result: { id: call.id, name: call.name, ok: false, data: { error: "task_not_found" } } };
    }
    if (task.completed) {
      return { result: { id: call.id, name: call.name, ok: true, data: { taskId: task.id, already: true } } };
    }
    s.toggleTask(task.id);
    return {
      result: { id: call.id, name: call.name, ok: true, data: { taskId: task.id } },
      undo: {
        id: task.id,
        label: t("ai.didDone", { title: task.title }),
        kind: "markTaskComplete",
        payload: { taskId: task.id },
      },
    };
  }

  return { result: { id: call.id, name: call.name, ok: false, data: { error: "unknown" } } };
}

export function applyChatCalendarAdds(rows: ChatCalendarAdd[], today: string): ChatUndo[] {
  const s = useApp.getState();
  const taskIds: string[] = [];
  let added = 0;
  for (const row of rows) {
    const title = str(row.title);
    if (!title || !row.start) continue;
    if (!row.recurring && isPastSlot(row.date || today, row.start)) continue;
    const mins = calendarAddMinutes(row);
    if (row.recurring && row.weekday != null) {
      const result = s.addRecurringSessions([
        { title, weekday: row.weekday, time: row.start, estimatedDurationMinutes: mins },
      ]);
      taskIds.push(...result.taskIds);
      added += result.added;
      continue;
    }
    const created = s.addTask({
      date: row.date || today,
      title,
      time: row.start,
      estimatedDurationMinutes: mins,
    });
    if (created) {
      taskIds.push(created);
      added += 1;
    }
  }
  if (!added) return [];
  return [
    {
      id: taskIds[0] ?? uidSafe(),
      label: t("ai.didBatch", { n: added }),
      kind: "createTask",
      payload: { taskIds },
    },
  ];
}

function uidSafe() {
  return `undo-${Date.now()}`;
}

export function undoAiAction(card: ChatUndo) {
  const s = useApp.getState();
  if (card.kind === "createTask" || card.kind === "scheduleStudyHours") {
    s.removeTasks((card.payload.taskIds as string[]) ?? []);
    return;
  }
  if (card.kind === "createGoal") {
    s.removeTasks((card.payload.taskIds as string[]) ?? []);
    if (typeof card.payload.goalId === "string") s.removeGoal(card.payload.goalId);
    return;
  }
  if (card.kind === "postponeTask" && typeof card.payload.taskId === "string") {
    s.moveTask(card.payload.taskId, String(card.payload.prevDate ?? ""));
    return;
  }
  if (card.kind === "markTaskComplete" && typeof card.payload.taskId === "string") {
    s.toggleTask(card.payload.taskId);
  }
}
