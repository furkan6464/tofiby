"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { addDays, prettyDate, todayKey } from "@/lib/dates";
import { isActiveGoal, isTaskDone } from "@/lib/plan";
import { useApp, useSession } from "@/lib/store";
import type { Goal, Task } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { openFocus } from "@/components/focus/FocusSession";

type StatusFilter = "all" | "pending" | "done" | "postponed";
type DateFilter = "all" | "today" | "week";
type SortKey = "date" | "priority" | "duration";

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function statusOf(task: Task): "done" | "postponed" | "pending" {
  if (task.status === "postponed") return "postponed";
  if (isTaskDone(task)) return "done";
  return "pending";
}

function PriLabel({ task }: { task: Task }) {
  if (task.priority === "high") return <span className="text-[11px] text-pink">{t("calendar.priorityHigh")}</span>;
  if (task.priority === "low") return <span className="text-[11px] text-faint">{t("calendar.priorityLow")}</span>;
  return <span className="text-[11px] text-muted">{t("calendar.priorityMid")}</span>;
}

export default function TasksPage() {
  const user = useSession();
  const tasks = useApp((s) => s.tasks) ?? [];
  const goals = useApp((s) => s.goals) ?? [];
  const today = user ? todayKey(user.timezone) : "";
  const [status, setStatus] = useState<StatusFilter>("all");
  const [goalId, setGoalId] = useState("all");
  const [when, setWhen] = useState<DateFilter>("all");
  const [sort, setSort] = useState<SortKey>("date");

  const mineGoals = useMemo(
    () => (user ? goals.filter((g) => g.userId === user.id && isActiveGoal(g)) : []),
    [goals, user],
  );

  const rows = useMemo(() => {
    if (!user) return [];
    const weekStart = today ? addDays(today, -6) : "";
    return tasks
      .filter((x) => x.userId === user.id)
      .filter((x) => (status === "all" ? true : statusOf(x) === status))
      .filter((x) => (goalId === "all" ? true : goalId === "none" ? !x.goalId : x.goalId === goalId))
      .filter((x) => {
        if (when === "today") return x.date === today;
        if (when === "week") return x.date >= weekStart && x.date <= today;
        return true;
      })
      .sort((a, b) => {
        if (sort === "priority") return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.date.localeCompare(b.date);
        if (sort === "duration") return (b.estimatedDurationMinutes ?? 0) - (a.estimatedDurationMinutes ?? 0);
        return a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "");
      });
  }, [tasks, user, status, goalId, when, sort, today]);

  const groups = useMemo(() => {
    const map = new Map<string, { goal: Goal | null; list: Task[] }>();
    for (const task of rows) {
      const key = task.goalId ?? "none";
      const cur = map.get(key) ?? {
        goal: mineGoals.find((g) => g.id === task.goalId) ?? null,
        list: [],
      };
      cur.list.push(task);
      map.set(key, cur);
    }
    const ordered: { key: string; goal: Goal | null; list: Task[] }[] = [];
    for (const g of mineGoals) {
      const hit = map.get(g.id);
      if (hit) ordered.push({ key: g.id, ...hit });
    }
    const none = map.get("none");
    if (none) ordered.push({ key: "none", ...none });
    for (const [key, val] of map) {
      if (key !== "none" && !ordered.some((x) => x.key === key)) {
        ordered.push({ key, ...val });
      }
    }
    return ordered;
  }, [rows, mineGoals]);

  if (!user) return null;

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="font-display text-4xl">{t("tasksPage.title")}</h1>
      <p className="mt-2 text-sm text-faint">{t("tasksPage.lead")}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["all", "tasksPage.filterAll"],
            ["pending", "tasksPage.filterPending"],
            ["done", "tasksPage.filterDone"],
            ["postponed", "tasksPage.filterLater"],
          ] as const
        ).map(([k, key]) => (
          <button
            key={k}
            type="button"
            onClick={() => setStatus(k)}
            className={`rounded-chip px-3 py-1.5 text-sm ${status === k ? "bg-raised" : "text-faint"}`}
          >
            {t(key)}
          </button>
        ))}
        <select
          className="rounded-chip bg-raised px-3 py-1.5 text-sm"
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          aria-label={t("tasksPage.byGoal")}
        >
          <option value="all">{t("tasksPage.allGoals")}</option>
          <option value="none">{t("tasksPage.noGoal")}</option>
          {mineGoals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <select
          className="rounded-chip bg-raised px-3 py-1.5 text-sm"
          value={when}
          onChange={(e) => setWhen(e.target.value as DateFilter)}
          aria-label={t("tasksPage.byDate")}
        >
          <option value="all">{t("tasksPage.dateAll")}</option>
          <option value="today">{t("common.today")}</option>
          <option value="week">{t("tasksPage.dateWeek")}</option>
        </select>
        <select
          className="rounded-chip bg-raised px-3 py-1.5 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label={t("tasksPage.sort")}
        >
          <option value="date">{t("tasksPage.sortDate")}</option>
          <option value="priority">{t("tasksPage.sortPri")}</option>
          <option value="duration">{t("tasksPage.sortDur")}</option>
        </select>
      </div>

      <div className="mt-6 space-y-5">
        {groups.length === 0 ? (
          <Card className="p-8 text-center text-muted">{t("tasksPage.empty")}</Card>
        ) : (
          groups.map((group) => (
            <Card key={group.key} className="overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: group.goal?.color ?? "#FF3E9E" }}
                />
                <p className="font-display text-lg">{group.goal?.title ?? t("tasksPage.noGoal")}</p>
                <span className="text-xs text-faint">{group.list.length}</span>
              </div>
              <div className="hidden grid-cols-[1fr_7rem_5rem_6rem_5.5rem] gap-2 px-4 py-2 text-[11px] text-faint sm:grid">
                <span>{t("calendar.taskName")}</span>
                <span>{t("calendar.date")}</span>
                <span>{t("common.priority")}</span>
                <span>{t("onboarding.dailyMins")}</span>
                <span>{t("tasksPage.tag")}</span>
              </div>
              {group.list.map((task) => (
                <div
                  key={task.id}
                  className="grid grid-cols-1 items-center gap-1 border-t border-white/[0.04] px-4 py-2.5 sm:grid-cols-[1fr_7rem_5rem_6rem_5.5rem] sm:gap-2"
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm ${statusOf(task) !== "pending" ? "text-muted line-through" : ""}`}>
                      {task.title}
                    </p>
                    {task.time ? <p className="text-[11px] text-faint">{task.time}</p> : null}
                    {statusOf(task) === "pending" && task.date === today ? (
                      <button
                        type="button"
                        className="mt-1 text-[11px] text-pink"
                        onClick={() => openFocus(task)}
                      >
                        {t("focus.start")}
                      </button>
                    ) : null}
                  </div>
                  <Link href={`/takvim?d=${task.date}`} className="text-xs text-muted">
                    {prettyDate(task.date)}
                  </Link>
                  <PriLabel task={task} />
                  <span className="text-xs text-muted">
                    {task.estimatedDurationMinutes
                      ? t("tasksPage.mins", { n: task.estimatedDurationMinutes })
                      : "—"}
                  </span>
                  <span className="truncate text-xs text-faint">{task.tag || "—"}</span>
                </div>
              ))}
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
