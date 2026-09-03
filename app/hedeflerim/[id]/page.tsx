"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { todayKey } from "@/lib/dates";
import { goalAnalytics } from "@/lib/plan";
import { useApp, useSession } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const user = useSession();
  const goals = useApp((s) => s.goals);
  const milestones = useApp((s) => s.milestones);
  const tasks = useApp((s) => s.tasks);
  const scores = useApp((s) => s.scores);
  const addMilestone = useApp((s) => s.addMilestone);
  const toggleMilestone = useApp((s) => s.toggleMilestone);
  const goal = goals.find((g) => g.id === params.id);
  const stones = useMemo(
    () => milestones.filter((m) => m.goalId === params.id).sort((a, b) => a.orderIndex - b.orderIndex),
    [milestones, params.id],
  );

  if (!user || !goal) return null;
  const today = todayKey(user.timezone);
  const stats = goalAnalytics({ goal, milestones: stones, tasks, scores, today });

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <Link href="/hedeflerim" className="text-sm text-violet">
        {t("nav.goals")}
      </Link>
      <h1 className="mt-3 font-display text-4xl">{goal.title}</h1>
      <p className="mt-2 text-sm text-faint">
        {goal.startDate ?? goal.createdAt}
        {goal.targetDate ? ` → ${goal.targetDate}` : ""}
        {goal.weeklyFrequency ? ` · ${t("onboarding.weeklyFreq")} ${goal.weeklyFrequency}` : ""}
        {goal.dailyDurationMinutes ? ` · ${goal.dailyDurationMinutes} dk` : ""}
      </p>

      <Card className="mt-6 p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span>{t("goals.pct", { n: stats.pct })}</span>
          {stats.remain !== null ? <span className="text-faint">{t("goals.remain", { n: stats.remain })}</span> : null}
        </div>
        <Progress value={stats.pct} tone="violet" />
        <p className="mt-3 text-sm text-muted">
          {t("goals.plannedVs", { planned: stats.plannedDays, worked: stats.workedDays })}
        </p>
        <p className="mt-1 text-sm text-muted">{t("goals.avgDcs", { n: stats.avgDcs.toFixed(2) })}</p>
        <p className="mt-1 text-sm text-muted">{t("goals.minutes", { n: stats.minutes })}</p>
        <p className="mt-1 text-sm text-muted">{t("goals.streak", { n: stats.longest })}</p>
      </Card>

      <Card className="mt-4 p-5">
        <p className="text-sm text-faint">{t("goals.last7")}</p>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {stats.last7.map((d) => (
            <div key={d.date} className="text-center">
              <div
                className="mx-auto h-10 w-full rounded-[6px] bg-raised"
                style={{
                  boxShadow: d.dcs !== null ? `inset 0 -${Math.round((d.dcs ?? 0) * 40)}px 0 #5EC4B0` : undefined,
                }}
              />
              <p className="mt-1 text-[10px] text-faint">{d.date.slice(8)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="font-display text-2xl">{t("onboarding.milestones")}</h2>
        <div className="mt-4 space-y-2">
          {stones.map((m) => (
            <label key={m.id} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={Boolean(m.completedAt)}
                onChange={() => toggleMilestone(m.id)}
              />
              <span className={m.completedAt ? "text-faint line-through" : ""}>{m.title}</span>
            </label>
          ))}
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const input = form.elements.namedItem("stone") as HTMLInputElement;
            if (!input.value.trim()) return;
            addMilestone(goal.id, input.value);
            input.value = "";
          }}
        >
          <Field name="stone" label={t("onboarding.milestoneAdd")} />
          <Button className="self-end" type="submit">
            {t("common.add")}
          </Button>
        </form>
      </Card>
    </main>
  );
}
