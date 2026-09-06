"use client";

import { useMemo, useState } from "react";
import { dayMonth } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { collectBusy, findFreeSlots } from "@/lib/plan";
import { minutesOf, weekdayShortTr } from "@/lib/timeBlock";
import { useApp, useSession } from "@/lib/store";
import { Button } from "@/components/ui/Button";

const HOURS = Array.from({ length: 14 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);

function overlapsBusy(start: string, minutes: number, busy: { startMin: number; endMin: number }[]) {
  const a = minutesOf(start);
  const b = a + minutes;
  return busy.some((slot) => a < slot.endMin && b > slot.startMin);
}

export function StudySessionPicker({
  days,
  today,
  nowMin,
  step,
  date,
  minutes,
  takenDates,
  preferStartMin,
  onPickDay,
  onBack,
  onSubmit,
}: {
  days: string[];
  today: string;
  nowMin: number;
  step: "day" | "time";
  date?: string;
  minutes: number;
  takenDates: string[];
  preferStartMin?: number | null;
  onPickDay: (date: string) => void;
  onBack: () => void;
  onSubmit: (time: string) => void;
}) {
  const user = useSession();
  const tasks = useApp((s) => s.tasks);
  const busySlots = useApp((s) => s.busySlots);
  const selected = date ?? "";
  const busy = user
    ? collectBusy(tasks, busySlots, user.id, selected).map((b) => ({
        startMin: b.startMin,
        endMin: b.endMin,
      }))
    : [];
  const free = selected
    ? findFreeSlots(user ? collectBusy(tasks, busySlots, user.id, selected) : [])
    : [];
  const openHours = HOURS.filter((h) => {
    if (selected === today && minutesOf(h) < nowMin) return false;
    if (overlapsBusy(h, minutes, busy)) return false;
    return free.some((slot) => minutesOf(h) >= slot.startMin && minutesOf(h) + minutes <= slot.endMin);
  });
  const preferred =
    preferStartMin != null
      ? `${String(Math.floor(preferStartMin / 60)).padStart(2, "0")}:${String(preferStartMin % 60)
          .padStart(2, "0")}`
      : "";
  const firstOpen = (preferred && openHours.includes(preferred) ? preferred : openHours[0]) ?? "";
  const [time, setTime] = useState(firstOpen);
  const picked = useMemo(() => (openHours.includes(time) ? time : firstOpen), [openHours, time, firstOpen]);

  return (
    <div className="space-y-3">
      {step === "day" ? (
        <>
          <p className="text-sm">{t("ai.sessionPickDay")}</p>
          <div className="flex flex-wrap gap-1.5">
            {days.map((d) => {
              const used = takenDates.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onPickDay(d)}
                  className={`rounded-chip px-2.5 py-1.5 text-xs ${
                    used ? "bg-raised text-faint" : "bg-raised text-ink hover:bg-pink hover:text-base"
                  }`}
                >
                  {weekdayShortTr(d)} {dayMonth(d).replace(/ \d{4}$/, "")}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <button type="button" className="text-xs text-faint hover:text-pink" onClick={onBack}>
            ← {weekdayShortTr(selected)} {dayMonth(selected).replace(/ \d{4}$/, "")}
          </button>
          <p className="text-sm">{t("ai.sessionPickTime")}</p>
          <div className="flex flex-wrap gap-1.5">
            {HOURS.map((h) => {
              const dead = !openHours.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  disabled={dead}
                  onClick={() => setTime(h)}
                  className={`rounded-chip px-2.5 py-1.5 text-xs disabled:opacity-30 ${
                    picked === h ? "bg-violet text-base" : "bg-raised text-ink"
                  }`}
                >
                  {h}
                </button>
              );
            })}
          </div>
          {openHours.length === 0 ? <p className="text-xs text-faint">{t("ai.sessionNoTime")}</p> : null}
          <Button type="button" className="w-full" disabled={!picked} onClick={() => onSubmit(picked)}>
            {t("ai.sessionAdd")}
          </Button>
        </>
      )}
    </div>
  );
}
