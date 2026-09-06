"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { consistencyProfile, yearWrap } from "@/lib/bond";
import { todayKey } from "@/lib/dates";
import { useApp, useSession, useActiveCreature } from "@/lib/store";
import { CreatureView } from "@/components/creature/CreatureView";
import { FamilyTree } from "@/components/home/FamilyTree";
import { YearWrapCard } from "@/components/home/YearWrapCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const user = useSession();
  const creature = useActiveCreature();
  const creatures = useApp((s) => s.creatures);
  const scores = useApp((s) => s.scores);
  const tasks = useApp((s) => s.tasks);
  const goals = useApp((s) => s.goals);
  const achievements = useApp((s) => s.achievements);
  const [wrap, setWrap] = useState(false);
  const mine = creatures.filter((c) => c.ownerId === user?.id);
  const today = user ? todayKey(user.timezone) : "";
  const eggs = useMemo(
    () => mine.filter((c) => c.eggShellVariant),
    [mine],
  );
  if (!user) return null;
  const activeDays = scores.filter((s) => s.userId === user.id && s.isStreakDay).length;
  const done = tasks.filter((x) => x.userId === user.id && x.completed).length;
  const stats = consistencyProfile({
    userId: user.id,
    today,
    scores,
    longestStreak: creature?.longestStreak ?? 0,
  });
  const unlocked = achievements.filter((a) => a.userId === user.id);
  const lastYear = Number(today.slice(0, 4)) - (today.slice(5, 7) === "01" ? 1 : 0);
  const wrapData = yearWrap({
    userId: user.id,
    year: lastYear,
    scores,
    completedGoalCount: goals.filter((g) => g.userId === user.id && g.status === "archived").length,
  });

  return (
    <main className="safe-pad mx-auto max-w-3xl px-5 py-8">
      <h1 className="hidden font-display text-4xl lg:block">{t("profile.title")}</h1>
      <p className="mt-1 text-muted">@{user.username}</p>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat label={t("profile.activeDays")} value={activeDays} />
        <Stat label={t("profile.tasksDone")} value={done} />
        <Stat label={t("profile.creaturesRaised")} value={mine.length} />
      </div>

      <Card className="mt-8 p-5">
        <h2 className="font-display text-2xl">{t("insights.title")}</h2>
        <p className="mt-2 text-sm text-muted">
          {t("consistency.overall", { n: stats.overallPct })}
        </p>
        <Link href="/analiz" className="mt-3 inline-block text-sm text-violet">
          {t("nav.analytics")}
        </Link>
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-2xl">{t("wrap.title", { year: wrapData.year })}</h2>
        <Button tone="ghost" onClick={() => setWrap(true)}>
          {t("wrap.open")}
        </Button>
      </div>

      <h2 className="mt-10 font-display text-2xl">{t("family.title")}</h2>
      {mine.length === 0 ? (
        <Card className="mt-4 p-8 text-sm text-muted">{t("profile.memoryEmpty")}</Card>
      ) : (
        <Card className="mt-4 p-4">
          <FamilyTree creatures={mine} />
        </Card>
      )}

      <h2 className="mt-10 font-display text-2xl">{t("eggs.title")}</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {eggs.map((c, i) => (
          <Card key={c.id} className="p-3" title={t("eggs.born", { name: c.name })}>
            <CreatureView speciesId={c.speciesId} stage="egg" hueShift={c.hueShift} pixelSize={3} />
            <p className="mt-1 text-center text-[10px] text-faint">
              {t("eggs.item", { n: i + 1 })}
            </p>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl">{t("achieve.title")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ACHIEVEMENTS.filter((a) => !a.hidden || unlocked.some((u) => u.achievementId === a.id)).map(
          (a) => {
            const got = unlocked.find((u) => u.achievementId === a.id);
            return (
              <Card key={a.id} className={`p-4 ${got ? "" : "opacity-60"}`}>
                <p className="font-display text-lg">{t(`achieve.${a.id}.name`)}</p>
                <p className="mt-1 text-xs text-muted">
                  {got || !a.hidden ? t(`achieve.${a.id}.hint`) : t("achieve.hidden")}
                </p>
              </Card>
            );
          },
        )}
      </div>

      {wrap ? (
        <YearWrapCard
          {...wrapData}
          creature={creature}
          onClose={() => setWrap(false)}
        />
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-faint">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </Card>
  );
}
