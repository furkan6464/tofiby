"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { GOAL_COLORS } from "@/lib/goalColors";
import { assignHiddenEggSpecies } from "@/lib/genetics";
import { playSfx, unlockSfx } from "@/lib/onboardSfx";
import { useApp } from "@/lib/store";
import type { CreatureGender, FrequencyPattern, SpeciesId } from "@/lib/types";
import type { SpriteState } from "@/data/creatures/types";
import { Button } from "@/components/ui/Button";
import { CreatureView } from "@/components/creature/CreatureView";
import { AppPreview, type PreviewKind } from "@/components/onboarding/AppPreview";
import { OnboardMascot, type MascotMove } from "@/components/onboarding/OnboardMascot";
import { SpeechBubble } from "@/components/onboarding/SpeechBubble";

type Hidden = { speciesId: SpeciesId; hueShift: number };
type Step =
  | "welcome"
  | "gender"
  | "name"
  | "egg"
  | "today"
  | "calendar"
  | "goals"
  | "analiz"
  | "ai"
  | "goal"
  | "goalJoy"
  | "freq"
  | "mins"
  | "bye";

const FLOW: Step[] = [
  "welcome",
  "gender",
  "name",
  "egg",
  "today",
  "calendar",
  "goals",
  "analiz",
  "ai",
  "goal",
  "goalJoy",
  "freq",
  "mins",
  "bye",
];

const TOUR: Partial<Record<Step, PreviewKind>> = {
  today: "today",
  calendar: "calendar",
  goals: "goals",
  analiz: "analiz",
  ai: "ai",
};

const FREQS = [1, 2, 3, 4, 5, 6, 7];
const MINS = [15, 30, 45, 60, 90];

function patternFromDays(n: number): FrequencyPattern {
  if (n >= 7) return { kind: "daily" };
  if (n === 5) return { kind: "weekdays" };
  return { kind: "times_per_week", timesPerWeek: n };
}

export default function OnboardingPage() {
  const router = useRouter();
  const finish = useApp((s) => s.completeOnboarding);
  const sessionId = useApp((s) => s.sessionUserId);
  const [step, setStep] = useState<Step>("welcome");
  const [gender, setGender] = useState<CreatureGender | null>(null);
  const [name, setName] = useState("");
  const [hidden, setHidden] = useState<Hidden | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [weekly, setWeekly] = useState(5);
  const [mins, setMins] = useState(30);
  const [leaving, setLeaving] = useState(false);
  const own = hidden?.speciesId ?? "tofiby";
  const ownHue = hidden?.hueShift ?? 330;
  const tour = TOUR[step];

  function go(next: Step) {
    unlockSfx();
    playSfx(next === "goalJoy" ? "chime" : "pop");
    setStep(next);
  }

  function back() {
    const i = FLOW.indexOf(step);
    if (i > 0) {
      playSfx("soft");
      setStep(FLOW[i - 1]);
    }
  }

  function afterName() {
    if (!gender) return;
    const gene = assignHiddenEggSpecies(sessionId ?? "anon", new Date().toISOString(), gender);
    setHidden(gene);
    go("egg");
  }

  function closeOut() {
    if (leaving) return;
    setLeaving(true);
    playSfx("chime");
    window.setTimeout(() => {
      finish({
        creatureName: name,
        speciesId: hidden?.speciesId,
        hueShift: hidden?.hueShift,
        gender: gender ?? undefined,
        goals: goalTitle.trim()
          ? [
              {
                title: goalTitle.trim(),
                taskTitle: goalTitle.trim(),
                note: "",
                startDate: null,
                targetDate: null,
                weeklyFrequency: weekly,
                dailyDurationMinutes: mins,
                frequency: patternFromDays(weekly),
                color: GOAL_COLORS[0],
              },
            ]
          : [],
      });
      router.push("/anasayfa");
    }, 720);
  }

  function mascot(move: MascotMove, sprite: SpriteState = "idle", silhouette = false, pixel = tour ? 5 : 9) {
    return (
      <OnboardMascot move={move} silhouette={silhouette} leaving={step === "bye" && leaving}>
        <CreatureView speciesId={own} stage="egg" hueShift={ownHue} pixelSize={pixel} state={sprite} />
      </OnboardMascot>
    );
  }

  const bubble = {
    welcome: t("onboarding.welcomeBubble"),
    gender: t("onboarding.genderBubble"),
    name: t("onboarding.nameBubble"),
    egg: t("onboarding.eggBubble"),
    today: t("onboarding.todayBubble"),
    calendar: t("onboarding.calendarBubble"),
    goals: t("onboarding.goalsTourBubble"),
    analiz: t("onboarding.analizBubble"),
    ai: t("onboarding.aiBubble"),
    goal: t("onboarding.goalBubble"),
    goalJoy: t("onboarding.goalJoy"),
    freq: t("onboarding.freqBubble"),
    mins: t("onboarding.minsBubble"),
    bye: t("onboarding.byeBubble"),
  }[step];

  const move: MascotMove =
    step === "welcome" || step === "egg"
      ? "wobble"
      : step === "goalJoy" || step === "bye" || step === "name"
        ? "hop"
        : step === "ai"
          ? "talk"
          : "peek";
  const sprite: SpriteState =
    step === "goalJoy" ? "happy" : step === "egg" ? "sleepy" : step === "welcome" ? "sparkle" : "look";

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center overflow-hidden px-5 py-7">
      <AnimatePresence mode="wait">
        <Scene key={step} id={step} bubble={bubble} compact={Boolean(tour)} mascot={mascot(move, sprite, step === "welcome" || step === "gender" || step === "name")} preview={tour ? <AppPreview kind={tour} /> : null} footer={footer()}>
          {step === "gender" ? (
            <div className="mt-2 grid w-full grid-cols-2 gap-3">
              {(
                [
                  ["kiz", "onboarding.genderGirl", "text-pink"],
                  ["erkek", "onboarding.genderBoy", "text-violet"],
                ] as const
              ).map(([value, label, tone]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setGender(value);
                    playSfx("click");
                  }}
                  className={`min-h-[7rem] rounded-panel border px-4 py-5 text-left ${
                    gender === value ? "border-white/40 bg-raised" : "border-white/[0.06] bg-surface"
                  }`}
                >
                  <p className={`font-display text-2xl ${tone}`}>{t(label)}</p>
                </button>
              ))}
            </div>
          ) : null}
          {step === "name" ? (
            <input
              className="mt-2 w-full px-3 py-2.5 text-center"
              placeholder={t("onboarding.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          ) : null}
          {step === "goal" ? (
            <input
              className="mt-2 w-full px-3 py-2.5 text-center"
              placeholder={t("onboarding.goalPlaceholder")}
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              autoFocus
            />
          ) : null}
          {step === "freq" ? (
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {FREQS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setWeekly(n);
                    playSfx("click");
                  }}
                  className={`h-11 w-11 rounded-chip text-sm ${weekly === n ? "bg-pink text-base" : "bg-raised text-ink"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : null}
          {step === "mins" ? (
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {MINS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setMins(n);
                    playSfx("click");
                  }}
                  className={`rounded-chip px-3 py-2 text-sm ${mins === n ? "bg-pink text-base" : "bg-raised text-ink"}`}
                >
                  {n} {t("onboarding.minsUnit")}
                </button>
              ))}
            </div>
          ) : null}
        </Scene>
      </AnimatePresence>
    </main>
  );

  function footer() {
    if (step === "welcome") {
      return <Button onClick={() => go("gender")}>{t("onboarding.sayHi")}</Button>;
    }
    if (step === "bye") {
      return (
        <div className="flex w-full gap-3">
          <Button tone="ghost" onClick={back} disabled={leaving}>
            {t("common.back")}
          </Button>
          <Button className="flex-1" onClick={closeOut} disabled={leaving}>
            {t("onboarding.openHome")}
          </Button>
        </div>
      );
    }
    const i = FLOW.indexOf(step);
    const next = FLOW[i + 1];
    const blocked =
      (step === "gender" && !gender) ||
      (step === "name" && !name.trim()) ||
      (step === "goal" && !goalTitle.trim());
    return (
      <Nav
        onBack={back}
        onNext={() => (step === "name" ? afterName() : go(next))}
        nextDisabled={blocked}
        nextLabel={step === "goal" ? t("onboarding.putGoal") : undefined}
      />
    );
  }
}

function Scene({
  id,
  bubble,
  mascot,
  preview,
  compact,
  children,
  footer,
}: {
  id: string;
  bubble: string;
  mascot: ReactNode;
  preview?: ReactNode;
  compact?: boolean;
  children?: ReactNode;
  footer: ReactNode;
}) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, x: 36 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -28 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[min(88dvh,46rem)] flex-col"
    >
      <div className={`flex flex-1 flex-col items-center ${compact ? "justify-start gap-3 pt-1" : "justify-center gap-4"} text-center`}>
        {compact ? (
          <div className="flex w-full items-start gap-2 text-left">
            <div className="shrink-0 pt-1">{mascot}</div>
            <SpeechBubble text={bubble} side="left" />
          </div>
        ) : (
          <>
            <SpeechBubble text={bubble} />
            {mascot}
          </>
        )}
        {preview}
        {children}
      </div>
      <div className="mt-5">{footer}</div>
    </motion.div>
  );
}

function Nav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex w-full gap-3">
      <Button tone="ghost" onClick={onBack}>
        {t("common.back")}
      </Button>
      <Button className="flex-1" onClick={onNext} disabled={nextDisabled}>
        {nextLabel ?? t("onboarding.together")}
      </Button>
    </div>
  );
}
