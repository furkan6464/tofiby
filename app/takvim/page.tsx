"use client";

import { useEffect, useState } from "react";
import { t, tList } from "@/lib/i18n";
import {
  addDays,
  addMonths,
  canMutateTaskDate,
  isSameMonth,
  monthGrid,
  monthLabel,
  prettyDate,
  todayKey,
  weekKeys,
} from "@/lib/dates";
import { useApp, useSession } from "@/lib/store";
import type { Task } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { TaskRow } from "@/components/tasks/TaskRow";

type View = "month" | "week" | "day" | "list";

export default function CalendarPage() {
  const user = useSession();
  const tasks = useApp((s) => s.tasks);
  const goals = useApp((s) => s.goals);
  const addTask = useApp((s) => s.addTask);
  const moveTask = useApp((s) => s.moveTask);
  const updateTask = useApp((s) => s.updateTask);
  const updateTaskSeries = useApp((s) => s.updateTaskSeries);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState("");
  const [filter, setFilter] = useState("all");
  const [inline, setInline] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [drawer, setDrawer] = useState<Task | null>(null);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");
  const [scopeOpen, setScopeOpen] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<{ title: string } | null>(null);

  useEffect(() => {
    if (user && !cursor) setCursor(todayKey(user.timezone));
  }, [user, cursor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
        return;
      }
      if (palette || drawer || typing) return;
      if (!user) return;
      const today = todayKey(user.timezone);
      if (e.key === "t" || e.key === "T") {
        setCursor(today);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        setCursor((c) => {
          const base = c || today;
          if (view === "month") return addMonths(base, dir);
          if (view === "week") return addDays(base, dir * 7);
          return addDays(base, dir);
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user, view, palette, drawer]);

  if (!user) return null;
  const today = todayKey(user.timezone);
  const activeCursor = cursor || today;
  const mine = goals.filter((g) => g.userId === user.id && g.status === "active");
  const mineTasks = tasks.filter((x) => {
    if (x.userId !== user.id) return false;
    if (filter !== "all" && x.goalId !== filter) return false;
    return true;
  });

  function nudge(dir: number) {
    setCursor((c) => {
      const base = c || today;
      if (view === "month") return addMonths(base, dir);
      if (view === "week") return addDays(base, dir * 7);
      return addDays(base, dir);
    });
  }

  function submitInline(date: string) {
    if (!draft.trim()) {
      setInline(null);
      return;
    }
    addTask({ date, title: draft, goalId: filter === "all" ? null : filter });
    setDraft("");
    setInline(null);
  }

  const days =
    view === "month"
      ? monthGrid(activeCursor)
      : view === "week"
        ? weekKeys(activeCursor)
        : [activeCursor];

  return (
    <main className="safe-pad mx-auto max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">{t("calendar.title")}</h1>
          <p className="mt-1 text-muted">{monthLabel(activeCursor)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["month", "week", "day", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-chip px-3 py-1.5 text-sm ${view === v ? "bg-raised" : "text-faint"}`}
            >
              {t(`calendar.${v}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button tone="ghost" onClick={() => nudge(-1)}>
          {t("common.back")}
        </Button>
        <Button tone="ghost" onClick={() => setCursor(today)}>
          {t("calendar.goToday")}
        </Button>
        <Button tone="ghost" onClick={() => nudge(1)}>
          {t("common.continue")}
        </Button>
        <select
          className="rounded-chip bg-raised px-3 py-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{t("calendar.filterAll")}</option>
          {mine.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </div>

      {view === "list" ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 21 }, (_, i) => ({ d: addDays(today, i), i })).map(({ d, i }) => {
            const dayTasks = mineTasks.filter((x) => x.date === d);
            if (dayTasks.length === 0 && i > 7) return null;
            return (
              <Card key={d} className="p-4">
                <p className="text-sm text-muted">{prettyDate(d)}</p>
                {dayTasks.length === 0 ? (
                  <p className="mt-2 text-sm text-faint">{t("calendar.emptyDay")}</p>
                ) : (
                  dayTasks.map((task) => (
                    <button
                      key={task.id}
                      className="mt-2 block w-full text-left text-sm"
                      onClick={() => setDrawer(task)}
                    >
                      {task.title}
                    </button>
                  ))
                )}
              </Card>
            );
          })}
        </div>
      ) : view !== "day" ? (
        <div className="mt-6 grid grid-cols-7 gap-1">
          {tList("onboarding.weekdays").map((d) => (
            <p key={d} className="text-center text-[10px] text-faint">
              {d}
            </p>
          ))}
          {days.map((d) => {
            const dayTasks = mineTasks.filter((x) => x.date === d);
            const ratio =
              dayTasks.length === 0
                ? 0
                : dayTasks.filter((x) => x.completed).length / dayTasks.length;
            return (
              <div
                key={d}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/task-id");
                  if (id) moveTask(id, d);
                }}
                onClick={() => {
                  setCursor(d);
                  setInline(d);
                }}
                className={`min-h-28 rounded-chip border border-white/[0.04] p-2 text-left ${
                  d === today ? "bg-raised" : "bg-surface"
                } ${view === "month" && !isSameMonth(d, activeCursor) ? "opacity-35" : ""}`}
              >
                <p className="text-xs">{d.slice(8)}</p>
                <div className="mt-1 h-1 overflow-hidden rounded-[2px] bg-white/[0.06]">
                  <div className="h-full bg-mint" style={{ width: `${Math.round(ratio * 100)}%` }} />
                </div>
                <div className="mt-2 space-y-1">
                  {dayTasks.slice(0, view === "week" ? 8 : 3).map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/task-id", task.id);
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDrawer(task);
                      }}
                      className={`truncate rounded-[4px] px-1 py-0.5 text-[11px] ${
                        task.completed ? "text-faint line-through" : "bg-raised"
                      }`}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
                {inline === d ? (
                  <input
                    autoFocus
                    className="mt-2 w-full px-1 py-1 text-xs"
                    placeholder={t("calendar.inlineAdd")}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitInline(d);
                      if (e.key === "Escape") setInline(null);
                    }}
                    onBlur={() => submitInline(d)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="mt-6 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">{prettyDate(activeCursor)}</h2>
          </div>
          {!canMutateTaskDate(activeCursor, user.timezone) && activeCursor < today ? (
            <p className="mt-2 text-sm text-faint">{t("calendar.closedDay")}</p>
          ) : (
            <input
              className="mt-3 w-full px-3 py-2 text-sm"
              placeholder={t("calendar.inlineAdd")}
              value={inline === activeCursor ? draft : ""}
              onFocus={() => setInline(activeCursor)}
              onChange={(e) => {
                setInline(activeCursor);
                setDraft(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitInline(activeCursor);
              }}
            />
          )}
          <div className="mt-4">
            {mineTasks.filter((x) => x.date === activeCursor).length === 0 ? (
              <p className="text-sm text-muted">{t("calendar.emptyDay")}</p>
            ) : (
              mineTasks
                .filter((x) => x.date === activeCursor)
                .map((task) => (
                  <div key={task.id} onClick={() => setDrawer(task)}>
                    <TaskRow task={task} />
                  </div>
                ))
            )}
          </div>
        </Card>
      )}

      <div className="mt-6">
        <p className="text-xs text-faint">{t("calendar.legend")}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {mine.map((g) => (
            <button
              key={g.id}
              onClick={() => setFilter(filter === g.id ? "all" : g.id)}
              className="flex items-center gap-2 text-sm text-muted"
            >
              <i className="h-2 w-2 rounded-full" style={{ background: g.color }} />
              {g.title}
            </button>
          ))}
        </div>
      </div>

      {drawer ? (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button className="flex-1 bg-black/50" onClick={() => setDrawer(null)} aria-label={t("common.close")} />
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/[0.06] bg-surface p-5">
            <div className="mb-4 flex justify-between">
              <h3 className="font-display text-xl">{t("calendar.detail")}</h3>
              <button onClick={() => setDrawer(null)} className="text-faint">
                {t("common.close")}
              </button>
            </div>
            <Field
              label={t("calendar.taskName")}
              value={drawer.title}
              onChange={(e) => setDrawer({ ...drawer, title: e.target.value })}
              onBlur={() => {
                if (!drawer) return;
                const live = tasks.find((x) => x.id === drawer.id);
                if (!live || live.title === drawer.title) return;
                if (drawer.goalId) {
                  setPendingPatch({ title: drawer.title });
                  setScopeOpen(true);
                } else {
                  updateTask(drawer.id, { title: drawer.title });
                }
              }}
            />
            <div className="mt-3">
              <Field
                label={t("common.note")}
                value={drawer.note}
                onChange={(e) => {
                  setDrawer({ ...drawer, note: e.target.value });
                  updateTask(drawer.id, { note: e.target.value });
                }}
              />
            </div>
            <label className="mt-3 block space-y-1.5">
              <span className="text-sm text-muted">{t("calendar.date")}</span>
              <input
                type="date"
                className="w-full px-3 py-2.5"
                value={drawer.date}
                onChange={(e) => {
                  moveTask(drawer.id, e.target.value);
                  setDrawer({ ...drawer, date: e.target.value });
                }}
              />
            </label>
            <label className="mt-3 block space-y-1.5">
              <span className="text-sm text-muted">{t("calendar.attachGoal")}</span>
              <select
                className="w-full rounded-chip bg-raised px-3 py-2.5"
                value={drawer.goalId ?? ""}
                onChange={(e) => {
                  const goalId = e.target.value || null;
                  updateTask(drawer.id, { goalId });
                  setDrawer({ ...drawer, goalId });
                }}
              >
                <option value="">{t("calendar.noGoal")}</option>
                {mine.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </label>
          </aside>
        </div>
      ) : null}

      {palette ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 pt-[15vh]">
          <div className="w-[min(32rem,92vw)] rounded-nest border border-white/[0.06] bg-surface p-3">
            <p className="px-2 pb-2 text-xs text-faint">{t("calendar.paletteTitle")}</p>
            <input
              autoFocus
              className="w-full px-3 py-2"
              placeholder={t("common.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setPalette(false);
              }}
            />
            <div className="mt-2">
              <button
                className="block w-full rounded-chip px-3 py-2 text-left text-sm hover:bg-raised"
                onClick={() => {
                  setPalette(false);
                  setCursor(today);
                  setView("day");
                  setInline(today);
                }}
              >
                {t("calendar.paletteAdd")}
              </button>
              <button
                className="block w-full rounded-chip px-3 py-2 text-left text-sm hover:bg-raised"
                onClick={() => {
                  setCursor(today);
                  setPalette(false);
                }}
              >
                {t("calendar.paletteToday")}
              </button>
              {mine
                .filter((g) => g.title.toLowerCase().includes(query.toLowerCase()))
                .map((g) => (
                  <button
                    key={g.id}
                    className="block w-full rounded-chip px-3 py-2 text-left text-sm hover:bg-raised"
                    onClick={() => {
                      setFilter(g.id);
                      setPalette(false);
                    }}
                  >
                    {t("calendar.paletteGoal")} · {g.title}
                  </button>
                ))}
              {mineTasks
                .filter((x) => x.title.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 8)
                .map((task) => (
                  <button
                    key={task.id}
                    className="block w-full rounded-chip px-3 py-2 text-left text-sm hover:bg-raised"
                    onClick={() => {
                      setDrawer(task);
                      setPalette(false);
                    }}
                  >
                    {task.title}
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}

      <Modal open={scopeOpen} onClose={() => setScopeOpen(false)} title={t("calendar.scopeTitle")}>
        <div className="flex flex-col gap-2">
          <Button
            tone="ghost"
            onClick={() => {
              if (drawer && pendingPatch) updateTaskSeries(drawer.id, pendingPatch, "one");
              setScopeOpen(false);
              setPendingPatch(null);
            }}
          >
            {t("calendar.scopeOne")}
          </Button>
          <Button
            onClick={() => {
              if (drawer && pendingPatch) updateTaskSeries(drawer.id, pendingPatch, "future");
              setScopeOpen(false);
              setPendingPatch(null);
            }}
          >
            {t("calendar.scopeFuture")}
          </Button>
        </div>
      </Modal>
    </main>
  );
}
