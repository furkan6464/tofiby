import { STAGE_ORDER, type CreatureStage } from "@/lib/gameConfig";
import { resolveSpeciesId } from "@/data/species/catalog";
import type { Genetics, SpeciesId } from "@/lib/types";
import { EGG_FRAMES } from "./egg";
import { PALETTES, tintPalette } from "./palettes";
import { BULUT_STAGES } from "./bulut";
import { BURKU_STAGES } from "./burku";
import { GIZEM_STAGES } from "./gizem";
import { ISILTI_STAGES } from "./isilti";
import { KALYOZ_STAGES } from "./kalyoz";
import { PODO_STAGES } from "./podo";
import { RUJI_STAGES } from "./ruji";
import { TOFIBY_STAGES } from "./tofiby";
import { YILDIZ_STAGES } from "./yildiz";
import { applyGenetics } from "./traits";
import type { CreatureFrames, Palette } from "./types";

const STAGES: Record<SpeciesId, Record<string, CreatureFrames>> = {
  tofiby: TOFIBY_STAGES,
  bulut: BULUT_STAGES,
  yildiz: YILDIZ_STAGES,
  gizem: GIZEM_STAGES,
  isilti: ISILTI_STAGES,
  ruji: RUJI_STAGES,
  kalyoz: KALYOZ_STAGES,
  burku: BURKU_STAGES,
  podo: PODO_STAGES,
};

export function getCreatureArt(
  speciesId: SpeciesId,
  stage: CreatureStage,
  hueShift: number,
  genetics?: Genetics | null,
): { frames: CreatureFrames; palette: Palette } {
  const id = resolveSpeciesId(speciesId);
  const safeStage = STAGE_ORDER.includes(stage) ? stage : "baby";
  const raw =
    safeStage === "egg"
      ? (EGG_FRAMES[id] ?? EGG_FRAMES.tofiby)
      : (STAGES[id]?.[safeStage] ?? STAGES.tofiby.baby);
  return {
    frames: safeStage === "egg" ? raw : applyGenetics(raw, genetics),
    palette: tintPalette(PALETTES[id] ?? PALETTES.tofiby, Number.isFinite(hueShift) ? hueShift : 330),
  };
}

export { PALETTES, tintPalette };
export type { CreatureFrames, Palette, PixelFrame } from "./types";
