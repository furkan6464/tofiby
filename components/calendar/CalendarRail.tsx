"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@/lib/i18n";
import { addMonths, isSameMonth, monthLabel } from "@/lib/dates";
import { dayNum, endTime } from "@/lib/timeBlock";
import type { Goal, Task } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export function CalendarRail({
  monthCursor,
  today,
  rangeStart,
  rangeEnd,
  monthDays,
  todayTasks,
  goals,
  hiddenCals,
  breakdown,
  hoursTitle,
  hoursAmt,
  onCursor,
  onMonth,
  onToggleCal,
  onToggle,
  onOpen,
  onHoursTitle,
  onHoursAmt,
  onPlan,
  aiSlot,
}: {
  monthCursor: string;
  today: string;
  rangeStart: string | null;
  rangeEnd: string | null;
  monthDays: string[];
  todayTasks: Task[];
  goals: Goal[];
  hiddenCals: string[];
  breakdown: { id: string; title: string; color: string; minutes: number }[];
  hoursTitle: string;
  hoursAmt: string;
  onCursor: (d: string) => void;
  onMonth: (d: string) => void;
  onToggleCal: (id: string) => void;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onHoursTitle: (v: string) => void;
  onHoursAmt: (v: string) => void;
  onPlan: () => void;
  aiSlot?: ReactNode;
}) {
  const [calsOpen, setCalsOpen] = useState(true);
  const totalMin = breakdown.reduce((s, b) => s + b.minutes, 0);
  const hidden = new Set(hiddenCals);
  const lo = rangeStart && rangeEnd ? (rangeStart <= rangeEnd ? rangeStart : rangeEnd) : null;
  const hi = rangeStart && rangeEnd ? (rangeStart <= rangeEnd ? rangeEnd : rangeStart) : null;
  const spanned = Boolean(lo && hi && lo !== hi);

  return (
    <aside className="flex w-full flex-col gap-4 lg:h-full lg:overflow-y-auto lg:pr-1">
      <section className="rounded-2xl border border-white/[0.06] bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm capitalize">{monthLabel(monthCursor)}</p>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label={t("common.back")}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-white/5"
              onClick={() => onMonth(addMonths(monthCursor, -1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label={t("common.continue")}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-white/5"
              onClick={() => onMonth(addMonths(monthCursor, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[10px] text-muted">
          {["P", "S", "Ç", "P", "C", "C", "P"].map((d, i) => (
            <span key={`${d}-${i}`} className="pb-1">
              {d}
            </span>
          ))}
          {monthDays.map((d) => {
            const inMonth = isSameMonth(d, monthCursor);
            const isStart = d === lo;
            const isEnd = d === hi;
            const edge = isStart || isEnd;
            const mid = spanned && lo && hi && d > lo && d < hi;
            const strip =
              spanned && lo && hi && d >= lo && d <= hi
                ? isStart && isEnd
                  ? null
                  : isStart
                    ? "left-1/2 right-0 rounded-l-full"
                    : isEnd
                      ? "left-0 right-1/2 rounded-r-full"
                      : "inset-x-0"
                : null;
            return (
              <button
                key={d}
                onClick={() => onCursor(d)}
                className="relative flex h-8 items-center justify-center text-[11px]"
              >
                {strip ? (
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute inset-y-1 bg-pink/15 ${strip}`}
                  />
                ) : null}
                <span
                  className={`relative z-10 flex h-7 w-7 items-center justify-center ${
                    edge
                      ? "rounded-full bg-white font-medium text-black"
                      : d === today
                        ? "rounded-full bg-raised text-ink"
                        : mid
                          ? "text-ink"
                          : inMonth
                            ? "text-ink/80"
                            : "text-faint"
                  }`}
                >
                  {dayNum(d)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm">{t("calendar.upcoming")}</p>
          <Link href="/gorevler" className="text-[11px] text-muted">
            {t("calendar.viewAll")}
          </Link>
        </div>
        <div className="space-y-2.5">
          {todayTasks.length === 0 ? (
            <p className="text-xs text-faint">{t("calendar.emptyDay")}</p>
          ) : (
            todayTasks.map((task) => {
              const range = task.time
                ? `${task.time} – ${endTime(task.time, task.estimatedDurationMinutes ?? 30)}`
                : "—";
              return (
                <div key={task.id} className="flex items-center gap-2.5 text-sm">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={task.completed}
                    onClick={() => onToggle(task.id)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border ${
                      task.completed
                        ? "border-[#22C55E] bg-[#22C55E]"
                        : "border-white/20 bg-transparent"
                    }`}
                  >
                    {task.completed ? <Check size={12} strokeWidth={3} className="text-white" /> : null}
                  </button>
                  <button
                    className={`min-w-0 flex-1 truncate text-left ${task.completed ? "text-faint line-through" : ""}`}
                    onClick={() => onOpen(task.id)}
                  >
                    {task.title}
                  </button>
                  <span className="shrink-0 text-[11px] text-muted">{range}</span>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-surface p-4">
        <p className="mb-3 text-sm">{t("calendar.breakdown")}</p>
        <div className="space-y-3">
          {breakdown.length === 0 || totalMin === 0 ? (
            <p className="text-xs text-faint">{t("common.empty")}</p>
          ) : (
            breakdown.map((row) => (
              <div key={row.id}>
                <p className="mb-1.5 text-[11px] text-muted">{row.title}</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(8, Math.round((row.minutes / totalMin) * 100))}%`,
                      background: row.color,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-surface p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm"
          onClick={() => setCalsOpen((v) => !v)}
        >
          {t("calendar.myCalendars")}
          <ChevronDown size={16} className={`text-muted transition ${calsOpen ? "rotate-180" : ""}`} />
        </button>
        {calsOpen ? (
          <div className="mt-3 space-y-2">
            {[
              { id: "personal", title: t("calendar.personal"), color: "var(--goal-pink)" },
              { id: "goals", title: t("calendar.tofibyGoals"), color: "var(--goal-purple)" },
              ...goals.map((g) => ({ id: g.id, title: g.title, color: g.color })),
            ].map((row) => {
              const checked = !hidden.has(row.id);
              return (
                <label key={row.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
                  <input
                    type="checkbox"
                    className="accent-violet"
                    checked={checked}
                    onChange={() => onToggleCal(row.id)}
                  />
                  <i className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                  {row.title}
                </label>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-surface p-4">
        <p className="mb-3 text-sm">{t("calendar.planHours")}</p>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            onPlan();
          }}
        >
          <input
            className="w-full px-3 py-2 text-sm"
            placeholder={t("calendar.planTitle")}
            value={hoursTitle}
            onChange={(e) => onHoursTitle(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="w-20 px-3 py-2 text-sm"
              type="number"
              min={1}
              max={40}
              value={hoursAmt}
              onChange={(e) => onHoursAmt(e.target.value)}
              aria-label={t("calendar.planAmount")}
            />
            <Button className="flex-1" type="submit">
              {t("calendar.planGo")}
            </Button>
          </div>
        </form>
        {aiSlot}
      </section>
    </aside>
  );
}
