"use client";

import { useMemo, useState } from "react";
import { contributionWeeks, shortDate } from "@/lib/dates";
import { heatLevel } from "@/lib/growthEngine";
import { t } from "@/lib/i18n";
import type { DailyScore } from "@/lib/types";

const COLORS = [
  "var(--heat-0)",
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
  "var(--heat-4)",
];

export function YearHeatmap({
  today,
  scores,
  userId,
}: {
  today: string;
  scores: DailyScore[];
  userId: string;
}) {
  const weeks = useMemo(() => contributionWeeks(today), [today]);
  const byDate = useMemo(() => {
    const m = new Map<string, DailyScore>();
    for (const s of scores) {
      if (s.userId === userId) m.set(s.date, s);
    }
    return m;
  }, [scores, userId]);
  const [tip, setTip] = useState<{
    date: string;
    gp: number;
    pct: number;
    x: number;
    y: number;
  } | null>(null);

  return (
    <div className="relative overflow-x-auto">
      <p className="mb-2 text-xs text-faint">{t("home.heatTitle")}</p>
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((d) => {
              const score = byDate.get(d);
              const level = heatLevel(score);
              const future = d > today;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={future}
                  onMouseEnter={(e) => {
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
                  className="h-[11px] w-[11px] rounded-[2px]"
                  style={{
                    background: future ? "transparent" : COLORS[level],
                    opacity: future ? 0 : 1,
                  }}
                  aria-label={d}
                />
              );
            })}
          </div>
        ))}
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
