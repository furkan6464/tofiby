"use client";

import { useMemo, useState } from "react";
import { contributionWeeksSince, shortDate } from "@/lib/dates";
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
  since,
}: {
  today: string;
  scores: DailyScore[];
  userId: string;
  /** Account created date (YYYY-MM-DD). Grid starts here instead of a blank year. */
  since?: string;
}) {
  const start = since && since <= today ? since : today;
  const weeks = useMemo(() => contributionWeeksSince(start, today), [start, today]);
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

  // Short journeys get bigger cells; long ones still fill the card without a scrollbar.
  const cell = weeks.length <= 4 ? 16 : weeks.length <= 12 ? 13 : weeks.length <= 26 ? 11 : 9;

  return (
    <div className="relative w-full">
      <p className="mb-3 text-xs text-faint">{t("home.heatTitleJourney")}</p>
      <div className="flex flex-wrap items-start gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((d) => {
              const score = byDate.get(d);
              const level = heatLevel(score);
              const beforeStart = d < start;
              const future = d > today;
              const hidden = beforeStart || future;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={hidden}
                  onMouseEnter={(e) => {
                    if (hidden) return;
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
                    width: cell,
                    height: cell,
                    borderRadius: 2,
                    background: hidden ? "transparent" : COLORS[level],
                    opacity: hidden ? 0 : 1,
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
