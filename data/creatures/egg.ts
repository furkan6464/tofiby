import { makeEggAnims } from "./anims";
import { canvas, ellipse, finish, ink } from "./draw";
import type { CreatureFrames, PixelFrame } from "./types";
import { stamp } from "./parse";

function shell(): PixelFrame {
  const g = canvas();
  ellipse(g, 16, 16, 8, 10, "shell");
  ellipse(g, 16, 18, 6, 7, "shellShade");
  ellipse(g, 14, 12, 3, 3, "belly");
  return finish(g);
}

function speckled(spots: [number, number][]): PixelFrame {
  const g = shell();
  for (const [x, y] of spots) ink(g, x, y, "speckle");
  return g;
}

function crack(base: PixelFrame, heavy: boolean): PixelFrame {
  const c = canvas();
  const marks: [number, number][] = heavy
    ? [
        [16, 8],
        [15, 10],
        [17, 10],
        [14, 13],
        [18, 13],
        [16, 16],
        [15, 19],
        [17, 19],
        [16, 22],
      ]
    : [
        [16, 10],
        [15, 13],
        [16, 16],
        [17, 19],
      ];
  for (const [x, y] of marks) ink(c, x, y, "outline");
  return stamp(base, c);
}

const TOFIBY = speckled([
  [13, 12],
  [19, 13],
  [15, 16],
  [18, 18],
  [14, 20],
]);
const BULUT = speckled([
  [12, 14],
  [16, 13],
  [20, 14],
  [14, 17],
  [18, 17],
]);
const YILDIZ = speckled([
  [16, 11],
  [15, 12],
  [17, 12],
  [16, 13],
]);
const GIZEM = speckled([
  [13, 15],
  [20, 16],
  [16, 19],
]);
const ISILTI = speckled([
  [14, 12],
  [18, 12],
  [16, 15],
  [13, 18],
  [19, 18],
]);
const RUJI = speckled([
  [12, 12],
  [20, 12],
  [16, 10],
  [15, 16],
  [18, 19],
]);
const KALYOZ = speckled([
  [13, 14],
  [19, 14],
  [16, 18],
]);
const BURKU = speckled([
  [14, 13],
  [18, 13],
  [16, 17],
  [16, 20],
]);
const PODO = speckled([
  [13, 13],
  [19, 13],
  [16, 16],
  [14, 19],
  [18, 19],
]);
const MASKOZ = speckled([
  [14, 11],
  [18, 11],
  [16, 13],
  [13, 17],
  [19, 18],
]);

function pack(base: PixelFrame): CreatureFrames {
  return makeEggAnims(base, [crack(base, false), crack(base, true)]);
}

export const EGG_FRAMES: Record<string, CreatureFrames> = {
  tofiby: pack(TOFIBY),
  bulut: pack(BULUT),
  yildiz: pack(YILDIZ),
  gizem: pack(GIZEM),
  isilti: pack(ISILTI),
  ruji: pack(RUJI),
  kalyoz: pack(KALYOZ),
  burku: pack(BURKU),
  podo: pack(PODO),
  maskoz: pack(MASKOZ),
};
