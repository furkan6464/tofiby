"use client";

import { t } from "@/lib/i18n";
import { liveProgress, stageLabel } from "@/lib/store";
import { Progress } from "@/components/ui/Progress";

export function StageProgress({
  progress,
  size = "sm",
}: {
  progress: ReturnType<typeof liveProgress>;
  size?: "sm" | "md";
}) {
  const pct = Math.round(progress.ratio * 100);
  return (
    <div>
      <div
        className={`mb-1 flex justify-between ${
          size === "sm" ? "text-[10px] text-faint" : "text-sm text-muted"
        }`}
      >
        <span>{stageLabel(progress.current)}</span>
        <span>
          {progress.next
            ? `${stageLabel(progress.next)} · %${pct}`
            : t("stage.elder")}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
