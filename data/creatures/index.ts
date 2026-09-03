import type { CreatureStage } from "@/lib/gameConfig";
import type { SpeciesId } from "@/lib/types";
import { EGG_FRAMES } from "./egg";
import { PALETTES, tintPalette } from "./palettes";
import { BULUT_STAGES } from "./bulut";
import { GIZEM_STAGES } from "./gizem";
import { ISILTI_STAGES } from "./isilti";
import { TOFIBY_STAGES } from "./tofiby";
import { YILDIZ_STAGES } from "./yildiz";
import type { CreatureFrames, Palette } from "./types";

const STAGES: Record<SpeciesId, Record<string, CreatureFrames>> = {
  tofiby: TOFIBY_STAGES,
  bulut: BULUT_STAGES,
  yildiz: YILDIZ_STAGES,
  gizem: GIZEM_STAGES,
  isilti: ISILTI_STAGES,
};

export function getCreatureArt(
  speciesId: SpeciesId,
  stage: CreatureStage,
  hueShift: number,
): { frames: CreatureFrames; palette: Palette } {
  const frames =
    stage === "egg"
      ? EGG_FRAMES[speciesId]
      : STAGES[speciesId][stage];
  return {
    frames,
    palette: tintPalette(PALETTES[speciesId], hueShift),
  };
}

export { PALETTES, tintPalette };
export type { CreatureFrames, Palette, PixelFrame } from "./types";
