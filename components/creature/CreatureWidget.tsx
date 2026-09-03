"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/dates";
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
import { isRestWeekday, shouldSleep } from "@/lib/bond";
import { friendName, t } from "@/lib/i18n";
import { Progress } from "../ui/Progress";
import { CreatureView } from "./CreatureView";
import type { SpriteState } from "@/data/creatures/types";

function useCreaturePanel() {
  const user = useSession();
  const creature = useActiveCreature();
  const { score, rest } = useTodayBundle();
  const dcs = score?.dcs ?? null;
  const anim = useApp((s) => s.widgetAnim);
  const setAnim = useApp((s) => s.setWidgetAnim);
  const woke = useApp((s) => s.sessionWoke);
  const markWoke = useApp((s) => s.markWoke);
  const scores = useApp((s) => s.scores);
  const [greet, setGreet] = useState(false);

  useEffect(() => {
    if (!user || !creature) return;
    const last =
      [...scores]
        .filter((s) => s.userId === user.id && s.isStreakDay)
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null;
    const sleep = shouldSleep({
      timezone: user.timezone,
      restDay: rest ?? isRestWeekday(todayKey(user.timezone), user.restDayOfWeek),
      sick: creature.health === "sick",
      lastActiveDate: last,
      today: todayKey(user.timezone),
    });
    if (sleep && !woke && anim === "idle") setAnim("sleepy");
  }, [user, creature, rest, scores, woke, anim, setAnim]);

  useEffect(() => {
    if (anim === "bounce" || anim === "happy" || anim === "yawn") {
      const tmr = setTimeout(() => setAnim("idle"), 900);
      return () => clearTimeout(tmr);
    }
  }, [anim, setAnim]);

  const sleepy = Boolean(creature) && anim === "sleepy" && !woke;
  const liveSick = Boolean(
    creature &&
      (creature.health === "sick" ||
        (!rest && liveHealth(creature, dcs).health === "sick")),
  );

  function tap() {
    if (sleepy) {
      setAnim("yawn");
      setGreet(true);
      markWoke();
      setTimeout(() => setGreet(false), 2400);
    }
  }

  const spriteState: SpriteState = liveSick
    ? "sick"
    : sleepy
      ? "sleepy"
      : anim === "worried"
        ? "worried"
        : anim === "yawn"
          ? "yawn"
          : anim;

  return { user, creature, greet, tap, spriteState, sleepy };
}

export function CreatureRail() {
  const { user, creature, greet, tap, spriteState } = useCreaturePanel();
  if (!user || !creature) return null;
  const today = todayKey(user.timezone);
  const progress = liveProgress(creature);
  const union = liveUnion(creature, today);
  return (
    <aside className="flex h-dvh w-[16.5rem] shrink-0 flex-col border-l border-white/[0.06] bg-base px-5 py-6">
      <p className="text-[10px] uppercase tracking-wide text-faint">{t("nav.creatureCol")}</p>
      <button className="mt-4 text-left" onClick={tap} aria-label={t("widget.open", { name: friendName(creature.name) })}>
        <CreatureView
          speciesId={creature.speciesId}
          stage={creature.stage}
          hueShift={creature.hueShift}
          genetics={creature.genetics}
          pixelSize={4}
          state={spriteState}
        />
      </button>
      {greet ? <p className="mt-3 text-sm">{t("story.morning")}</p> : null}
      <p className="mt-4 font-display text-2xl">{friendName(creature.name)}</p>
      <p className="text-xs text-muted">
        {creature.stage === "egg" ? t("creature.hiddenSpecies") : speciesLabel(creature.speciesId)} ·{" "}
        {stageLabel(creature.stage)}
        {creature.rareMutation ? ` · ${t("mutation.badge")}` : ""}
      </p>
      <div className="mt-5 space-y-3">
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
      <Link href="/yaratigim" className="mt-auto text-sm text-violet">
        {t("home.seeGrowth")}
      </Link>
    </aside>
  );
}

export function CreatureBar() {
  const { user, creature, greet, tap, spriteState } = useCreaturePanel();
  if (!user || !creature) return null;
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-base/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <button
        onClick={tap}
        aria-label={t("widget.open", { name: friendName(creature.name) })}
        className="shrink-0"
      >
        <CreatureView
          speciesId={creature.speciesId}
          stage={creature.stage}
          hueShift={creature.hueShift}
          genetics={creature.genetics}
          pixelSize={2}
          state={spriteState}
        />
      </button>
      <Link href="/yaratigim" className="min-w-0 flex-1">
        <p className="truncate text-sm">{friendName(creature.name)}</p>
        <p className="pixel-num text-[9px] text-pink">
          {t("widget.streak", { n: creature.currentStreak })}
        </p>
      </Link>
      {greet ? <p className="text-xs text-muted">{t("story.morning")}</p> : null}
    </header>
  );
}

/** @deprecated floating overlay removed in favor of rail/bar layouts */
export function CreatureWidget() {
  return null;
}
