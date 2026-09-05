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
import { StageProgress } from "./StageProgress";
import { openAiChat, openAiHistory } from "@/lib/ai";
import { AiChatOrb } from "@/components/ai/AiChatOrb";
import { History } from "lucide-react";
import type { SpriteState } from "@/data/creatures/types";

function useCreaturePanel() {
  const user = useSession();
  const creature = useActiveCreature();
  const { score, rest } = useTodayBundle();
  const todayGp = score && !score.finalized ? score.gpEarned : 0;
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

  return { user, creature, greet, tap, spriteState, sleepy, todayGp };
}

/** Soft wander into empty rail space — stroll right, peek, come home. */
function useRailWander(enabled: boolean) {
  const [x, setX] = useState(0);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setX(0);
      setFlip(false);
      return;
    }
    let cancelled = false;
    let timer = 0;

    const loop = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const trip = Math.random();
        if (trip < 0.55) {
          setFlip(false);
          setX(52 + Math.round(Math.random() * 40));
          timer = window.setTimeout(() => {
            if (cancelled) return;
            setFlip(true);
            setX(0);
            timer = window.setTimeout(() => {
              if (cancelled) return;
              setFlip(false);
              loop();
            }, 1500);
          }, 2400 + Math.random() * 2200);
        } else if (trip < 0.8) {
          setFlip(false);
          setX(28);
          timer = window.setTimeout(() => {
            if (cancelled) return;
            setX(0);
            loop();
          }, 1600);
        } else {
          loop();
        }
      }, 7500 + Math.random() * 9000);
    };

    loop();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled]);

  return { x, flip };
}

export function CreatureRail() {
  const { user, creature, greet, tap, spriteState, sleepy, todayGp } = useCreaturePanel();
  const wanderOn = Boolean(creature) && !sleepy && spriteState !== "sick";
  const { x, flip } = useRailWander(wanderOn);

  if (!user || !creature) return null;
  const today = todayKey(user.timezone);
  const progress = liveProgress(creature, todayGp);
  const union = liveUnion(creature, today);
  return (
    <aside className="flex h-full w-[16.5rem] shrink-0 flex-col overflow-y-auto border-l border-white/[0.06] bg-base px-5 py-6">
      <p className="text-[10px] uppercase tracking-wide text-faint">{t("nav.creatureCol")}</p>
      <div className="relative mt-4 h-[8.5rem] w-full overflow-hidden">
        <button
          className="absolute left-0 top-0 text-left transition-transform duration-[1400ms] ease-in-out"
          style={{ transform: `translateX(${x}px)` }}
          onClick={tap}
          aria-label={t("widget.open", { name: friendName(creature.name) })}
        >
          <span
            className="inline-block transition-transform duration-300"
            style={{ transform: flip ? "scaleX(-1)" : "scaleX(1)" }}
          >
            <CreatureView
              speciesId={creature.speciesId}
              stage={creature.stage}
              hueShift={creature.hueShift}
              genetics={creature.genetics}
              pixelSize={4}
              state={spriteState}
            />
          </span>
        </button>
      </div>
      {greet ? <p className="mt-3 text-sm">{t("story.morning")}</p> : null}
      <p className="mt-4 font-display text-2xl">{friendName(creature.name)}</p>
      <p className="text-xs text-muted">
        {creature.stage === "egg" ? t("creature.hiddenSpecies") : speciesLabel(creature.speciesId)} ·{" "}
        {stageLabel(creature.stage)}
        {creature.rareMutation ? ` · ${t("mutation.badge")}` : ""}
      </p>
      <div className="mt-5 space-y-3">
        <StageProgress progress={progress} />
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
      <Link href="/yaratigim" className="mt-auto pt-4 text-sm text-violet">
        {t("home.seeGrowth")}
      </Link>
    </aside>
  );
}

/** Sits left of the right-rail divider so the orb never overlaps page or growth link. */
export function AiRailDock() {
  const { user, creature } = useCreaturePanel();
  if (!user || !creature) return null;
  return (
    <div className="flex h-full w-[4.75rem] shrink-0 flex-col items-center justify-end gap-3 pb-5">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-muted hover:border-pink/50 hover:text-pink"
        aria-label={t("ai.history")}
        onClick={openAiHistory}
      >
        <History size={15} />
      </button>
      <AiChatOrb
        speciesId={creature.speciesId}
        stage={creature.stage}
        hueShift={creature.hueShift}
        genetics={creature.genetics}
        onClick={() => openAiChat()}
      />
    </div>
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
      <AiChatOrb
        size="sm"
        speciesId={creature.speciesId}
        stage={creature.stage}
        hueShift={creature.hueShift}
        genetics={creature.genetics}
        onClick={() => openAiChat()}
      />
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-muted"
        aria-label={t("ai.history")}
        onClick={openAiHistory}
      >
        <History size={15} />
      </button>
    </header>
  );
}

/** @deprecated floating overlay removed in favor of rail/bar layouts */
export function CreatureWidget() {
  return null;
}
