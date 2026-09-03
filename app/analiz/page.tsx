"use client";

import { useMemo } from "react";
import { t } from "@/lib/i18n";
import { todayKey } from "@/lib/dates";
import { insightBundle } from "@/lib/plan";
import { consistencyProfile } from "@/lib/bond";
import { scoreFromTasks } from "@/lib/growthEngine";
import { useActiveCreature, useApp, useSession } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { YearHeatmap } from "@/components/home/YearHeatmap";
import type { DailyScore } from "@/lib/types";

const WINDOWS: Record<string, string> = {
  morning: "06:00–12:00",
  noon: "12:00–17:00",
  evening: "17:00–22:00",
  night: "22:00–06:00",
};

export default function AnalyticsPage() {
  const user = useSession();
  const creature = useActiveCreature();
  const tasks = useApp((s) => s.tasks);
  const scores = useApp((s) => s.scores);
  const goals = useApp((s) => s.goals);
  const update = useApp((s) => s.updateSettings);
  const today = user ? todayKey(user.timezone) : "";

  const bundle = useMemo(() => {
    if (!user) return null;
    return insightBundle({
      userId: user.id,
      today,
      timezone: user.timezone,
      tasks,
      scores,
      goals,
    });
  }, [user, today, tasks, scores, goals]);

  const profile = useMemo(() => {
    if (!user) return null;
    return consistencyProfile({
      userId: user.id,
      today,
      scores,
      longestStreak: creature?.longestStreak ?? 0,
    });
  }, [user, today, scores, creature?.longestStreak]);

  const heatScores = useMemo(() => {
    if (!user || !today) return scores;
    const hasToday = scores.some((s) => s.userId === user.id && s.date === today);
    if (hasToday) return scores;
    const todayTasks = tasks.filter(
      (x) => x.userId === user.id && x.date === today && x.status !== "postponed",
    );
    if (todayTasks.length === 0) return scores;
    const live: DailyScore = scoreFromTasks(
      user.id,
      today,
      todayTasks,
      creature?.currentStreak ?? 0,
    );
    return [...scores, live];
  }, [user, today, scores, tasks, creature?.currentStreak]);

  if (!user || !bundle || !profile) return null;
  const delta = bundle.delta >= 0 ? `+${bundle.delta}%` : `${bundle.delta}%`;
  const bestDay = profile.strongest[0]
    ? t(`days.${profile.strongest[0]}`)
    : "—";
  const window = bundle.routine.dominant ? WINDOWS[bundle.routine.dominant] : "—";

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="font-display text-4xl">{t("insights.title")}</h1>
      <Card className="mt-6 p-5">
        <YearHeatmap
          today={today}
          scores={heatScores}
          userId={user.id}
          tasks={tasks}
        />
      </Card>
      <Card className="mt-4 space-y-3 p-5">
        <p>{t("insights.consistency", { n: bundle.consistencyPct, delta })}</p>
        <p>{t("insights.avgTasks", { n: bundle.avgTasks.toFixed(1) })}</p>
        <p>{t("insights.avgDcs", { n: bundle.avgDcs.toFixed(2) })}</p>
        <p>{t("insights.bestDay", { day: bestDay })}</p>
        <p>{t("insights.bestHour", { window })}</p>
        {bundle.strongestGoal ? (
          <p>{t("insights.strong", { goal: bundle.strongestGoal.title })}</p>
        ) : null}
        {bundle.weakestGoal ? (
          <p>{t("insights.weak", { goal: bundle.weakestGoal.title })}</p>
        ) : null}
      </Card>
      {bundle.routine.dominant ? (
        <Card className="mt-4 p-5">
          <p className="text-sm text-muted">
            {t(`routine.${bundle.routine.dominant}`, {
              pct: Math.round(bundle.routine.pct * 100),
            })}
          </p>
          <Button
            className="mt-3"
            tone="ghost"
            onClick={() => update({ preferredWindow: bundle.routine.dominant })}
          >
            {t("routine.apply")}
          </Button>
        </Card>
      ) : null}
    </main>
  );
}
