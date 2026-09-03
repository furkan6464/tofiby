import type { CreatureGender, SpeciesId } from "@/lib/types";

export interface SpeciesDef {
  id: SpeciesId;
  nameKey: string;
  blurbKey: string;
  baseHue: number;
  gender: CreatureGender;
  starter: boolean;
  mutation: boolean;
  unlock: "starter" | "mutation" | "behavior";
  unlockHint?: string;
}

/** Single source of species identity. New species are added here, not sprinkled as literals. */
export const SPECIES_CATALOG: SpeciesDef[] = [
  {
    id: "tofiby",
    nameKey: "species.tofiby",
    blurbKey: "species.tofibyBlurb",
    baseHue: 330,
    gender: "kiz",
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "bulut",
    nameKey: "species.bulut",
    blurbKey: "species.bulutBlurb",
    baseHue: 268,
    gender: "kiz",
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "yildiz",
    nameKey: "species.yildiz",
    blurbKey: "species.yildizBlurb",
    baseHue: 162,
    gender: "kiz",
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "ruji",
    nameKey: "species.ruji",
    blurbKey: "species.rujiBlurb",
    baseHue: 328,
    gender: "kiz",
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "gizem",
    nameKey: "species.gizem",
    blurbKey: "species.gizemBlurb",
    baseHue: 42,
    gender: "erkek",
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "kalyoz",
    nameKey: "species.kalyoz",
    blurbKey: "species.kalyozBlurb",
    baseHue: 240,
    gender: "erkek",
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "burku",
    nameKey: "species.burku",
    blurbKey: "species.burkuBlurb",
    baseHue: 110,
    gender: "erkek",
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "podo",
    nameKey: "species.podo",
    blurbKey: "species.podoBlurb",
    baseHue: 24,
    gender: "erkek",
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "isilti",
    nameKey: "species.isilti",
    blurbKey: "species.isiltiBlurb",
    baseHue: 28,
    gender: "kiz",
    starter: false,
    mutation: true,
    unlock: "mutation",
  },
];

export function starterSpecies(gender?: CreatureGender): SpeciesId[] {
  return SPECIES_CATALOG.filter((s) => s.starter && (!gender || s.gender === gender)).map((s) => s.id);
}

export function mutationSpecies(): SpeciesId {
  return SPECIES_CATALOG.find((s) => s.mutation)?.id ?? "isilti";
}

export function speciesDef(id: SpeciesId): SpeciesDef | undefined {
  return SPECIES_CATALOG.find((s) => s.id === id);
}

export function speciesHue(id: SpeciesId): number {
  return speciesDef(id)?.baseHue ?? 330;
}

export function speciesGender(id: SpeciesId): CreatureGender {
  return speciesDef(id)?.gender ?? "kiz";
}

export function resolvedGender(c: {
  gender?: CreatureGender | null;
  speciesId: SpeciesId;
}): CreatureGender {
  return c.gender ?? speciesGender(c.speciesId);
}
