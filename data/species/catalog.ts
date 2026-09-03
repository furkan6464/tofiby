import type { SpeciesId } from "@/lib/types";

export interface SpeciesDef {
  id: SpeciesId;
  nameKey: string;
  blurbKey: string;
  baseHue: number;
  starter: boolean;
  mutation: boolean;
  /** Unlock is never purchased — only starter, mutation, or a later behavior key. */
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
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "bulut",
    nameKey: "species.bulut",
    blurbKey: "species.bulutBlurb",
    baseHue: 268,
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "yildiz",
    nameKey: "species.yildiz",
    blurbKey: "species.yildizBlurb",
    baseHue: 162,
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "gizem",
    nameKey: "species.gizem",
    blurbKey: "species.gizemBlurb",
    baseHue: 42,
    starter: true,
    mutation: false,
    unlock: "starter",
  },
  {
    id: "isilti",
    nameKey: "species.isilti",
    blurbKey: "species.isiltiBlurb",
    baseHue: 28,
    starter: false,
    mutation: true,
    unlock: "mutation",
  },
];

export function starterSpecies(): SpeciesId[] {
  return SPECIES_CATALOG.filter((s) => s.starter).map((s) => s.id);
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
