"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { t } from "@/lib/i18n";
import {
  addDays,
  addMonths,
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
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { CalendarRail } from "@/components/calendar/CalendarRail";
import { WeekGrid } from "@/components/calendar/WeekGrid";
import {
  EventComposer,
  taskToDraft,
  type ComposerDraft,
} from "@/components/calendar/EventComposer";
import { tint } from "@/lib/timeBlock";

type View = "month" | "week" | "day" | "list";

export default function CalendarPage() {
  return (
    <Suspense fallback={<main className="px-5 py-8" />}>
      <CalendarInner />
    </Suspense>
  );
}

function CalendarInner() {
  const user = useSession();
  const tasks = useApp((s) => s.tasks);
  const goals = useApp((s) => s.goals);
  const addTask = useApp((s) => s.addTask);
  const moveTask = useApp((s) => s.moveTask);
  const updateTask = useApp((s) => s.updateTask);
  const toggleTask = useApp((s) => s.toggleTask);
  const planHours = useApp((s) => s.planHours);
  const search = useSearchParams();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState("");
  const [filter, setFilter] = useState("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [hoursTitle, setHoursTitle] = useState("");
  const [hoursAmt, setHoursAmt] = useState("6");
  const [draft, setDraft] = useState<ComposerDraft | null>(null);
  const [railOpen, setRailOpen] = useState(false);

  useEffect(() => {
    const qDate = search.get("d");
    const qView = search.get("view");
    if (qDate) setCursor(qDate);
    if (qView === "week" || qView === "day" || qView === "month" || qView === "list") {
      setView(qView);
    }
  }, [search]);

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
      if (drawerId || draft || typing) return;
      if (!user) return;
      const today = todayKey(user.timezone);
      if (e.key === "t" || e.key === "T") setCursor(today);
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        setCursor((c) => {
          const base = c || today;
          if (view === "month") return addMonths(base, dir);
          return addDays(base, dir * (view === "week" ? 7 : 1));
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user, view, drawerId, draft]);

  const today = user ? todayKey(user.timezone) : "";
  const activeCursor = cursor || today;
  const week = weekKeys(activeCursor);
  const mine = useMemo(
    () => goals.filter((g) => g.userId === user?.id && g.status === "active"),
    [goals, user?.id],
  );
  const mineTasks = useMemo(
    () =>
      tasks.filter((x) => {
        if (!user || x.userId !== user.id) return false;
        if (filter !== "all" && x.goalId !== filter) return false;
        return true;
      }),
    [tasks, user, filter],
  );
  const todayTasks = useMemo(
    () =>
      mineTasks
        .filter((x) => x.date === today && x.status !== "postponed")
        .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99")),
    [mineTasks, today],
  );
  const loose = useMemo(
    () => mineTasks.filter((x) => week.includes(x.date) && !x.time && x.status !== "postponed"),
    [mineTasks, week],
  );
  const breakdown = useMemo(() => {
    return mine
      .map((g) => ({
        id: g.id,
        title: g.title,
        color: g.color,
        minutes: mineTasks
          .filter((x) => x.goalId === g.id && week.includes(x.date) && x.status !== "postponed")
          .reduce((s, x) => s + (x.estimatedDurationMinutes ?? 30), 0),
      }))
      .filter((x) => x.minutes > 0);
  }, [mine, mineTasks, week]);

  if (!user) return null;
  const drawer = tasks.find((x) => x.id === drawerId) ?? null;

  function saveDraft() {
    if (!draft?.title.trim()) return;
    if (draft.id) {
      updateTask(draft.id, {
        title: draft.title.trim(),
        note: draft.note,
        goalId: draft.goalId || null,
        estimatedDurationMinutes: draft.duration,
      });
      moveTask(draft.id, draft.date, draft.time);
    } else {
      addTask({
        date: draft.date,
        title: draft.title,
        note: draft.note,
        goalId: draft.goalId || null,
        time: draft.time,
        estimatedDurationMinutes: draft.duration,
      });
    }
    setDraft(null);
  }

  const rail = (
    <CalendarRail
      cursor={activeCursor}
      today={today}
      week={week}
      monthDays={monthGrid(activeCursor)}
      todayTasks={todayTasks}
      goals={mine}
      filter={filter}
      breakdown={breakdown}
      hoursTitle={hoursTitle}
      hoursAmt={hoursAmt}
      onCursor={setCursor}
      onFilter={setFilter}
      onToggle={(id) => toggleTask(id)}
      onOpen={setDrawerId}
      onHoursTitle={setHoursTitle}
      onHoursAmt={setHoursAmt}
      onPlan={() => {
        if (!hoursTitle.trim()) return;
        planHours(hoursTitle.trim(), Number(hoursAmt) || 1, week);
        setHoursTitle("");
      }}
    />
  );

  return (
    <main className="flex h-auto flex-col px-4 py-4 lg:h-dvh lg:overflow-hidden lg:px-5 lg:py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl capitalize">{monthLabel(activeCursor)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-chip bg-raised px-3 py-1.5 text-sm lg:hidden"
            onClick={() => setRailOpen((v) => !v)}
          >
            {t("calendar.upcoming")}
          </button>
          <Button
            tone="ghost"
            onClick={() =>
              setCursor(
                view === "month"
                  ? addMonths(activeCursor, -1)
                  : addDays(activeCursor, view === "day" ? -1 : -7),
              )
            }
          >
            {t("common.back")}
          </Button>
          <Button tone="ghost" onClick={() => setCursor(today)}>
            {t("calendar.goToday")}
          </Button>
          <Button
            tone="ghost"
            onClick={() =>
              setCursor(
                view === "month"
                  ? addMonths(activeCursor, 1)
                  : addDays(activeCursor, view === "day" ? 1 : 7),
              )
            }
          >
            {t("common.continue")}
          </Button>
          {(["month", "week", "day", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1.5 text-sm ${view === v ? "bg-white text-black" : "text-faint"}`}
            >
              {t(`calendar.${v}`)}
            </button>
          ))}
        </div>
      </div>

      {railOpen ? <div className="mb-4 lg:hidden">{rail}</div> : null}

      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-5">
        <div className="hidden lg:block lg:min-h-0">{rail}</div>

        <section className="flex h-[70vh] min-h-[28rem] min-w-0 flex-col rounded-2xl border border-white/[0.06] bg-surface p-3 lg:h-full lg:min-h-0 lg:p-4">
          {loose.length > 0 && (view === "week" || view === "day") ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-faint">{t("calendar.looseHint")}</span>
              {loose.map((task) => (
                <button
                  key={task.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/task-id", task.id)}
                  onClick={() => setDraft(taskToDraft(task))}
                  className="rounded-full bg-raised px-2.5 py-1 text-xs"
                >
                  {task.title}
                </button>
              ))}
            </div>
          ) : null}

          {view === "list" ? (
            <div className="space-y-3 overflow-y-auto">
              {Array.from({ length: 21 }, (_, i) => addDays(today, i)).map((d) => {
                const dayTasks = mineTasks.filter((x) => x.date === d);
                if (dayTasks.length === 0 && d > addDays(today, 7)) return null;
                return (
                  <Card key={d} className="p-4">
                    <p className="text-sm text-muted">{prettyDate(d)}</p>
                    {dayTasks.map((task) => (
                      <button
                        key={task.id}
                        className="mt-2 block w-full text-left text-sm"
                        onClick={() => setDraft(taskToDraft(task))}
                      >
                        {task.time ? `${task.time} · ` : ""}
                        {task.title}
                      </button>
                    ))}
                  </Card>
                );
              })}
            </div>
          ) : view === "month" ? (
            <div className="grid min-h-0 flex-1 grid-cols-7 gap-1 overflow-auto">
              {weekKeys(activeCursor).map((d) => (
                <p key={d} className="text-center text-[10px] text-faint">
                  {prettyDate(d).split(" ")[0]}
                </p>
              ))}
              {monthGrid(activeCursor).map((d) => {
                const dayTasks = mineTasks.filter((x) => x.date === d && x.status !== "postponed");
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setCursor(d);
                      setView("week");
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData("text/task-id");
                      if (id) moveTask(id, d);
                    }}
                    className={`min-h-24 rounded-xl border border-white/[0.04] p-1.5 text-left ${
                      d === today ? "bg-raised" : ""
                    } ${!isSameMonth(d, activeCursor) ? "opacity-35" : ""}`}
                  >
                    <p className="text-[11px]">{d.slice(8)}</p>
                    <div className="mt-1 space-y-1">
                      {dayTasks.slice(0, 3).map((task) => {
                        const color = mine.find((g) => g.id === task.goalId)?.color ?? "#6B8CFF";
                        return (
                          <div
                            key={task.id}
                            className="truncate rounded-md px-1 py-0.5 text-[10px]"
                            style={{ background: tint(color, 0.35) }}
                          >
                            {task.title}
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <WeekGrid
              week={view === "day" ? [activeCursor] : week}
              today={today}
              cursor={activeCursor}
              tasks={mineTasks}
              goals={mine}
              onCursor={setCursor}
              onOpen={(task) => setDraft(taskToDraft(task))}
              onSlot={(date, time) =>
                setDraft({
                  title: "",
                  date,
                  time,
                  duration: 30,
                  goalId: filter === "all" ? "" : filter,
                  note: "",
                })
              }
              onMove={moveTask}
            />
          )}
        </section>
      </div>

      {draft ? (
        <div className="fixed inset-0 z-[85] flex items-start justify-center bg-black/50 pt-[12vh]">
          <button className="absolute inset-0" aria-label={t("common.close")} onClick={() => setDraft(null)} />
          <div className="relative z-10">
            <EventComposer
              draft={draft}
              goals={mine}
              onChange={setDraft}
              onSave={saveDraft}
              onClose={() => setDraft(null)}
              onMore={
                draft.id
                  ? () => {
                      setDrawerId(draft.id ?? null);
                      setDraft(null);
                    }
                  : undefined
              }
            />
          </div>
        </div>
      ) : null}

      {drawer ? (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button className="flex-1 bg-black/50" onClick={() => setDrawerId(null)} aria-label={t("common.close")} />
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/[0.06] bg-surface p-5">
            <div className="mb-4 flex justify-between">
              <h3 className="font-display text-xl">{t("calendar.detail")}</h3>
              <button onClick={() => setDrawerId(null)} className="text-faint">
                {t("common.close")}
              </button>
            </div>
            <TaskDetail task={drawer} today={today} />
          </aside>
        </div>
      ) : null}
    </main>
  );
}
