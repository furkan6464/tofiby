import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enoughToday } from "./enough";
import { sampleTask as t } from "./testTask";

describe("enoughToday", () => {
  it("says 4 of 5 equal-weight tasks meet the 0.8 threshold", () => {
    const info = enoughToday([
      t({ weight: 1, completed: false }),
      t({ weight: 1, completed: false }),
      t({ weight: 1, completed: false }),
      t({ weight: 1, completed: false }),
      t({ weight: 1, completed: false }),
    ]);
    assert.equal(info.need, 4);
    assert.equal(info.total, 5);
    assert.equal(info.met, false);
  });

  it("marks the day met once threshold weight is done", () => {
    const info = enoughToday([
      t({ weight: 1, completed: true }),
      t({ weight: 1, completed: true }),
      t({ weight: 1, completed: true }),
      t({ weight: 1, completed: true }),
      t({ weight: 1, completed: false }),
    ]);
    assert.equal(info.met, true);
  });

  it("ignores postponed tasks when counting the day", () => {
    const info = enoughToday([
      t({ id: "1", weight: 1, completed: true }),
      t({ id: "2", weight: 1, completed: true }),
      t({ id: "3", weight: 1, completed: false, status: "postponed" }),
    ]);
    assert.equal(info.met, true);
    assert.equal(info.total, 2);
  });
});
