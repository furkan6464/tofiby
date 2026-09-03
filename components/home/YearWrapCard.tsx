"use client";

import { useRef } from "react";
import { CreatureView } from "@/components/creature/CreatureView";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";
import { GRID } from "@/data/creatures/types";
import { getCreatureArt } from "@/data/creatures";
import type { Creature } from "@/lib/types";
import { weekdayLabel } from "@/lib/dates";

export function YearWrapCard({
  year,
  activeDays,
  totalGp,
  longestStreak,
  completedGoals,
  busiestWeekday,
  creature,
  onClose,
}: {
  year: number;
  activeDays: number;
  totalGp: number;
  longestStreak: number;
  completedGoals: number;
  busiestWeekday: number | null;
  creature: Creature | null;
  onClose: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);

  async function share() {
    if (!creature) return;
    const art = getCreatureArt(
      creature.speciesId,
      creature.stage === "egg" ? "baby" : creature.stage,
      creature.hueShift,
      creature.genetics,
    );
    const size = 8;
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#07060B";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#F5F3FA";
    ctx.font = "28px Fredoka, sans-serif";
    ctx.fillText(`Tofiby · ${year}`, 32, 48);
    const frame = art.frames.idle[0];
    const ox = 160;
    const oy = 90;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const key = frame[y][x];
        if (!key) continue;
        ctx.fillStyle = art.palette[key];
        ctx.fillRect(ox + x * size, oy + y * size, size, size);
      }
    }
    ctx.fillStyle = "#9992AC";
    ctx.font = "16px Satoshi, sans-serif";
    const lines = [
      t("wrap.active", { n: activeDays }),
      t("wrap.gp", { n: totalGp.toFixed(0) }),
      t("wrap.streak", { n: longestStreak }),
      t("wrap.goals", { n: completedGoals }),
    ];
    lines.forEach((line, i) => ctx.fillText(line, 40, 320 + i * 32));
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `tofiby-${year}.png`;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#07060B]/95 p-6">
      <div ref={card} className="w-full max-w-md text-center">
        <p className="pixel-num text-[10px] text-pink">{t("wrap.kicker")}</p>
        <h2 className="mt-3 font-display text-4xl">{t("wrap.title", { year })}</h2>
        {creature ? (
          <div className="mt-6 flex justify-center">
            <CreatureView
              speciesId={creature.speciesId}
              stage={creature.stage}
              hueShift={creature.hueShift}
              genetics={creature.genetics}
              pixelSize={5}
            />
          </div>
        ) : null}
        <ul className="mt-8 space-y-2 text-muted">
          <li>{t("wrap.active", { n: activeDays })}</li>
          <li>{t("wrap.gp", { n: totalGp.toFixed(1) })}</li>
          <li>{t("wrap.streak", { n: longestStreak })}</li>
          <li>{t("wrap.goals", { n: completedGoals })}</li>
          {busiestWeekday !== null ? (
            <li>{t("wrap.busy", { day: weekdayLabel(busiestWeekday) })}</li>
          ) : null}
        </ul>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={share}>{t("wrap.share")}</Button>
          <Button tone="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
