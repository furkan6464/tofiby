"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { GAME_CONFIG } from "@/lib/gameConfig";
import { hourInZone, todayKey } from "@/lib/dates";
import {
  liveHealth,
  liveProgress,
  liveUnion,
  speciesLabel,
  stageLabel,
  useActiveCreature,
  useApp,
  useSession,
  useTodayBundle,
} from "@/lib/store";
import { friendName, t } from "@/lib/i18n";
import { Progress } from "../ui/Progress";
import { CreatureView } from "./CreatureView";

export function CreatureWidget() {
  const user = useSession();
  const creature = useActiveCreature();
  const { score } = useTodayBundle();
  const dcs = score?.dcs ?? null;
  const anim = useApp((s) => s.widgetAnim);
  const setAnim = useApp((s) => s.setWidgetAnim);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const late = hourInZone(user.timezone) >= GAME_CONFIG.SLEEPY_HOUR;
    const idleDay = dcs === null || dcs === 0;
    if (late && idleDay && anim === "idle") setAnim("sleepy");
  }, [user, dcs, anim, setAnim]);

  useEffect(() => {
    if (anim === "bounce" || anim === "happy") {
      const tmr = setTimeout(() => setAnim("idle"), 900);
      return () => clearTimeout(tmr);
    }
  }, [anim, setAnim]);

  if (!user || !creature) return null;
  const today = todayKey(user.timezone);
  const progress = liveProgress(creature);
  const union = liveUnion(creature, today);
  const sleepy = anim === "sleepy";
  const liveSick = liveHealth(creature, dcs).health === "sick";

  return (
    <div
      className="creature-widget fixed z-[60]"
      style={
        {
          "--drag-x": `${pos.x}px`,
          "--drag-y": `${pos.y}px`,
        } as CSSProperties
      }
    >
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 w-56 rounded-nest border border-white/[0.06] bg-surface p-3"
        >
          <p className="font-display text-lg">{friendName(creature.name)}</p>
          <p className="text-xs text-muted">
            {creature.stage === "egg"
              ? t("creature.hiddenSpecies")
              : speciesLabel(creature.speciesId)}{" "}
            · {stageLabel(creature.stage)}
          </p>
          <div className="mt-3 space-y-2">
            <div>
              <div className="mb-1 flex justify-between text-[10px] text-faint">
                <span>{t("widget.gpBar")}</span>
                <span>{Math.round(progress.ratio * 100)}%</span>
              </div>
              <Progress value={progress.ratio * 100} />
            </div>
            <p className="pixel-num text-[10px] text-pink">
              {t("widget.streak", { n: creature.currentStreak })}
            </p>
            {creature.stage === "adult" || creature.stage === "elder" ? (
              <div>
                <div className="mb-1 text-[10px] text-faint">
                  {t("widget.union", { n: Math.round(union) })}
                </div>
                <Progress value={union} tone="violet" />
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
      <button
        aria-label={t("widget.open", { name: friendName(creature.name) })}
        onClick={() => setOpen((v) => !v)}
        onPointerDown={(e) => {
          drag.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPos({
            x: drag.current.x + (e.clientX - drag.current.px),
            y: drag.current.y + (e.clientY - drag.current.py),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        className="rounded-nest border border-white/[0.06] bg-surface/90 p-2 backdrop-blur-sm"
      >
        <CreatureView
          speciesId={creature.speciesId}
          stage={creature.stage}
          hueShift={creature.hueShift}
          pixelSize={5}
          state={
            creature.health === "sick" || liveSick
              ? "sick"
              : sleepy
                ? "sleepy"
                : anim
          }
        />
      </button>
    </div>
  );
}
