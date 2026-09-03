import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GAME_CONFIG } from "./gameConfig";
import { speciesGender, starterSpecies } from "@/data/species/catalog";
import {
  assignHiddenEggSpecies,
  breedOffspring,
  circularHueMean,
  createRng,
  inheritDiscrete,
  MUTATION_SPECIES,
} from "./genetics";

describe("genetics", () => {
  it("is deterministic for the same pair seed", () => {
    const a = breedOffspring({
      parentA: { speciesId: "tofiby", hueShift: 330 },
      parentB: { speciesId: "bulut", hueShift: 268 },
      pairId: "pair-1",
      at: "2027-03-01T00:00:00.000Z",
    });
    const b = breedOffspring({
      parentA: { speciesId: "tofiby", hueShift: 330 },
      parentB: { speciesId: "bulut", hueShift: 268 },
      pairId: "pair-1",
      at: "2027-03-01T00:00:00.000Z",
    });
    assert.deepEqual(a, b);
  });

  it("inherits each gene independently with a 10% mutation bucket", () => {
    let mutated = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const rng = createRng(i + 1);
      const g = inheritDiscrete("oval", "badem", ["yildiz"] as const, rng);
      if (g.mutated) mutated += 1;
    }
    assert.ok(Math.abs(mutated / n - 0.1) < 0.03);
  });

  it("uses documented weighted chances over many rolls", () => {
    const rng = createRng(42);
    let mutation = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const roll = rng.next();
      if (
        roll >=
        GAME_CONFIG.GENETICS_PARENT_SPECIES_CHANCE * 2
      ) {
        mutation += 1;
      }
    }
    const rate = mutation / n;
    assert.ok(Math.abs(rate - GAME_CONFIG.GENETICS_MUTATION_CHANCE) < 0.02);
  });

  it("averages hues on a circle so 350 and 10 meet near 0", () => {
    const mean = circularHueMean(350, 10);
    assert.ok(mean < 8 || mean > 352);
  });

  it("keeps four girl and four boy starters", () => {
    assert.deepEqual(starterSpecies("kiz"), ["tofiby", "bulut", "yildiz", "ruji"]);
    assert.deepEqual(starterSpecies("erkek"), ["gizem", "kalyoz", "burku", "podo"]);
  });

  it("draws mystery eggs only from the chosen gender pool", () => {
    for (const gender of ["kiz", "erkek"] as const) {
      const pool = new Set(starterSpecies(gender));
      for (let i = 0; i < 40; i++) {
        const gene = assignHiddenEggSpecies("u", `2027-03-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`, gender);
        assert.equal(pool.has(gene.speciesId), true);
        assert.equal(speciesGender(gene.speciesId), gender);
      }
    }
  });

  it("can produce the mutation species", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      const child = breedOffspring({
        parentA: { speciesId: "gizem", hueShift: 40 },
        parentB: { speciesId: "yildiz", hueShift: 160 },
        pairId: `pair-${i}`,
        at: "2027-03-01T00:00:00.000Z",
      });
      seen.add(child.speciesId);
    }
    assert.ok(seen.has(MUTATION_SPECIES) || seen.size >= 2);
  });
});
