"use client";

import { useMemo, useState } from "react";
import { contributionWeeks, shortDate } from "@/lib/dates";
import { dayHeatEffort, heatColor, heatIntensity } from "@/lib/growthEngine";
import { t } from "@/lib/i18n";
import type { DailyScore, Task } from "@/lib/types";

export function YearHeatmap({
  today,
  scores,
  userId,
  tasks = [],
}: {
  today: string;
  scores: DailyScore[];
  userId: string;
  /** When provided, completed task weight sharpens the pink intensity scale. */
  tasks?: Task[];
}) {
  const weeks = useMemo(() => contributionWeeks(today, 53), [today]);
  const byDate = useMemo(() => {
    const m = new Map<string, DailyScore>();
    for (const s of scores) {
      if (s.userId === userId) m.set(s.date, s);
    }
    return m;
  }, [scores, userId]);

  const peers = useMemo(
    () => scores.filter((s) => s.userId === userId && s.date <= today),
    [scores, userId, today],
  );

  const workByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const task of tasks) {
      if (task.userId !== userId || task.status === "postponed") continue;
      if (!(task.completed || task.status === "done")) continue;
      m.set(task.date, (m.get(task.date) ?? 0) + task.weight);
    }
    return m;
  }, [tasks, userId]);

  const peerEfforts = useMemo(
    () =>
      peers.map((s) => {
        const w = workByDate.get(s.date);
        if (w !== undefined && w > 0) return w;
        return dayHeatEffort(s);
      }),
    [peers, workByDate],
  );

  const [tip, setTip] = useState<{
    date: string;
    gp: number;
    pct: number;
    x: number;
    y: number;
  } | null>(null);

  return (
    <div className="relative w-full">
      <p className="mb-3 text-xs text-faint">{t("home.heatTitle")}</p>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((d) => {
                const score = byDate.get(d);
                const future = d > today;
                const work = workByDate.get(d);
                const intensity = future
                  ? 0
                  : heatIntensity(
                      score,
                      peerEfforts,
                      work && work > 0 ? work : undefined,
                    );
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={future}
                    onMouseEnter={(e) => {
                      if (future) return;
                      const r = (e.target as HTMLElement).getBoundingClientRect();
                      setTip({
                        date: d,
                        gp: score?.gpEarned ?? 0,
                        pct: Math.round((score?.dcs ?? 0) * 100),
                        x: r.left,
                        y: r.top,
                      });
                    }}
                    onMouseLeave={() => setTip(null)}
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 2,
                      background: heatColor(intensity),
                      opacity: 1,
                    }}
                    aria-label={d}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {tip ? (
        <div
          className="pointer-events-none fixed z-[80] rounded-chip border border-white/10 bg-raised px-2 py-1.5 text-[11px] text-ink shadow-glow"
          style={{ left: tip.x, top: tip.y - 40 }}
        >
          {t("heat.tooltip", {
            date: shortDate(tip.date),
            gp: tip.gp.toFixed(1),
            pct: tip.pct,
          })}
        </div>
      ) : null}
    </div>
  );
}
