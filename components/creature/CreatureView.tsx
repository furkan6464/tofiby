"use client";

import { getCreatureArt } from "@/data/creatures";
import type { SpriteState } from "@/data/creatures/types";
import type { CreatureStage } from "@/lib/gameConfig";
import type { Genetics, SpeciesId } from "@/lib/types";
import { PixelSprite } from "./PixelSprite";
import { HappyBits } from "./HappyBits";

export function CreatureView({
  speciesId,
  stage,
  hueShift,
  pixelSize = 4,
  state = "idle",
  className = "",
  genetics,
}: {
  speciesId: SpeciesId;
  stage: CreatureStage;
  hueShift: number;
  pixelSize?: number;
  state?: SpriteState;
  className?: string;
  genetics?: Genetics | null;
}) {
  const art = getCreatureArt(speciesId, stage, hueShift, genetics);
  return (
    <div className={`relative inline-block ${className}`}>
      <PixelSprite
        frames={art.frames}
        palette={art.palette}
        pixelSize={pixelSize}
        state={state}
        microAnim={genetics?.microAnim}
      />
      <HappyBits show={state === "happy"} />
    </div>
  );
}
