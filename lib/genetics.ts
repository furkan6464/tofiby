import { GAME_CONFIG } from "./gameConfig";
import type { SpeciesId } from "./types";

export const BASE_SPECIES: SpeciesId[] = ["tofiby", "bulut", "yildiz", "gizem"];
export const MUTATION_SPECIES: SpeciesId = "isilti";

export interface Rng {
  next(): number;
}

/** Mulberry32 — documented, seedable, not Math.random sprinkled in UI. */
export function createRng(seed: number): Rng {
  let t = seed >>> 0;
  return {
    next() {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function seedFrom(parts: string[]): number {
  const text = parts.join("|");
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickSpecies(parentA: SpeciesId, parentB: SpeciesId, rng: Rng): SpeciesId {
  const roll = rng.next();
  const aChance = GAME_CONFIG.GENETICS_PARENT_SPECIES_CHANCE;
  const bChance = GAME_CONFIG.GENETICS_PARENT_SPECIES_CHANCE;
  if (roll < aChance) return parentA;
  if (roll < aChance + bChance) return parentB;
  return MUTATION_SPECIES;
}

export function circularHueMean(a: number, b: number): number {
  const ar = (a * Math.PI) / 180;
  const br = (b * Math.PI) / 180;
  const x = Math.cos(ar) + Math.cos(br);
  const y = Math.sin(ar) + Math.sin(br);
  const mean = (Math.atan2(y, x) * 180) / Math.PI;
  return (mean + 360) % 360;
}

export function inheritHue(hueA: number, hueB: number, rng: Rng): number {
  const mean = circularHueMean(hueA, hueB);
  const jitter =
    (rng.next() * 2 - 1) * GAME_CONFIG.GENETICS_HUE_JITTER_DEGREES;
  return (mean + jitter + 360) % 360;
}

export function breedOffspring(input: {
  parentA: { speciesId: SpeciesId; hueShift: number };
  parentB: { speciesId: SpeciesId; hueShift: number };
  pairId: string;
  at: string;
}): { speciesId: SpeciesId; hueShift: number } {
  const rng = createRng(seedFrom([input.pairId, input.at, "offspring"]));
  return {
    speciesId: pickSpecies(input.parentA.speciesId, input.parentB.speciesId, rng),
    hueShift: inheritHue(input.parentA.hueShift, input.parentB.hueShift, rng),
  };
}

export const SPECIES_BASE_HUE: Record<SpeciesId, number> = {
  tofiby: 330,
  bulut: 268,
  yildiz: 162,
  gizem: 42,
  isilti: 28,
};

export function assignHiddenEggSpecies(userId: string, at: string): {
  speciesId: SpeciesId;
  hueShift: number;
} {
  const rng = createRng(seedFrom([userId, at, "hatch"]));
  const species = BASE_SPECIES[Math.floor(rng.next() * BASE_SPECIES.length)];
  const jitter = (rng.next() * 2 - 1) * 8;
  return {
    speciesId: species,
    hueShift: (SPECIES_BASE_HUE[species] + jitter + 360) % 360,
  };
}
