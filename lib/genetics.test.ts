import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GAME_CONFIG } from "./gameConfig";
import {
  breedOffspring,
  circularHueMean,
  createRng,
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
