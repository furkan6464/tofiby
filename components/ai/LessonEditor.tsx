"use client";

import type { ScheduleLesson } from "@/lib/aiTypes";
import { weekdayLabel } from "@/lib/dates";

export function LessonEditor({
  lessons,
  onChange,
}: {
  lessons: ScheduleLesson[];
  onChange: (next: ScheduleLesson[]) => void;
}) {
  function patch(i: number, part: Partial<ScheduleLesson>) {
    onChange(lessons.map((row, j) => (j === i ? { ...row, ...part } : row)));
  }
  return (
    <>
      {lessons.map((row, i) => (
        <div key={`${row.dersAdi}-${i}`} className="grid grid-cols-2 gap-2 text-sm">
          <input
            className="px-2 py-1.5"
            value={row.dersAdi}
            onChange={(e) => patch(i, { dersAdi: e.target.value })}
          />
          <select
            className="px-2 py-1.5"
            value={row.weekday}
            onChange={(e) => {
              const weekday = Number(e.target.value);
              patch(i, { weekday, gun: weekdayLabel(weekday) });
            }}
          >
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <option key={d} value={d}>
                {weekdayLabel(d)}
              </option>
            ))}
          </select>
          <input
            className="px-2 py-1.5"
            type="time"
            value={row.baslangicSaati}
            onChange={(e) => patch(i, { baslangicSaati: e.target.value })}
          />
          <input
            className="px-2 py-1.5"
            type="time"
            value={row.bitisSaati}
            onChange={(e) => patch(i, { bitisSaati: e.target.value })}
          />
        </div>
      ))}
    </>
  );
}
