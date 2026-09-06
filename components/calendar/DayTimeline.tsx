"use client";

import { t } from "@/lib/i18n";
import type { Task } from "@/lib/types";
import { overlapColumns } from "@/lib/overlap";
import { minutesOf } from "@/lib/timeBlock";

const HOUR_PX = 56;

export function DayTimeline({
  date,
  tasks,
  onOpen,
  onMove,
}: {
  date: string;
  tasks: Task[];
  onOpen: (task: Task) => void;
  onMove: (id: string, date: string, time: string) => void;
}) {
  const timed = tasks.filter((x) => x.time && x.status !== "postponed");
  const loose = tasks.filter((x) => !x.time && x.status !== "postponed");
  const layout = overlapColumns(
    timed.map((task) => {
      const start = minutesOf(task.time ?? "00:00");
      return {
        id: task.id,
        start,
        end: start + Math.max(15, task.estimatedDurationMinutes ?? 30),
      };
    }),
  );

  function timeFromY(y: number) {
    const mins = Math.max(0, Math.min(23 * 60 + 45, Math.round(y / HOUR_PX * 60 / 15) * 15));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return (
    <div>
      {loose.length > 0 ? (
        <div className="mb-4">
          <p className="text-xs text-faint">{t("calendar.unscheduled")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {loose.map((task) => (
              <button
                key={task.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/task-id", task.id)}
                onClick={() => onOpen(task)}
                className="rounded-chip bg-raised px-2 py-1 text-xs"
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div
        className="relative overflow-hidden rounded-nest border border-white/[0.06]"
        style={{ height: 24 * HOUR_PX }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/task-id");
          if (!id) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          onMove(id, date, timeFromY(e.clientY - rect.top));
        }}
      >
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-white/[0.04] px-2 text-[10px] text-faint"
            style={{ top: h * HOUR_PX, height: HOUR_PX }}
          >
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
        {timed.map((task) => {
          const start = minutesOf(task.time ?? "00:00");
          const dur = Math.max(15, task.estimatedDurationMinutes ?? 30);
          const top = (start / 60) * HOUR_PX;
          const height = Math.max(28, (dur / 60) * HOUR_PX);
          const slot = layout.get(task.id) ?? { col: 0, cols: 1 };
          const gutter = 64;
          return (
            <button
              key={task.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/task-id", task.id);
                e.stopPropagation();
              }}
              onClick={() => onOpen(task)}
              className={`absolute overflow-hidden rounded-[6px] px-2 py-1 text-left text-xs ${
                task.completed ? "bg-mint/15 text-faint line-through" : "bg-raised"
              }`}
              style={{
                top,
                height,
                left: `calc(${gutter}px + ((100% - ${gutter}px) * ${slot.col / slot.cols}) + 4px)`,
                width: `calc((100% - ${gutter}px) / ${slot.cols} - 8px)`,
              }}
            >
              <span className="pixel-num text-[9px] text-faint">{task.time}</span> {task.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
