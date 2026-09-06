"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { GOAL_COLORS } from "@/lib/goalColors";
import { speciesHue } from "@/data/species/catalog";
import { assignHiddenEggSpecies } from "@/lib/genetics";
import { useApp } from "@/lib/store";
import type { CreatureGender, FrequencyPattern, SpeciesId } from "@/lib/types";
import type { CreatureStage } from "@/lib/gameConfig";
import type { SpriteState } from "@/data/creatures/types";
import { Button } from "@/components/ui/Button";
import { CreatureView } from "@/components/creature/CreatureView";
import { AiChatOrb } from "@/components/ai/AiChatOrb";
import { OnboardMascot, type MascotMove } from "@/components/onboarding/OnboardMascot";
import { SpeechBubble } from "@/components/onboarding/SpeechBubble";

type Hidden = { speciesId: SpeciesId; hueShift: number };
type Step =
  | "welcome"
  | "gender"
  | "name"
  | "egg"
  | "mechEgg"
  | "mechBaby"
  | "mechChild"
  | "mechTeen"
  | "mechAdult"
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
  "mechEgg",
  "mechBaby",
  "mechChild",
  "mechTeen",
  "mechAdult",
  "ai",
  "goal",
  "goalJoy",
  "freq",
  "mins",
  "bye",
];

const SHOWCASE: Partial<Record<CreatureStage, SpeciesId>> = {
  baby: "tofiby",
  child: "ruji",
  teen: "yildiz",
  adult: "kalyoz",
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

  function go(next: Step) {
    setStep(next);
  }

  function back() {
    const i = FLOW.indexOf(step);
    if (i > 0) setStep(FLOW[i - 1]);
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

  function mascot(
    stage: CreatureStage,
    opts: {
      move: MascotMove;
      sprite?: SpriteState;
      silhouette?: boolean;
      speciesId?: SpeciesId;
      hueShift?: number;
      pixel?: number;
    },
  ) {
    const speciesId = opts.speciesId ?? own;
    return (
      <OnboardMascot move={opts.move} silhouette={opts.silhouette} leaving={step === "bye" && leaving}>
        <CreatureView
          speciesId={speciesId}
          stage={stage}
          hueShift={opts.hueShift ?? (SHOWCASE[stage] ? speciesHue(SHOWCASE[stage]!) : ownHue)}
          pixelSize={opts.pixel ?? 10}
          state={opts.sprite ?? "idle"}
        />
      </OnboardMascot>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center overflow-hidden px-5 py-8">
      <AnimatePresence mode="wait">
        {step === "welcome" ? (
          <Scene
            key="welcome"
            id="welcome"
            bubble={t("onboarding.welcomeBubble")}
            mascot={mascot("egg", { move: "idle", sprite: "sparkle", silhouette: true, speciesId: "tofiby", hueShift: 330 })}
            footer={<Button onClick={() => go("gender")}>{t("onboarding.sayHi")}</Button>}
          />
        ) : null}

        {step === "gender" ? (
          <Scene
            key="gender"
            id="gender"
            bubble={t("onboarding.genderBubble")}
            mascot={mascot("egg", { move: "peek", sprite: "look", silhouette: true, speciesId: "tofiby", hueShift: 330 })}
            footer={
              <Nav onBack={back} onNext={() => go("name")} nextDisabled={!gender} />
            }
          >
            <div className="mt-2 grid w-full grid-cols-2 gap-3">
              {(
                [
                  ["kiz", "onboarding.genderGirl", "text-pink"],
                  ["erkek", "onboarding.genderBoy", "text-violet"],
                ] as const
              ).map(([value, label, tone]) => {
                const selected = gender === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    className={`min-h-[7.5rem] rounded-panel border px-4 py-5 text-left transition ${
                      selected ? "border-white/40 bg-raised" : "border-white/[0.06] bg-surface"
                    }`}
                  >
                    <p className={`font-display text-2xl ${tone}`}>{t(label)}</p>
                  </button>
                );
              })}
            </div>
          </Scene>
        ) : null}

        {step === "name" ? (
          <Scene
            key="name"
            id="name"
            bubble={t("onboarding.nameBubble")}
            mascot={mascot("egg", { move: "hop", sprite: "bounce", silhouette: true, speciesId: "tofiby", hueShift: 330 })}
            footer={<Nav onBack={back} onNext={afterName} nextDisabled={!name.trim() || !gender} />}
          >
            <input
              className="mt-2 w-full px-3 py-2.5 text-center"
              placeholder={t("onboarding.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Scene>
        ) : null}

        {step === "egg" ? (
          <Scene
            key="egg"
            id="egg"
            bubble={t("onboarding.eggBubble")}
            mascot={mascot("egg", { move: "wobble", sprite: "sleepy" })}
            footer={<Nav onBack={back} onNext={() => go("mechEgg")} />}
          />
        ) : null}

        {step === "mechEgg" ? (
          <Scene
            key="mechEgg"
            id="mechEgg"
            bubble={t("onboarding.slide1Bubble")}
            mascot={mascot("egg", { move: "shake", sprite: "bounce" })}
            footer={<Nav onBack={back} onNext={() => go("mechBaby")} />}
          />
        ) : null}

        {step === "mechBaby" ? (
          <Scene
            key="mechBaby"
            id="mechBaby"
            bubble={t("onboarding.slide2Bubble")}
            mascot={mascot("baby", { move: "glow", sprite: "sparkle", speciesId: SHOWCASE.baby, hueShift: speciesHue("tofiby") })}
            footer={<Nav onBack={back} onNext={() => go("mechChild")} />}
          />
        ) : null}

        {step === "mechChild" ? (
          <Scene
            key="mechChild"
            id="mechChild"
            bubble={t("onboarding.slide3Bubble")}
            mascot={mascot("child", { move: "peek", sprite: "look", speciesId: SHOWCASE.child, hueShift: speciesHue("ruji") })}
            footer={<Nav onBack={back} onNext={() => go("mechTeen")} />}
          />
        ) : null}

        {step === "mechTeen" ? (
          <Scene
            key="mechTeen"
            id="mechTeen"
            bubble={t("onboarding.slide4Bubble")}
            mascot={mascot("teen", { move: "hop", sprite: "bounce", speciesId: SHOWCASE.teen, hueShift: speciesHue("yildiz") })}
            footer={<Nav onBack={back} onNext={() => go("mechAdult")} />}
          />
        ) : null}

        {step === "mechAdult" ? (
          <Scene
            key="mechAdult"
            id="mechAdult"
            bubble={t("onboarding.slide5Bubble")}
            mascot={
              <div className="flex items-end gap-3">
                {mascot("adult", { move: "shake", sprite: "worried", speciesId: SHOWCASE.adult, hueShift: speciesHue("kalyoz"), pixel: 9 })}
                <OnboardMascot move="shake">
                  <CreatureView
                    speciesId="kalyoz"
                    stage="elder"
                    hueShift={speciesHue("kalyoz")}
                    pixelSize={9}
                    state="sick"
                  />
                </OnboardMascot>
              </div>
            }
            footer={<Nav onBack={back} onNext={() => go("ai")} />}
          />
        ) : null}

        {step === "ai" ? (
          <Scene
            key="ai"
            id="ai"
            bubble={t("onboarding.aiBubble")}
            mascot={mascot("egg", { move: "talk", sprite: "look" })}
            extra={
              <div className="ai-orb-spotlight rounded-full">
                <AiChatOrb
                  speciesId={own}
                  stage="egg"
                  hueShift={ownHue}
                  onClick={() => undefined}
                />
              </div>
            }
            footer={<Nav onBack={back} onNext={() => go("goal")} />}
          />
        ) : null}

        {step === "goal" ? (
          <Scene
            key="goal"
            id="goal"
            bubble={t("onboarding.goalBubble")}
            mascot={mascot("egg", { move: "peek", sprite: "look" })}
            footer={
              <Nav
                onBack={back}
                onNext={() => go("goalJoy")}
                nextDisabled={!goalTitle.trim()}
                nextLabel={t("onboarding.putGoal")}
              />
            }
          >
            <input
              className="mt-2 w-full px-3 py-2.5 text-center"
              placeholder={t("onboarding.goalPlaceholder")}
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              autoFocus
            />
          </Scene>
        ) : null}

        {step === "goalJoy" ? (
          <Scene
            key="goalJoy"
            id="goalJoy"
            bubble={t("onboarding.goalJoy")}
            mascot={mascot("egg", { move: "hop", sprite: "happy" })}
            footer={<Nav onBack={() => go("goal")} onNext={() => go("freq")} nextLabel={t("onboarding.together")} />}
          />
        ) : null}

        {step === "freq" ? (
          <Scene
            key="freq"
            id="freq"
            bubble={t("onboarding.freqBubble")}
            mascot={mascot("egg", { move: "peek", sprite: "look" })}
            footer={<Nav onBack={back} onNext={() => go("mins")} />}
          >
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {FREQS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWeekly(n)}
                  className={`h-11 w-11 rounded-chip text-sm ${
                    weekly === n ? "bg-pink text-base" : "bg-raised text-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Scene>
        ) : null}

        {step === "mins" ? (
          <Scene
            key="mins"
            id="mins"
            bubble={t("onboarding.minsBubble")}
            mascot={mascot("egg", { move: "hop", sprite: "bounce" })}
            footer={<Nav onBack={back} onNext={() => go("bye")} />}
          >
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {MINS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMins(n)}
                  className={`rounded-chip px-3 py-2 text-sm ${
                    mins === n ? "bg-pink text-base" : "bg-raised text-ink"
                  }`}
                >
                  {n} {t("onboarding.minsUnit")}
                </button>
              ))}
            </div>
          </Scene>
        ) : null}

        {step === "bye" ? (
          <Scene
            key="bye"
            id="bye"
            bubble={t("onboarding.byeBubble")}
            mascot={mascot("egg", { move: "hop", sprite: "bounce" })}
            footer={
              <div className="flex w-full gap-3">
                <Button tone="ghost" onClick={back} disabled={leaving}>
                  {t("common.back")}
                </Button>
                <Button className="flex-1" onClick={closeOut} disabled={leaving}>
                  {t("onboarding.openHome")}
                </Button>
              </div>
            }
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function Scene({
  id,
  bubble,
  mascot,
  extra,
  children,
  footer,
}: {
  id: string;
  bubble: string;
  mascot: ReactNode;
  extra?: ReactNode;
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
      className="flex min-h-[min(88dvh,44rem)] flex-col"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <SpeechBubble text={bubble} />
        {mascot}
        {extra}
        {children}
      </div>
      <div className="mt-6">{footer}</div>
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
