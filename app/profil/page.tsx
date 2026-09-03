"use client";

import { t } from "@/lib/i18n";
import { useApp, useSession, speciesLabel, stageLabel } from "@/lib/store";
import { CreatureView } from "@/components/creature/CreatureView";
import { Card } from "@/components/ui/Card";

export default function ProfilePage() {
  const user = useSession();
  const creatures = useApp((s) => s.creatures);
  const scores = useApp((s) => s.scores);
  const tasks = useApp((s) => s.tasks);
  const users = useApp((s) => s.users);
  if (!user) return null;
  const retired = creatures.filter((c) => c.ownerId === user.id && c.status === "retired");
  const activeDays = scores.filter((s) => s.userId === user.id && s.isStreakDay).length;
  const done = tasks.filter((x) => x.userId === user.id && x.completed).length;
  const raised = creatures.filter((c) => c.ownerId === user.id).length;

  return (
    <main className="safe-pad mx-auto max-w-3xl px-5 py-8">
      <h1 className="font-display text-4xl">{t("profile.title")}</h1>
      <p className="mt-1 text-muted">@{user.username}</p>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat label={t("profile.activeDays")} value={activeDays} />
        <Stat label={t("profile.tasksDone")} value={done} />
        <Stat label={t("profile.creaturesRaised")} value={raised} />
      </div>

      <h2 className="mt-10 font-display text-2xl">{t("profile.memory")}</h2>
      {retired.length === 0 ? (
        <Card className="mt-4 p-8 text-sm text-muted">{t("profile.memoryEmpty")}</Card>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {retired.map((c) => {
            const partner = users.find((u) => u.id === c.spouseOwnerId);
            return (
              <Card key={c.id} className="p-4">
                <CreatureView
                  speciesId={c.speciesId}
                  stage={c.stage}
                  hueShift={c.hueShift}
                  pixelSize={5}
                />
                <p className="mt-2 font-display text-xl">{c.name}</p>
                <p className="text-xs text-muted">
                  {speciesLabel(c.speciesId)} · {stageLabel(c.stage)}
                </p>
                <p className="mt-2 text-xs text-faint">
                  {t("profile.marriedTo", {
                    partner: partner?.username ?? c.spouseCreatureName ?? "—",
                    date: c.marriedAt?.slice(0, 10) ?? "",
                  })}
                </p>
              </Card>
            );
          })}
        </div>
      )}
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
