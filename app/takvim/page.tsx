"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { t } from "@/lib/i18n";
import {
  addDays,
  addMonths,
  dateKeysBetween,
  diffDays,
  isSameMonth,
  monthGrid,
  monthLabel,
  nextCalendarRange,
  prettyDate,
  todayKey,
  weekKeys,
} from "@/lib/dates";
import { useApp, useSession } from "@/lib/store";
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
import { GOAL_COLOR_FALLBACK } from "@/lib/goalColors";
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
  const users = useApp((s) => s.users);
  const quests = useApp((s) => s.sharedQuests);
  const addTask = useApp((s) => s.addTask);
  const moveTask = useApp((s) => s.moveTask);
  const updateTask = useApp((s) => s.updateTask);
  const toggleTask = useApp((s) => s.toggleTask);
  const planHours = useApp((s) => s.planHours);
  const search = useSearchParams();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState("");
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState("");
  const [hiddenCals, setHiddenCals] = useState<string[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [hoursTitle, setHoursTitle] = useState("");
  const [hoursAmt, setHoursAmt] = useState("6");
  const [draft, setDraft] = useState<ComposerDraft | null>(null);
  const [popAt, setPopAt] = useState<{ x: number; y: number } | null>(null);
  const [railOpen, setRailOpen] = useState(false);

  function applyRange(start: string, end: string) {
    const lo = start <= end ? start : end;
    const hi = start <= end ? end : start;
    setRangeStart(lo);
    setRangeEnd(hi);
    setCursor(lo);
    if (diffDays(lo, hi) + 1 > 14) setView("list");
  }

  function pickSingle(d: string) {
    applyRange(d, d);
  }

  function selectDay(d: string) {
    const next = nextCalendarRange(rangeStart, rangeEnd, d);
    applyRange(next.rangeStart, next.rangeEnd);
  }

  function shiftRange(days: number) {
    const start = rangeStart || cursor;
    const end = rangeEnd || cursor;
    if (!start || !end) return;
    applyRange(addDays(start, days), addDays(end, days));
  }

  useEffect(() => {
    const qDate = search.get("d");
    const qView = search.get("view");
    if (qDate) {
      setCursor(qDate);
      setRangeStart(qDate);
      setRangeEnd(qDate);
    }
    if (qView === "week" || qView === "day" || qView === "month" || qView === "list") {
      setView(qView);
    }
  }, [search]);

  useEffect(() => {
    if (!user || cursor) return;
    const d = todayKey(user.timezone);
    setCursor(d);
    setRangeStart(d);
    setRangeEnd(d);
  }, [user, cursor]);

  useEffect(() => {
    if (cursor) setMonthCursor(cursor);
  }, [cursor]);

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
      if (e.key === "t" || e.key === "T") pickSingle(today);
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        if (view === "month") {
          pickSingle(addMonths(cursor || today, dir));
          return;
        }
        const span =
          rangeStart && rangeEnd ? Math.max(1, diffDays(rangeStart, rangeEnd) + 1) : view === "week" ? 7 : 1;
        shiftRange(dir * span);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user, view, drawerId, draft, cursor, rangeStart, rangeEnd]);

  const today = user ? todayKey(user.timezone) : "";
  const activeCursor = cursor || today;
  const rangeLo = rangeStart && rangeEnd ? (rangeStart <= rangeEnd ? rangeStart : rangeEnd) : activeCursor;
  const rangeHi = rangeStart && rangeEnd ? (rangeStart <= rangeEnd ? rangeEnd : rangeStart) : activeCursor;
  const rangeSpan = diffDays(rangeLo, rangeHi) + 1;
  const visibleDays = dateKeysBetween(rangeLo, rangeHi, 14);
  const week = visibleDays;
  const hidden = useMemo(() => new Set(hiddenCals), [hiddenCals]);
  const mine = useMemo(
    () => goals.filter((g) => g.userId === user?.id && g.status === "active"),
    [goals, user?.id],
  );
  const mineTasks = useMemo(
    () =>
      tasks.filter((x) => {
        if (!user || x.userId !== user.id) return false;
        if (x.goalId) {
          if (hidden.has(x.goalId) || hidden.has("goals")) return false;
        } else if (hidden.has("personal")) {
          return false;
        }
        return true;
      }),
    [tasks, user, hidden],
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
    if (!user || !today) return [];
    const from = addDays(today, -29);
    const inWindow = tasks.filter(
      (x) =>
        x.userId === user.id &&
        x.date >= from &&
        x.date <= today &&
        x.status !== "postponed",
    );
    const rows = mine.map((g) => ({
      id: g.id,
      title: g.title,
      color: g.color,
      minutes: inWindow
        .filter((x) => x.goalId === g.id)
        .reduce((s, x) => s + (x.estimatedDurationMinutes ?? 30), 0),
    }));
    const personalMin = inWindow
      .filter((x) => !x.goalId)
      .reduce((s, x) => s + (x.estimatedDurationMinutes ?? 30), 0);
    if (personalMin > 0) {
      rows.push({
        id: "personal",
        title: t("calendar.personal"),
        color: "#FF3E9E",
        minutes: personalMin,
      });
    }
    return rows.filter((x) => x.minutes > 0);
  }, [mine, tasks, user, today]);

  const partners = useMemo(
    () => users.map((u) => ({ id: u.id, name: u.username })),
    [users],
  );

  const draftFaces = useMemo(() => {
    if (!draft?.id || !user) return [];
    const quest = quests.find((q) => q.taskAId === draft.id || q.taskBId === draft.id);
    if (!quest) return [];
    const other = quest.fromUser === user.id ? quest.toUser : quest.fromUser;
    const found = users.find((u) => u.id === other);
    return found ? [{ id: found.id, name: found.username }] : [];
  }, [draft?.id, quests, user, users]);

  if (!user) return null;
  const drawer = tasks.find((x) => x.id === drawerId) ?? null;

  function openDraft(next: ComposerDraft, at?: { x: number; y: number }) {
    setDraft(next);
    setPopAt(at ?? { x: window.innerWidth / 2, y: 180 });
  }

  function saveDraft() {
    if (!draft?.title.trim()) return;
    if (draft.id) {
      updateTask(draft.id, {
        title: draft.title.trim(),
        note: draft.note,
        description: draft.description ?? "",
        priority: draft.priority ?? "medium",
        goalId: draft.goalId || null,
        estimatedDurationMinutes: draft.duration,
      });
      moveTask(draft.id, draft.date, draft.time);
    } else {
      addTask({
        date: draft.date,
        title: draft.title,
        note: draft.note,
        description: draft.description,
        priority: draft.priority,
        goalId: draft.goalId || null,
        time: draft.time,
        estimatedDurationMinutes: draft.duration,
      });
    }
    setDraft(null);
  }

  const popStyle = popAt
    ? {
        left: Math.min(Math.max(16, popAt.x - 24), typeof window !== "undefined" ? window.innerWidth - 380 : popAt.x),
        top: Math.min(Math.max(80, popAt.y - 24), typeof window !== "undefined" ? window.innerHeight - 120 : popAt.y),
      }
    : { left: 80, top: 120 };

  const rail = (
    <CalendarRail
      monthCursor={monthCursor || activeCursor}
      today={today}
      rangeStart={rangeStart ?? activeCursor}
      rangeEnd={rangeEnd ?? activeCursor}
      monthDays={monthGrid(monthCursor || activeCursor)}
      todayTasks={todayTasks}
      goals={mine}
      hiddenCals={hiddenCals}
      breakdown={breakdown}
      hoursTitle={hoursTitle}
      hoursAmt={hoursAmt}
      onCursor={selectDay}
      onMonth={setMonthCursor}
      onToggleCal={(id) =>
        setHiddenCals((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
      }
      onToggle={(id) => toggleTask(id)}
      onOpen={(id) => {
        const task = tasks.find((x) => x.id === id);
        if (task) openDraft(taskToDraft(task));
      }}
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
    <main className="flex h-auto flex-col px-4 py-4 lg:h-full lg:overflow-hidden lg:px-6 lg:py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold capitalize leading-none lg:text-[32px]">
          {monthLabel(activeCursor)}
        </h1>
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
              view === "month"
                ? pickSingle(addMonths(activeCursor, -1))
                : shiftRange(-(view === "day" ? 1 : Math.min(7, rangeSpan)))
            }
          >
            {t("common.back")}
          </Button>
          <Button tone="ghost" onClick={() => pickSingle(today)}>
            {t("calendar.goToday")}
          </Button>
          <Button
            tone="ghost"
            onClick={() =>
              view === "month"
                ? pickSingle(addMonths(activeCursor, 1))
                : shiftRange(view === "day" ? 1 : Math.min(7, rangeSpan))
            }
          >
            {t("common.continue")}
          </Button>
          <div className="flex rounded-full bg-white/5 p-1">
            {(["month", "week", "day", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-3.5 py-1.5 text-sm ${
                  view === v ? "bg-white font-medium text-black" : "text-muted"
                }`}
              >
                {t(`calendar.${v}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {railOpen ? <div className="mb-4 lg:hidden">{rail}</div> : null}

      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:gap-5">
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
                  onClick={(e) => openDraft(taskToDraft(task), { x: e.clientX, y: e.clientY })}
                  className="rounded-full bg-raised px-2.5 py-1 text-xs"
                >
                  {task.title}
                </button>
              ))}
            </div>
          ) : null}

          {view === "list" ? (
            <div className="space-y-3 overflow-y-auto">
              {(rangeSpan > 1 ? dateKeysBetween(rangeLo, rangeHi) : Array.from({ length: 21 }, (_, i) => addDays(today, i))).map((d) => {
                const dayTasks = mineTasks.filter((x) => x.date === d);
                if (dayTasks.length === 0 && d > addDays(today, 7)) return null;
                return (
                  <Card key={d} className="p-4">
                    <p className="text-sm text-muted">{prettyDate(d)}</p>
                    {dayTasks.map((task) => (
                      <button
                        key={task.id}
                        className="mt-2 block w-full text-left text-sm"
                        onClick={(e) => openDraft(taskToDraft(task), { x: e.clientX, y: e.clientY })}
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
                      selectDay(d);
                      if (view === "month") setView("week");
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
                        const color = mine.find((g) => g.id === task.goalId)?.color ?? GOAL_COLOR_FALLBACK;
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
              week={visibleDays}
              today={today}
              cursor={activeCursor}
              tasks={mineTasks}
              goals={mine}
              quests={quests}
              userId={user.id}
              partners={partners}
              timezone={user.timezone}
              onCursor={selectDay}
              onOpen={(task, at) => openDraft(taskToDraft(task), at)}
              onSlot={(date, time, at) =>
                openDraft(
                  {
                    title: "",
                    date,
                    time,
                    duration: 30,
                    goalId: "",
                    note: "",
                  },
                  at,
                )
              }
              onMove={moveTask}
            />
          )}
        </section>
      </div>

      {draft ? (
        <>
          <button
            className="fixed inset-0 z-[85] bg-black/35"
            aria-label={t("common.close")}
            onClick={() => setDraft(null)}
          />
          <div className="fixed z-[86]" style={popStyle}>
            <EventComposer
              draft={draft}
              goals={mine}
              faces={draftFaces}
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
        </>
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
