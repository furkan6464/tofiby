import { GAME_CONFIG } from "./gameConfig";
import { mutationSpecies, speciesHue, starterSpecies } from "@/data/species/catalog";
import type {
  Accessory,
  CreatureGender,
  EarForm,
  EyeShape,
  Genetics,
  MicroAnim,
  SignatureDetail,
  SpeciesId,
} from "./types";

export const BASE_SPECIES: SpeciesId[] = starterSpecies();
export const MUTATION_SPECIES: SpeciesId = mutationSpecies();

export const EYE_SHAPES: EyeShape[] = ["oval", "yuvarlak", "badem", "yildiz"];
export const EAR_FORMS: EarForm[] = ["sivri", "yuvarlak", "dusuk", "antenli"];
export const SIGNATURES: SignatureDetail[] = [
  "kalp_yanak",
  "yildiz_parilti",
  "minik_boynuz",
  "none",
];
export const MICRO_ANIMS: MicroAnim[] = [
  "cift_kirpma",
  "minik_donus",
  "kuyruk_sallama",
  "none",
];
export const ACCESSORIES: Accessory[] = ["none", "fiyonk", "yildiz_cikartma", "cil"];

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

export function inheritDiscrete<T>(a: T, b: T, pool: readonly T[], rng: Rng): {
  value: T;
  mutated: boolean;
} {
  const roll = rng.next();
  if (roll < GAME_CONFIG.GENETICS_PARENT_SPECIES_CHANCE) {
    return { value: a, mutated: false };
  }
  if (roll < GAME_CONFIG.GENETICS_PARENT_SPECIES_CHANCE * 2) {
    return { value: b, mutated: false };
  }
  const pick = pool[Math.floor(rng.next() * pool.length)] ?? a;
  return { value: pick, mutated: true };
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

export function speciesDefaults(speciesId: SpeciesId): Omit<Genetics, "hueShift"> {
  if (speciesId === "tofiby") {
    return {
      eyeShape: "oval",
      earForm: "sivri",
      signature: "kalp_yanak",
      microAnim: "cift_kirpma",
      accessory: "none",
    };
  }
  if (speciesId === "bulut") {
    return {
      eyeShape: "yuvarlak",
      earForm: "yuvarlak",
      signature: "none",
      microAnim: "minik_donus",
      accessory: "none",
    };
  }
  if (speciesId === "yildiz") {
    return {
      eyeShape: "yildiz",
      earForm: "antenli",
      signature: "yildiz_parilti",
      microAnim: "kuyruk_sallama",
      accessory: "yildiz_cikartma",
    };
  }
  if (speciesId === "gizem") {
    return {
      eyeShape: "badem",
      earForm: "dusuk",
      signature: "none",
      microAnim: "none",
      accessory: "cil",
    };
  }
  if (speciesId === "ruji") {
    return {
      eyeShape: "yuvarlak",
      earForm: "sivri",
      signature: "kalp_yanak",
      microAnim: "cift_kirpma",
      accessory: "fiyonk",
    };
  }
  if (speciesId === "kalyoz") {
    return {
      eyeShape: "badem",
      earForm: "dusuk",
      signature: "none",
      microAnim: "none",
      accessory: "cil",
    };
  }
  if (speciesId === "burku") {
    return {
      eyeShape: "oval",
      earForm: "sivri",
      signature: "minik_boynuz",
      microAnim: "none",
      accessory: "none",
    };
  }
  if (speciesId === "podo") {
    return {
      eyeShape: "yuvarlak",
      earForm: "yuvarlak",
      signature: "none",
      microAnim: "kuyruk_sallama",
      accessory: "none",
    };
  }
  if (speciesId === "maskoz") {
    return {
      eyeShape: "badem",
      earForm: "yuvarlak",
      signature: "none",
      microAnim: "none",
      accessory: "none",
    };
  }
  return {
    eyeShape: "yildiz",
    earForm: "antenli",
    signature: "yildiz_parilti",
    microAnim: "minik_donus",
    accessory: "fiyonk",
  };
}

export function eggShellVariant(speciesId: SpeciesId, hueShift: number): string {
  return `${speciesId}-${Math.round(hueShift / 15) * 15}`;
}

export function defaultGenetics(
  speciesId: SpeciesId,
  hueShift: number,
  seedParts: string[],
): Genetics {
  const rng = createRng(seedFrom([...seedParts, "traits"]));
  const base = speciesDefaults(speciesId);
  const accessory =
    rng.next() < 0.12
      ? ACCESSORIES[1 + Math.floor(rng.next() * (ACCESSORIES.length - 1))]
      : base.accessory;
  return { ...base, accessory, hueShift };
}

export function breedOffspring(input: {
  parentA: { speciesId: SpeciesId; hueShift: number; genetics?: Genetics };
  parentB: { speciesId: SpeciesId; hueShift: number; genetics?: Genetics };
  pairId: string;
  at: string;
}): {
  speciesId: SpeciesId;
  hueShift: number;
  genetics: Genetics;
  mutated: boolean;
} {
  const rng = createRng(seedFrom([input.pairId, input.at, "offspring"]));
  const species = inheritDiscrete(
    input.parentA.speciesId,
    input.parentB.speciesId,
    [MUTATION_SPECIES],
    rng,
  );
  const speciesId = species.mutated ? MUTATION_SPECIES : species.value;
  const ga = input.parentA.genetics ?? speciesDefaults(input.parentA.speciesId);
  const gb = input.parentB.genetics ?? speciesDefaults(input.parentB.speciesId);
  const eye = inheritDiscrete(ga.eyeShape, gb.eyeShape, EYE_SHAPES, rng);
  const ear = inheritDiscrete(ga.earForm, gb.earForm, EAR_FORMS, rng);
  const sig = inheritDiscrete(ga.signature, gb.signature, SIGNATURES, rng);
  const micro = inheritDiscrete(ga.microAnim, gb.microAnim, MICRO_ANIMS, rng);
  const acc = inheritDiscrete(ga.accessory, gb.accessory, ACCESSORIES, rng);
  const hueShift = inheritHue(input.parentA.hueShift, input.parentB.hueShift, rng);
  return {
    speciesId,
    hueShift,
    mutated: species.mutated,
    genetics: {
      eyeShape: eye.value,
      earForm: ear.value,
      signature: sig.value,
      microAnim: micro.value,
      accessory: acc.value,
      hueShift,
    },
  };
}

export const SPECIES_BASE_HUE: Record<SpeciesId, number> = {
  tofiby: speciesHue("tofiby"),
  bulut: speciesHue("bulut"),
  yildiz: speciesHue("yildiz"),
  gizem: speciesHue("gizem"),
  isilti: speciesHue("isilti"),
  ruji: speciesHue("ruji"),
  kalyoz: speciesHue("kalyoz"),
  burku: speciesHue("burku"),
  podo: speciesHue("podo"),
  maskoz: speciesHue("maskoz"),
};

export function assignHiddenEggSpecies(
  userId: string,
  at: string,
  gender: CreatureGender = "kiz",
): { speciesId: SpeciesId; hueShift: number; genetics: Genetics } {
  const rng = createRng(seedFrom([userId, at, "hatch", gender]));
  const pool = starterSpecies(gender);
  const species = pool[Math.floor(rng.next() * pool.length)] ?? (gender === "erkek" ? "gizem" : "tofiby");
  const jitter = (rng.next() * 2 - 1) * 8;
  const hueShift = (SPECIES_BASE_HUE[species] + jitter + 360) % 360;
  return {
    speciesId: species,
    hueShift,
    genetics: defaultGenetics(species, hueShift, [userId, at]),
  };
}
