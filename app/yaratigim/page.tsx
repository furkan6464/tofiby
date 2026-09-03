"use client";

import { friendName, t } from "@/lib/i18n";
import { STAGE_ORDER } from "@/lib/gameConfig";
import { prettyDate, todayKey } from "@/lib/dates";
import {
  liveHealth,
  liveProgress,
  liveUnion,
  speciesLabel,
  stageLabel,
  useActiveCreature,
  useSession,
  useTodayBundle,
} from "@/lib/store";
import { CreatureView } from "@/components/creature/CreatureView";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";

export default function CreaturePage() {
  const user = useSession();
  const creature = useActiveCreature();
  const { score } = useTodayBundle();
  if (!user || !creature) return null;
  const today = todayKey(user.timezone);
  const progress = liveProgress(creature);
  const union = liveUnion(creature, today);
  const sick = liveHealth(creature, score?.dcs ?? null).health === "sick";

  return (
    <main className="safe-pad mx-auto max-w-3xl px-5 py-8">
      <h1 className="font-display text-4xl">{friendName(creature.name)}</h1>
      <Card className="mt-6 overflow-hidden p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <CreatureView
            speciesId={creature.speciesId}
            stage={creature.stage}
            hueShift={creature.hueShift}
            pixelSize={8}
            state={sick ? "sick" : "idle"}
          />
          <div className="flex-1">
            <p className="font-display text-4xl">{creature.name}</p>
            <p className="mt-1 text-muted">
              {creature.stage === "egg"
                ? t("creature.hiddenSpecies")
                : speciesLabel(creature.speciesId)}{" "}
              · {stageLabel(creature.stage)}
            </p>
            <p className="mt-4 text-xs text-faint">
              {t("creature.aliveSince", { date: prettyDate(creature.createdAt) })}
            </p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric label={t("creature.gp")} value={creature.totalGp.toFixed(1)} />
          <Metric label={t("home.streakNow")} value={creature.currentStreak} pixel />
          <Metric label={t("home.streakBest")} value={creature.longestStreak} />
        </div>
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm text-muted">
            <span>{t("widget.gpBar")}</span>
            <span>
              {progress.next
                ? `${stageLabel(progress.next)} · ${progress.need.toFixed(0)}`
                : t("stage.elder")}
            </span>
          </div>
          <Progress value={progress.ratio * 100} />
        </div>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="font-display text-2xl">{t("creature.union")}</h2>
        <p className="mt-2 text-sm text-muted">{t("creature.unionHint")}</p>
        {creature.stage === "adult" || creature.stage === "elder" ? (
          <div className="mt-4">
            <Progress value={union} tone="violet" />
            <p className="mt-2 pixel-num text-[10px] text-violet">{Math.round(union)}%</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-faint">{t("creature.unionLocked")}</p>
        )}
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="font-display text-2xl">{t("creature.timeline")}</h2>
        <ol className="mt-5 space-y-3">
          {STAGE_ORDER.map((stage) => {
            const reached = STAGE_ORDER.indexOf(creature.stage) >= STAGE_ORDER.indexOf(stage);
            return (
              <li key={stage} className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${reached ? "bg-pink" : "bg-white/10"}`} />
                <span className={reached ? "" : "text-faint"}>{stageLabel(stage)}</span>
                <span className="text-xs text-faint">
                  {reached ? t("creature.reached", { stage: stageLabel(stage), date: "—" }) : t("creature.notYet")}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>
    </main>
  );
}

function Metric({
  label,
  value,
  pixel = false,
}: {
  label: string;
  value: string | number;
  pixel?: boolean;
}) {
  return (
    <div className="rounded-chip bg-raised p-3">
      <p className="text-xs text-faint">{label}</p>
      <p className={`mt-1 ${pixel ? "pixel-num text-pink" : "font-display text-2xl"}`}>{value}</p>
    </div>
  );
}
