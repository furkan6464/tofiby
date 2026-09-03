"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { friendName, t } from "@/lib/i18n";
import { GAME_CONFIG } from "@/lib/gameConfig";
import { hourInZone, isSameMonth, monthGrid, prettyDate, todayKey, weekKeys } from "@/lib/dates";
import {
  liveHealth,
  liveUnion,
  useActiveCreature,
  useApp,
  useSession,
  useTodayBundle,
} from "@/lib/store";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { YearHeatmap } from "@/components/home/YearHeatmap";

export default function HomePage() {
  const user = useSession();
  const { tasks, score, date } = useTodayBundle();
  const creature = useActiveCreature();
  const allGoals = useApp((s) => s.goals);
  const allTasks = useApp((s) => s.tasks);
  const scores = useApp((s) => s.scores);
  const pairs = useApp((s) => s.pairs);
  const goals = useMemo(
    () => allGoals.filter((g) => g.userId === user?.id && g.status === "active"),
    [allGoals, user?.id],
  );
  const addTask = useApp((s) => s.addTask);
  const poke = useApp((s) => s.poke);
  const [quick, setQuick] = useState("");

  const greet = useMemo(() => {
    if (!user) return "";
    const h = hourInZone(user.timezone);
    const key =
      h < 6 ? "home.greetLate" : h < 12 ? "home.greetDawn" : h < 18 ? "home.greetDay" : "home.greetDusk";
    return t(key, { name: user.username });
  }, [user]);

  if (!user || !date) return null;
  const week = weekKeys(date);
  const weekDone = week.filter((d) =>
    scores.some((s) => s.userId === user.id && s.date === d && s.isStreakDay),
  ).length;
  const cells = monthGrid(date);
  const bond = pairs.find(
    (p) => p.status === "bonded" && (p.userA === user.id || p.userB === user.id),
  );
  const health = liveHealth(creature, score?.dcs ?? null);
  const sick = health.health === "sick";
  const fname = friendName(creature?.name);

  return (
    <main className="safe-pad mx-auto max-w-5xl px-5 py-8">
      <p className="text-sm text-faint">{prettyDate(date)}</p>
      <h1 className="mt-1 font-display text-4xl">{greet}</h1>

      {sick ? (
        <Card className="mt-8 border border-pink/30 p-6 shadow-glow">
          <p className="pixel-num text-[10px] text-pink">{t("creature.healthSick")}</p>
          <h2 className="mt-2 font-display text-3xl">{t("sick.title")}</h2>
          <p className="mt-3 text-sm text-muted">{t("sick.body", { name: fname })}</p>
          <p className="mt-2 text-xs text-faint">{t("sick.hint")}</p>
          <div className="mt-5">
            <p className="mb-2 pixel-num text-[10px] text-pink">
              {t("sick.bar", {
                n: health.recoveryStreak,
                max: GAME_CONFIG.SICK_RECOVERY_STREAK_DAYS,
              })}
            </p>
            <Progress value={health.bar} />
          </div>
        </Card>
      ) : null}

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">{t("home.todayTitle")}</h2>
            {score?.isStreakDay ? (
              <span className="pixel-num text-[10px] text-mint">{t("home.streakToast")}</span>
            ) : null}
          </div>
          <div className="mt-4">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted">{t("home.emptyToday")}</p>
            ) : (
              tasks.map((task) => <TaskRow key={task.id} task={task} />)
            )}
          </div>
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
        </Card>

        <div className={`grid gap-4 ${sick ? "pointer-events-none opacity-35" : ""}`}>
          <Card raised className="grid grid-cols-2 gap-4 p-5">
            <Stat label={t("home.streakNow")} value={creature?.currentStreak ?? 0} neon />
            <Stat label={t("home.streakBest")} value={creature?.longestStreak ?? 0} />
            <Stat label={t("home.weekDays")} value={t("home.weekUnit", { n: weekDone })} />
            <Stat
              label={t("home.gpToday")}
              value={(score?.gpEarned ?? 0).toFixed(1)}
            />
          </Card>
          <Card className="p-4">
            <YearHeatmap today={date} scores={scores} userId={user.id} />
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg">{t("home.calendarTitle")}</h3>
              <Link href="/takvim" className="text-xs text-violet">
                {t("nav.calendar")}
              </Link>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d) => {
                const inMonth = isSameMonth(d, date);
                const dots = goals
                  .filter((g) =>
                    allTasks.some((x) => x.goalId === g.id && x.date === d),
                  )
                  .slice(0, 3);
                const done = scores.find((s) => s.userId === user.id && s.date === d);
                return (
                  <div
                    key={d}
                    className={`h-8 rounded-[6px] ${d === todayKey(user.timezone) ? "bg-raised" : ""} ${inMonth ? "" : "opacity-30"}`}
                  >
                    <p className="text-center text-[10px] text-faint">{d.slice(8)}</p>
                    <div className="flex justify-center gap-0.5">
                      {dots.map((g) => (
                        <span
                          key={g.id}
                          className="h-1 w-1 rounded-full"
                          style={{ background: g.color }}
                        />
                      ))}
                    </div>
                    {done?.isStreakDay ? (
                      <div className="mx-auto mt-0.5 h-0.5 w-3 bg-mint/70" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className={`mt-5 grid gap-5 md:grid-cols-2 ${sick ? "opacity-40" : ""}`}>
        <Card className="p-5">
          <h2 className="font-display text-2xl">{t("home.goalsTitle")}</h2>
          <div className="mt-4 space-y-4">
            {goals.length === 0 ? (
              <p className="text-sm text-muted">{t("goals.empty")}</p>
            ) : (
              goals.map((g) => {
                const related = allTasks.filter((x) => x.goalId === g.id && x.date <= date);
                const done = related.filter((x) => x.completed).length;
                const pct = related.length ? Math.round((done / related.length) * 100) : 0;
                return (
                  <div key={g.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{g.title}</span>
                      <span className="text-faint">
                        {t("home.goalsProgress", { done, total: related.length })}
                      </span>
                    </div>
                    <Progress value={pct} tone="violet" />
                  </div>
                );
              })
            )}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-2xl">{t("home.bondTitle")}</h2>
          {bond && creature && (creature.stage === "adult" || creature.stage === "elder") ? (
            <div className="mt-4 space-y-3">
              <p className="pixel-num text-[10px] text-violet">
                {t("community.sync", {
                  n: bond.syncPoints,
                  max: GAME_CONFIG.SYNC_POINTS_MARRIAGE_THRESHOLD,
                })}
              </p>
              <Progress
                value={(bond.syncPoints / GAME_CONFIG.SYNC_POINTS_MARRIAGE_THRESHOLD) * 100}
                tone="violet"
              />
              <Button
                tone="ghost"
                onClick={() => poke(bond.userA === user.id ? bond.userB : bond.userA)}
              >
                {t("community.poke")}
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {creature && (creature.stage === "adult" || creature.stage === "elder")
                ? `${t("creature.union")} · ${Math.round(liveUnion(creature, date))}%`
                : t("home.bondIdle")}
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  neon = false,
}: {
  label: string;
  value: string | number;
  neon?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-faint">{label}</p>
      <p className={`mt-1 ${neon ? "pixel-num text-lg text-pink" : "font-display text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}
