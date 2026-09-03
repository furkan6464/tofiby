"use client";

import { getCreatureArt } from "@/data/creatures";
import type { SpriteState } from "@/data/creatures/types";
import type { CreatureStage } from "@/lib/gameConfig";
import type { SpeciesId } from "@/lib/types";
import { PixelSprite } from "./PixelSprite";
import { HappyBits } from "./HappyBits";

export function CreatureView({
  speciesId,
  stage,
  hueShift,
  pixelSize = 7,
  state = "idle",
  className = "",
}: {
  speciesId: SpeciesId;
  stage: CreatureStage;
  hueShift: number;
  pixelSize?: number;
  state?: SpriteState;
  className?: string;
}) {
  const art = getCreatureArt(speciesId, stage, hueShift);
  return (
    <div className={`relative inline-block ${className}`}>
      <PixelSprite
        frames={art.frames}
        palette={art.palette}
        pixelSize={pixelSize}
        state={state}
      />
      <HappyBits show={state === "happy"} />
    </div>
  );
}
