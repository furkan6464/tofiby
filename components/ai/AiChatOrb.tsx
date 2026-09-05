"use client";

import { t } from "@/lib/i18n";
import type { Genetics, SpeciesId } from "@/lib/types";
import type { CreatureStage } from "@/lib/gameConfig";
import { CreatureView } from "@/components/creature/CreatureView";

export function AiChatOrb({
  speciesId,
  stage,
  hueShift,
  genetics,
  onClick,
  size = "md",
}: {
  speciesId: SpeciesId;
  stage: CreatureStage;
  hueShift: number;
  genetics?: Genetics | null;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  const md = size === "md";
  return (
    <span className={`flex items-center gap-1 ${md ? "flex-col" : ""}`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={t("ai.orb")}
        className={`ai-orb pressable relative shrink-0 overflow-hidden rounded-full ${
          md ? "h-[4.25rem] w-[4.25rem]" : "h-10 w-10"
        }`}
      >
        <span className="absolute inset-[3px] rounded-full bg-surface" />
        <span className="relative z-[1] flex h-full w-full items-center justify-center">
          <span className="ai-orb-wiggle">
            <CreatureView
              speciesId={speciesId}
              stage={stage}
              hueShift={hueShift}
              genetics={genetics}
              pixelSize={md ? 2 : 1}
              state="happy"
            />
          </span>
        </span>
      </button>
      <span className={`font-display leading-none text-pink ${md ? "text-[10px]" : "text-[8px]"}`}>
        AI
      </span>
    </span>
  );
}
