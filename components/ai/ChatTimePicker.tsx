"use client";

import { useState } from "react";
import { dayMonth } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { weekdayShortTr } from "@/lib/timeBlock";
import { Button } from "@/components/ui/Button";

const HOURS = Array.from({ length: 14 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);

export function ChatTimePicker({
  days,
  today,
  nowMin,
  multi = false,
  onSubmit,
}: {
  days: string[];
  today: string;
  nowMin: number;
  multi?: boolean;
  onSubmit: (dates: string[], time: string) => void;
}) {
  const firstOpen = days.find((d) => d > today) ?? days[0] ?? today;
  const [picked, setPicked] = useState<string[]>(multi ? days.filter((d) => d >= today) : [firstOpen]);
  const firstHour = HOURS.find((h) => {
    const min = Number(h.slice(0, 2)) * 60;
    return !picked.includes(today) || min >= nowMin;
  }) ?? "19:00";
  const [time, setTime] = useState(firstHour);

  function toggle(date: string) {
    if (!multi) {
      setPicked([date]);
      return;
    }
    setPicked((cur) => (cur.includes(date) ? cur.filter((x) => x !== date) : [...cur, date].sort()));
  }

  function disabledHour(h: string) {
    if (!picked.includes(today)) return false;
    return Number(h.slice(0, 2)) * 60 < nowMin;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {days.map((date) => {
          const on = picked.includes(date);
          return (
            <button
              key={date}
              type="button"
              onClick={() => toggle(date)}
              className={`rounded-chip px-2.5 py-1.5 text-xs ${
                on ? "bg-pink text-base" : "bg-raised text-ink"
              }`}
            >
              {weekdayShortTr(date)} {dayMonth(date).replace(/ \d{4}$/, "")}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {HOURS.map((h) => {
          const dead = disabledHour(h);
          return (
            <button
              key={h}
              type="button"
              disabled={dead}
              onClick={() => setTime(h)}
              className={`rounded-chip px-2.5 py-1.5 text-xs disabled:opacity-30 ${
                time === h ? "bg-violet text-base" : "bg-raised text-ink"
              }`}
            >
              {h}
            </button>
          );
        })}
      </div>
      <Button
        type="button"
        className="w-full"
        disabled={picked.length === 0}
        onClick={() => onSubmit(picked, time)}
      >
        {t("ai.useSlot")}
      </Button>
    </div>
  );
}
