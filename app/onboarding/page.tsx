"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, tList } from "@/lib/i18n";
import { GOAL_COLORS } from "@/lib/goalColors";
import { speciesHue } from "@/data/species/catalog";
import { assignHiddenEggSpecies } from "@/lib/genetics";
import { useApp } from "@/lib/store";
import type { FrequencyPattern, SpeciesId } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { CreatureView } from "@/components/creature/CreatureView";
import type { CreatureStage } from "@/lib/gameConfig";

type Draft = {
  title: string;
  taskTitle: string;
  note: string;
  startDate: string;
  targetDate: string;
  weeklyFrequency: string;
  dailyDurationMinutes: string;
  frequency: FrequencyPattern;
  color: string;
};

const emptyGoal = (color: string): Draft => ({
  title: "",
  taskTitle: "",
  note: "",
  startDate: "",
  targetDate: "",
  weeklyFrequency: "5",
  dailyDurationMinutes: "30",
  frequency: { kind: "daily" },
  color,
});

type Hidden = { speciesId: SpeciesId; hueShift: number };

/** Onboarding slaytlarında yeni karakterleri tanıt — kullanıcının gizli türü yumurtada kalır. */
const SHOWCASE: Partial<Record<CreatureStage, SpeciesId>> = {
  baby: "tofiby",
  child: "bulut",
  teen: "yildiz",
  adult: "gizem",
};

export default function OnboardingPage() {
  const router = useRouter();
  const finish = useApp((s) => s.completeOnboarding);
  const sessionId = useApp((s) => s.sessionUserId);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [hidden, setHidden] = useState<Hidden | null>(null);
  const [goals, setGoals] = useState<Draft[]>([emptyGoal(GOAL_COLORS[0])]);
  const weekdays = tList("onboarding.weekdays");
  const friend = name.trim() || t("friend.genericTiny");

  function goNameNext() {
    const gene = assignHiddenEggSpecies(sessionId ?? "anon", new Date().toISOString());
    setHidden(gene);
    setStep(2);
  }

  const slides: { stage: CreatureStage; title: string; body: string }[] = [
    {
      stage: "egg",
      title: t("onboarding.slide1Title", { name: friend }),
      body: t("onboarding.slide1Body"),
    },
    {
      stage: "baby",
      title: t("onboarding.slide2Title"),
      body: t("onboarding.slide2Body"),
    },
    {
      stage: "child",
      title: t("onboarding.slide3Title"),
      body: t("onboarding.slide3Body"),
    },
    {
      stage: "teen",
      title: t("onboarding.slide4Title"),
      body: t("onboarding.slide4Body"),
    },
    {
      stage: "adult",
      title: t("onboarding.slide5Title"),
      body: t("onboarding.slide5Body"),
    },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-5 py-10">
      {step === 0 ? (
        <div className="max-w-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-faint">{t("brand.name")}</p>
          <h1 className="mt-4 font-display text-5xl">{t("onboarding.welcomeTitle")}</h1>
          <p className="mt-4 text-lg text-muted">{t("onboarding.welcomeBody")}</p>
          <Button className="mt-10" onClick={() => setStep(1)}>
            {t("common.continue")}
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="max-w-lg">
          <h1 className="font-display text-4xl">{t("onboarding.nameTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("onboarding.nameHint")}</p>
          <div className="mt-8">
            <Field
              label={t("common.name")}
              placeholder={t("onboarding.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="mt-8 flex gap-3">
            <Button tone="ghost" onClick={() => setStep(0)}>
              {t("common.back")}
            </Button>
            <Button onClick={goNameNext} disabled={!name.trim()}>
              {t("common.continue")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-[var(--bg-base)] px-5 text-center">
          <CreatureView
            speciesId={hidden?.speciesId ?? "tofiby"}
            stage="egg"
            hueShift={hidden?.hueShift ?? 330}
            pixelSize={11}
          />
          <h1 className="mt-8 font-display text-5xl">
            {t("onboarding.eggReveal", { name: friend })}
          </h1>
          <p className="mt-3 text-muted">{t("onboarding.eggRevealHint")}</p>
          <div className="mt-10 flex gap-3">
            <Button tone="ghost" onClick={() => setStep(1)}>
              {t("common.back")}
            </Button>
            <Button onClick={() => setStep(3)}>{t("common.continue")}</Button>
          </div>
        </div>
      ) : null}

      {step >= 3 && step <= 7 ? (
        <Slide
          stage={slides[step - 3].stage}
          title={slides[step - 3].title}
          body={slides[step - 3].body}
          speciesId={
            SHOWCASE[slides[step - 3].stage] ?? hidden?.speciesId ?? "tofiby"
          }
          hueShift={
            SHOWCASE[slides[step - 3].stage]
              ? speciesHue(SHOWCASE[slides[step - 3].stage]!)
              : (hidden?.hueShift ?? 330)
          }
          warn={step === 7}
          onBack={() => setStep(step - 1)}
          onNext={() => setStep(step + 1)}
        />
      ) : null}

      {step === 8 ? (
        <div className="space-y-6">
          <h1 className="font-display text-3xl">{t("onboarding.goalTitle")}</h1>
          <p className="text-sm text-muted">{t("onboarding.goalHint")}</p>
          {goals.map((g, i) => (
            <div key={i} className="space-y-3 rounded-panel bg-surface p-4">
              <Field
                label={t("onboarding.goalTitle")}
                placeholder={t("onboarding.goalPlaceholder")}
                value={g.title}
                onChange={(e) => patch(i, { title: e.target.value })}
              />
              <Field
                label={t("onboarding.taskTitle")}
                placeholder={t("onboarding.taskPlaceholder")}
                value={g.taskTitle}
                onChange={(e) => patch(i, { taskTitle: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={t("onboarding.startDate")}
                  type="date"
                  value={g.startDate}
                  onChange={(e) => patch(i, { startDate: e.target.value })}
                />
                <Field
                  label={t("onboarding.goalDate")}
                  type="date"
                  value={g.targetDate}
                  onChange={(e) => patch(i, { targetDate: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={t("onboarding.weeklyFreq")}
                  type="number"
                  min={1}
                  max={7}
                  value={g.weeklyFrequency}
                  onChange={(e) => patch(i, { weeklyFrequency: e.target.value })}
                />
                <Field
                  label={t("onboarding.dailyMins")}
                  type="number"
                  min={5}
                  value={g.dailyDurationMinutes}
                  onChange={(e) => patch(i, { dailyDurationMinutes: e.target.value })}
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted">{t("onboarding.frequency")}</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["daily", "onboarding.freqDaily"],
                      ["weekdays", "onboarding.freqWeekdays"],
                      ["times_per_week", "onboarding.freqTimes"],
                      ["custom", "onboarding.freqCustom"],
                    ] as const
                  ).map(([kind, key]) => (
                    <button
                      key={kind}
                      onClick={() => patch(i, { frequency: { kind } })}
                      className={`rounded-chip px-3 py-1.5 text-xs ${g.frequency.kind === kind ? "bg-raised text-ink" : "text-faint"}`}
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
              {g.frequency.kind === "times_per_week" ? (
                <Field
                  label={t("onboarding.timesLabel")}
                  type="number"
                  min={1}
                  max={7}
                  value={g.frequency.timesPerWeek ?? 3}
                  onChange={(e) =>
                    patch(i, {
                      frequency: {
                        kind: "times_per_week",
                        timesPerWeek: Number(e.target.value),
                      },
                    })
                  }
                />
              ) : null}
              {g.frequency.kind === "custom" ? (
                <div className="flex flex-wrap gap-1">
                  {weekdays.map((label, d) => {
                    const wd = d === 6 ? 0 : d + 1;
                    const on = g.frequency.weekdays?.includes(wd);
                    return (
                      <button
                        key={label}
                        onClick={() => {
                          const cur = new Set(g.frequency.weekdays ?? []);
                          if (cur.has(wd)) cur.delete(wd);
                          else cur.add(wd);
                          patch(i, { frequency: { kind: "custom", weekdays: Array.from(cur) } });
                        }}
                        className={`rounded-[6px] px-2 py-1 text-xs ${on ? "bg-violet text-base" : "bg-raised text-muted"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex gap-2">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => patch(i, { color: c })}
                    className="h-5 w-5 rounded-[4px]"
                    style={{
                      background: c,
                      outline: g.color === c ? "2px solid white" : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          <button
            className="text-sm text-violet"
            onClick={() =>
              setGoals([...goals, emptyGoal(GOAL_COLORS[goals.length % GOAL_COLORS.length])])
            }
          >
            {t("onboarding.addGoal")}
          </button>
          <div className="flex gap-3">
            <Button tone="ghost" onClick={() => setStep(7)}>
              {t("common.back")}
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                finish({
                  creatureName: name,
                  speciesId: hidden?.speciesId,
                  hueShift: hidden?.hueShift,
                  goals: goals.map((g) => ({
                    ...g,
                    startDate: g.startDate || null,
                    targetDate: g.targetDate || null,
                    weeklyFrequency: g.weeklyFrequency ? Number(g.weeklyFrequency) : null,
                    dailyDurationMinutes: g.dailyDurationMinutes
                      ? Number(g.dailyDurationMinutes)
                      : 30,
                  })),
                });
                router.push("/anasayfa");
              }}
            >
              {t("onboarding.finish")}
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );

  function patch(i: number, partial: Partial<Draft>) {
    setGoals(goals.map((g, idx) => (idx === i ? { ...g, ...partial } : g)));
  }
}

function Slide({
  stage,
  title,
  body,
  speciesId,
  hueShift,
  warn,
  onBack,
  onNext,
}: {
  stage: CreatureStage;
  title: string;
  body: string;
  speciesId: SpeciesId;
  hueShift: number;
  warn?: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex min-h-[86vh] flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:flex-row">
        <CreatureView
          speciesId={speciesId}
          stage={stage}
          hueShift={hueShift}
          pixelSize={10}
          state={stage === "baby" ? "sparkle" : "idle"}
        />
        {warn ? (
          <CreatureView
            speciesId={speciesId}
            stage="elder"
            hueShift={hueShift}
            pixelSize={10}
            state="sick"
          />
        ) : null}
      </div>
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-3 text-muted">{body}</p>
      <div className="mt-8 flex gap-3">
        <Button tone="ghost" onClick={onBack}>
          {t("common.back")}
        </Button>
        <Button onClick={onNext}>{t("common.continue")}</Button>
      </div>
    </div>
  );
}
