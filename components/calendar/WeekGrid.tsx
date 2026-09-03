"use client";

import { useEffect, useRef } from "react";
import { t } from "@/lib/i18n";
import type { Goal, Task } from "@/lib/types";
import { dayNum, endTime, minutesOf, snapMinutes, timeFromMinutes, tint, weekdayShortTr } from "@/lib/timeBlock";

const HOUR_PX = 56;
const START = 6;
const END = 22;
const HOURS = END - START;

export function WeekGrid({
  week,
  today,
  cursor,
  tasks,
  goals,
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
  onCursor: (d: string) => void;
  onOpen: (task: Task) => void;
  onSlot: (date: string, time: string) => void;
  onMove: (id: string, date: string, time: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: (8 - START) * HOUR_PX });
  }, []);

  function colorOf(task: Task) {
    return goals.find((g) => g.id === task.goalId)?.color ?? "#6B8CFF";
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
        style={{ gridTemplateColumns: `3.25rem repeat(${week.length}, minmax(0,1fr))` }}
      >
        <span />
        {week.map((d) => {
          const active = d === today || d === cursor;
          return (
            <button
              key={d}
              onClick={() => onCursor(d)}
              className={`rounded-2xl px-2 py-2 text-center ${
                d === today
                  ? "bg-white text-black"
                  : active
                    ? "bg-raised"
                    : "text-muted"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wide opacity-70">
                {weekdayShortTr(d)}
              </p>
              <p className="font-display text-lg leading-none">{dayNum(d)}</p>
            </button>
          );
        })}
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative grid"
          style={{
            height: HOURS * HOUR_PX,
            gridTemplateColumns: `3.25rem repeat(${week.length}, minmax(0,1fr))`,
          }}
        >
          <div className="relative">
            {Array.from({ length: HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-2 text-[10px] text-faint"
                style={{ top: i * HOUR_PX - 6 }}
              >
                {String(START + i).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {week.map((d) => {
            const dayTasks = tasks.filter((x) => x.date === d && x.status !== "postponed");
            const timed = dayTasks.filter((x) => x.time);
            return (
              <div
                key={d}
                className="relative border-l border-white/[0.05]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => dropOn(d, e)}
              >
                {Array.from({ length: HOURS }, (_, i) => (
                  <button
                    key={i}
                    className="group absolute left-1 right-1 flex items-center justify-center border border-dashed border-transparent hover:border-white/15"
                    style={{ top: i * HOUR_PX, height: HOUR_PX }}
                    onClick={() => onSlot(d, `${String(START + i).padStart(2, "0")}:00`)}
                    aria-label={t("calendar.addTask")}
                  >
                    <span className="hidden text-lg text-faint group-hover:block">+</span>
                  </button>
                ))}
                {timed.map((task) => {
                  const start = minutesOf(task.time ?? "09:00");
                  const dur = task.estimatedDurationMinutes ?? 30;
                  const top = ((start - START * 60) / 60) * HOUR_PX;
                  const height = Math.max(36, (dur / 60) * HOUR_PX - 4);
                  const color = colorOf(task);
                  if (start < START * 60 || start >= END * 60) return null;
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
                        onOpen(task);
                      }}
                      className="absolute left-1 right-1 overflow-hidden rounded-xl px-2 py-1.5 text-left"
                      style={{
                        top: Math.max(0, top + 2),
                        height,
                        background: tint(color, task.completed ? 0.14 : 0.34),
                        boxShadow: `inset 3px 0 0 ${color}`,
                      }}
                    >
                      <p className={`truncate text-[12px] font-medium ${task.completed ? "text-faint line-through" : ""}`}>
                        {task.title}
                      </p>
                      <p className="text-[10px] text-white/70">
                        {task.time} – {endTime(task.time ?? "09:00", dur)}
                      </p>
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
