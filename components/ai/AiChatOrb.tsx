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
    <button
      type="button"
      onClick={onClick}
      aria-label={t("ai.orb")}
      className={`ai-orb pressable relative shrink-0 overflow-hidden rounded-full ${
        md ? "h-[5.5rem] w-[5.5rem]" : "h-11 w-11"
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
      <span
        className={`absolute z-[2] rounded-full bg-pink font-display leading-none text-base ${
          md ? "bottom-1 right-1 px-1.5 py-0.5 text-[9px]" : "bottom-0 right-0 px-1 text-[7px]"
        }`}
      >
        AI
      </span>
    </button>
  );
}
