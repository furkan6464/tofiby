"use client";

import Link from "next/link";
import { t } from "@/lib/i18n";
import { isSameMonth, monthGrid, monthLabel } from "@/lib/dates";
import { dayNum } from "@/lib/timeBlock";
import type { Goal, Task } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export function CalendarRail({
  cursor,
  today,
  week,
  monthDays,
  todayTasks,
  goals,
  filter,
  breakdown,
  hoursTitle,
  hoursAmt,
  onCursor,
  onFilter,
  onToggle,
  onOpen,
  onHoursTitle,
  onHoursAmt,
  onPlan,
}: {
  cursor: string;
  today: string;
  week: string[];
  monthDays: string[];
  todayTasks: Task[];
  goals: Goal[];
  filter: string;
  breakdown: { id: string; title: string; color: string; minutes: number }[];
  hoursTitle: string;
  hoursAmt: string;
  onCursor: (d: string) => void;
  onFilter: (id: string) => void;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onHoursTitle: (v: string) => void;
  onHoursAmt: (v: string) => void;
  onPlan: () => void;
}) {
  const maxMin = Math.max(1, ...breakdown.map((b) => b.minutes));
  return (
    <aside className="flex flex-col gap-4 lg:h-full lg:overflow-y-auto lg:pr-1">
      <section className="rounded-2xl border border-white/[0.06] bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm capitalize">{monthLabel(cursor)}</p>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-faint">
          {["P", "S", "Ç", "P", "C", "C", "P"].map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
          {monthDays.map((d) => {
            const inWeek = week.includes(d);
            const first = d === week[0];
            const last = d === week[6];
            return (
              <button
                key={d}
                onClick={() => onCursor(d)}
                className={`h-7 text-[11px] ${
                  !isSameMonth(d, cursor) ? "text-faint/50" : ""
                } ${inWeek ? "bg-white text-black" : ""} ${
                  first ? "rounded-l-full" : ""
                } ${last ? "rounded-r-full" : ""} ${
                  !inWeek && d === today ? "rounded-full bg-raised" : ""
                }`}
              >
                {dayNum(d)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm">{t("calendar.upcoming")}</p>
          <Link href="/gorevler" className="text-[11px] text-faint">
            {t("calendar.viewAll")}
          </Link>
        </div>
        <div className="space-y-2">
          {todayTasks.length === 0 ? (
            <p className="text-xs text-faint">{t("calendar.emptyDay")}</p>
          ) : (
            todayTasks.map((task) => (
              <label key={task.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggle(task.id)}
                />
                <button
                  className={`min-w-0 flex-1 truncate text-left ${task.completed ? "text-faint line-through" : ""}`}
                  onClick={() => onOpen(task.id)}
                >
                  {task.title}
                </button>
                <span className="shrink-0 text-[10px] text-faint">
                  {task.time ?? "—"}
                </span>
              </label>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-surface p-4">
        <p className="mb-3 text-sm">{t("calendar.breakdown")}</p>
        <div className="space-y-2.5">
          {breakdown.length === 0 ? (
            <p className="text-xs text-faint">{t("common.empty")}</p>
          ) : (
            breakdown.map((row) => (
              <div key={row.id}>
                <div className="mb-1 flex justify-between text-[11px] text-muted">
                  <span>{row.title}</span>
                  <span>{row.minutes} dk</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((row.minutes / maxMin) * 100)}%`,
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
        <p className="mb-3 text-sm">{t("calendar.myCalendars")}</p>
        <div className="space-y-1.5">
          <button
            onClick={() => onFilter("all")}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${filter === "all" ? "bg-raised" : "text-muted"}`}
          >
            {t("calendar.filterAll")}
          </button>
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => onFilter(g.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${filter === g.id ? "bg-raised" : "text-muted"}`}
            >
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
              {g.title}
            </button>
          ))}
        </div>
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
      </section>
    </aside>
  );
}
