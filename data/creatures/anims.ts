import {
  closeEyes,
  extraBlush,
  extraSparkle,
  halfEyes,
  lookShift,
  shiftFrame,
  withSick,
  withZzz,
} from "./parse";
import type { CreatureFrames, PixelFrame } from "./types";

export function makeAnims(base: PixelFrame): CreatureFrames {
  const up = shiftFrame(base, 0, -1);
  const hop = shiftFrame(base, 0, -2);
  const blink = closeEyes(base);
  const happy = extraBlush(base);
  const sparkle = extraSparkle(base);
  const sleepy = withZzz(halfEyes(base));
  return {
    idle: [base, up, base],
    blink: [blink],
    bounce: [hop, up, base],
    happy: [happy, shiftFrame(happy, 0, -1), happy],
    sleepy: [sleepy],
    look: [lookShift(base, -1), base, lookShift(base, 1)],
    yawn: [closeEyes(shiftFrame(base, 0, 1))],
    sick: [withSick(base)],
    sparkle: [sparkle, extraSparkle(sparkle), sparkle],
    crack: [base],
  };
}

export function makeEggAnims(base: PixelFrame, cracks: PixelFrame[] = []): CreatureFrames {
  const left = shiftFrame(base, -1, 0);
  const right = shiftFrame(base, 1, 0);
  return {
    idle: [base, left, base, right],
    blink: [base],
    bounce: [shiftFrame(base, 0, -1), base],
    happy: [shiftFrame(base, 0, -1), base],
    sleepy: [base],
    look: [left, base, right],
    yawn: [base],
    sick: [base],
    sparkle: [base],
    crack: cracks.length ? cracks : [base],
  };
}
