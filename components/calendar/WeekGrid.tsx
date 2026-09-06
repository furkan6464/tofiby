"use client";

import { useEffect, useRef } from "react";
import { t } from "@/lib/i18n";
import type { Goal, SharedQuest, Task } from "@/lib/types";
import {
  dayNum,
  endTime,
  formatHourLabel,
  gmtOffsetLabel,
  initials,
  minutesOf,
  snapMinutes,
  timeFromMinutes,
  weekdayShortTr,
} from "@/lib/timeBlock";
import { overlapColumns } from "@/lib/overlap";

const HOUR_PX = 56;
const START = 0;
const END = 24;
const HOURS = END - START;

type Partner = { id: string; name: string };

export function WeekGrid({
  week,
  today,
  cursor,
  tasks,
  goals,
  quests,
  userId,
  partners,
  timezone,
  onCursor,
  onOpen,
  onSlot,
  onMove,
}: {
  week: string[];
  today: string;
  cursor: string;
  tasks: Task[];
  goals: Goal[];
  quests: SharedQuest[];
  userId: string;
  partners: Partner[];
  timezone: string;
  onCursor: (d: string) => void;
  onOpen: (task: Task, at: { x: number; y: number }) => void;
  onSlot: (date: string, time: string, at: { x: number; y: number }) => void;
  onMove: (id: string, date: string, time: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 8 * HOUR_PX });
  }, []);

  function colorOf(task: Task) {
    return goals.find((g) => g.id === task.goalId)?.color ?? "#3B82F6";
  }

  function faces(task: Task): Partner[] {
    const quest = quests.find((q) => q.taskAId === task.id || q.taskBId === task.id);
    if (!quest) return [];
    const other = quest.fromUser === userId ? quest.toUser : quest.fromUser;
    const found = partners.find((p) => p.id === other);
    return found ? [found] : [{ id: other, name: "?" }];
  }

  function dropOn(date: string, e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/task-id");
    if (!id) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const mins = snapMinutes(START * 60 + (y / HOUR_PX) * 60);
    onMove(id, date, timeFromMinutes(mins));
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className="grid shrink-0 gap-1 px-1 pb-3"
        style={{ gridTemplateColumns: `3.5rem repeat(${week.length}, minmax(0,1fr))` }}
      >
        <span className="self-end pb-2 text-[10px] text-faint">{gmtOffsetLabel(timezone)}</span>
        {week.map((d) => {
          const selected = d === today || d === week[0] || d === week[week.length - 1];
          return (
            <button
              key={d}
              onClick={() => onCursor(d)}
              className="text-center"
            >
              <p className="text-[10px] uppercase tracking-wide text-muted">
                {weekdayShortTr(d)}
              </p>
              <span
                className={`mt-1 inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 font-display text-lg leading-none ${
                  selected ? "bg-white text-black" : "text-ink"
                }`}
              >
                {dayNum(d)}
              </span>
            </button>
          );
        })}
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative grid"
          style={{
            height: HOURS * HOUR_PX,
            gridTemplateColumns: `3.5rem repeat(${week.length}, minmax(0,1fr))`,
          }}
        >
          <div className="relative">
            {Array.from({ length: HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-2 text-[10px] text-faint"
                style={{ top: i * HOUR_PX - 6 }}
              >
                {formatHourLabel(START + i)}
              </div>
            ))}
          </div>
          {week.map((d) => {
            const placed = tasks
              .filter((x) => x.date === d && x.status !== "postponed" && x.time)
              .map((task) => ({
                task,
                start: minutesOf(task.time ?? "00:00"),
                end: minutesOf(task.time ?? "00:00") + Math.max(15, task.estimatedDurationMinutes ?? 30),
              }));
            const layout = overlapColumns(
              placed.map((p) => ({ id: p.task.id, start: p.start, end: p.end })),
            );
            return (
              <div
                key={d}
                className="relative border-l border-white/5"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => dropOn(d, e)}
              >
                {Array.from({ length: HOURS }, (_, i) => (
                  <button
                    key={i}
                    className="group absolute inset-x-0 border-t border-white/5"
                    style={{ top: i * HOUR_PX, height: HOUR_PX }}
                    onClick={(e) =>
                      onSlot(d, `${String(START + i).padStart(2, "0")}:00`, {
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }
                    aria-label={t("calendar.addTask")}
                  >
                    <span className="pointer-events-none absolute left-1/2 top-1/2 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-dashed border-white/35 text-base text-white/80 group-hover:flex">
                      +
                    </span>
                  </button>
                ))}
                {placed.map(({ task, start }) => {
                  const dur = task.estimatedDurationMinutes ?? 30;
                  const top = ((start - START * 60) / 60) * HOUR_PX;
                  const height = Math.max(28, (dur / 60) * HOUR_PX - 6);
                  const color = colorOf(task);
                  const slot = layout.get(task.id) ?? { col: 0, cols: 1 };
                  const avatars = faces(task);
                  const showMeta = height >= 48;
                  const showFaces = height >= 72 && avatars.length > 0;
                  return (
                    <button
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/task-id", task.id);
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(task, { x: e.clientX, y: e.clientY });
                      }}
                      className="absolute z-[1] overflow-hidden rounded-2xl px-2.5 py-1.5 text-left text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
                      style={{
                        top: Math.max(0, top + 3),
                        height,
                        left: `calc(${(slot.col / slot.cols) * 100}% + 4px)`,
                        width: `calc(${100 / slot.cols}% - 8px)`,
                        background: color,
                        opacity: task.completed ? 0.55 : 1,
                      }}
                    >
                      <p className={`truncate text-[12px] font-semibold ${task.completed ? "line-through" : ""}`}>
                        {task.title}
                      </p>
                      {showMeta ? (
                        <p className="text-[10px] text-white/75">
                          {timeFromMinutes(start)} – {endTime(timeFromMinutes(start), dur)}
                        </p>
                      ) : null}
                      {showFaces ? (
                        <div className="mt-1.5 flex -space-x-1.5">
                          {avatars.slice(0, 3).map((p) => (
                            <span
                              key={p.id}
                              className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40 bg-black/25 text-[9px] font-medium"
                            >
                              {initials(p.name)}
                            </span>
                          ))}
                          {avatars.length > 3 ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/40 text-[9px]">
                              +{avatars.length - 3}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
