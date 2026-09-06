"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { friendName, pickDaily, t } from "@/lib/i18n";
import { prettyDate, weekdayOf, weekKeys } from "@/lib/dates";
import {
  liveHealth,
  useActiveCreature,
  useApp,
  useSession,
  useTodayBundle,
} from "@/lib/store";
import {
  goalCardProgress,
  isActiveGoal,
  overloadedWeekdays,
  remainingToStreak,
  weeklyReview,
} from "@/lib/plan";
import { TaskRow } from "@/components/tasks/TaskRow";
import { openFocus } from "@/components/focus/FocusSession";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const user = useSession();
  const { tasks, score, date, rest } = useTodayBundle();
  const creature = useActiveCreature();
  const allGoals = useApp((s) => s.goals) ?? [];
  const milestones = useApp((s) => s.milestones) ?? [];
  const allTasks = useApp((s) => s.tasks) ?? [];
  const scores = useApp((s) => s.scores) ?? [];
  const addTask = useApp((s) => s.addTask);
  const update = useApp((s) => s.updateSettings);
  const [quick, setQuick] = useState("");

  const goals = useMemo(
    () => allGoals.filter((g) => g.userId === user?.id && isActiveGoal(g)),
    [allGoals, user?.id],
  );
  const activeToday = useMemo(
    () => tasks.filter((x) => x.status !== "postponed"),
    [tasks],
  );
  const timed = useMemo(
    () =>
      [...activeToday].sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99")),
    [activeToday],
  );
  const coach = remainingToStreak(activeToday);
  const pct = coach.planned ? Math.round((coach.done / coach.planned) * 100) : 0;
  const over = user
    ? overloadedWeekdays(
        allTasks.filter((x) => x.userId === user.id),
        date ?? "",
      )
    : [];
  const todayWd = date ? weekdayOf(date) : -1;
  const hint = over.find((x) => x.weekday === todayWd);
  const cap = user?.softDayCaps?.[String(todayWd)];

  const week = date ? weekKeys(date) : [];
  const sunday = date ? weekdayOf(date) === 0 : false;
  const weekId = week[0] ?? "";
  const showReview = Boolean(user && sunday && user.weeklyReviewSeen !== weekId);
  const review = user
    ? weeklyReview({ userId: user.id, week, tasks: allTasks, scores, goals })
    : null;

  if (!user || !date) return null;
  const health = liveHealth(creature, score?.dcs ?? null);
  const sick = health.health === "sick";
  const fname = friendName(creature?.name);
  const tipKind = coach.planned === 0 ? "empty" : coach.met ? "met" : "need";

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <p className="text-sm text-faint">{t("home.todayKicker", { date: prettyDate(date) })}</p>
      {rest ? <p className="mt-2 text-sm text-mint">{t("rest.today")}</p> : null}

      {sick ? (
        <Card className="mt-6 border border-pink/30 p-6 shadow-glow">
          <p className="pixel-num text-[10px] text-pink">{t("creature.healthSick")}</p>
          <h2 className="mt-2 font-display text-3xl">{t("sick.title")}</h2>
          <p className="mt-3 text-sm text-muted">{t("sick.body", { name: fname })}</p>
        </Card>
      ) : null}

      {showReview && review ? (
        <Card className="mt-6 p-5">
          <p className="pixel-num text-[10px] text-violet">{t("review.title")}</p>
          <p className="mt-2 text-sm">
            {t("review.line", {
              done: review.done,
              total: review.total,
              dcs: Math.round(review.avgDcs * 100),
              days: review.activeDays,
              gp: Math.round(review.gp),
            })}
          </p>
          {review.bestDay ? (
            <p className="mt-1 text-sm text-muted">
              {t("review.best", { day: prettyDate(review.bestDay) })}
            </p>
          ) : null}
          {review.topGoal ? (
            <p className="mt-1 text-sm text-muted">{t("review.top", { goal: review.topGoal })}</p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Link href="/takvim?view=week">
              <Button>{t("review.plan")}</Button>
            </Link>
            <Button tone="ghost" onClick={() => update({ weeklyReviewSeen: weekId })}>
              {t("review.dismiss")}
            </Button>
          </div>
        </Card>
      ) : null}

      {hint && cap === undefined ? (
        <Card className="mt-6 p-5">
          <p className="text-sm">
            {t("insights.soft", {
              day: t(`days.${["sun", "mon", "tue", "wed", "thu", "fri", "sat"][hint.weekday]}`),
              planned: hint.planned,
              suggested: hint.suggested,
            })}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() =>
                update({
                  softDayCaps: { ...user.softDayCaps, [String(hint.weekday)]: hint.suggested },
                })
              }
            >
              {t("insights.softYes")}
            </Button>
            <Button
              tone="ghost"
              onClick={() =>
                update({
                  softDayCaps: { ...user.softDayCaps, [String(hint.weekday)]: 0 },
                })
              }
            >
              {t("insights.softNo")}
            </Button>
          </div>
        </Card>
      ) : null}

      <section className="mt-8">
        <h1 className="font-display text-3xl">{t("home.todayTitle")}</h1>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-faint">
            <span>{t("home.todayBar")}</span>
            <span>
              %{pct} · {t("home.todayCount", { done: coach.done, total: coach.planned })}
            </span>
          </div>
          <Progress value={pct} />
        </div>
        <p className="mt-2 text-sm text-muted">
          {coach.planned === 0
            ? t("home.coachEmpty")
            : coach.met
              ? t("home.todayCueMet")
              : t("home.coach", {
                  planned: coach.planned,
                  done: coach.done,
                  need: coach.remaining,
                })}
        </p>
        <div className="mt-4">
          {timed.length === 0 ? (
            <p className="text-sm text-muted">{t("home.emptyToday")}</p>
          ) : (
            timed.map((task) => (
              <TaskRow key={task.id} task={task} showTime postpone onFocus={openFocus} />
            ))
          )}
        </div>
        {cap && cap > 0 && activeToday.length >= cap ? (
          <p className="mt-2 text-xs text-faint">
            {t("insights.soft", {
              day: t(`days.${["sun", "mon", "tue", "wed", "thu", "fri", "sat"][todayWd]}`),
              planned: activeToday.length,
              suggested: cap,
            })}
          </p>
        ) : null}
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!quick.trim()) return;
            addTask({ date, title: quick });
            setQuick("");
          }}
        >
          <input
            className="flex-1 px-3 py-2"
            placeholder={t("home.quickAdd")}
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
          />
          <Button type="submit">{t("common.add")}</Button>
        </form>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl">{t("home.longGoals")}</h2>
          <Link href="/hedeflerim" className="text-sm text-violet">
            {t("goals.open")}
          </Link>
        </div>
        <div className="mt-4 space-y-4">
          {goals.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm text-muted">{t("goals.empty")}</p>
              <Link href="/hedeflerim" className="mt-3 inline-block">
                <Button>{t("goals.new")}</Button>
              </Link>
            </Card>
          ) : (
            goals.map((g) => {
              const card = goalCardProgress({
                goal: g,
                milestones,
                tasks: allTasks,
                today: date,
              });
              return (
                <Link key={g.id} href={`/hedeflerim/${g.id}`} className="block">
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{g.title}</span>
                    <span className="text-faint">{t("goals.pct", { n: card.pct })}</span>
                  </div>
                  <Progress value={card.pct} tone="violet" />
                  {card.nextTitle ? (
                    <p className="mt-1.5 text-xs text-faint">
                      {t("goals.nextStone", { title: card.nextTitle, n: card.nextLeft })}
                    </p>
                  ) : null}
                </Link>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">{t("home.todayNote")}</h2>
        <Card className="mt-4 p-5">
          <p className="text-sm text-muted">
            {pickDaily(`home.tips.${tipKind}`, [user.id, date])}
          </p>
        </Card>
      </section>
    </main>
  );
}
