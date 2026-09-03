import { makeAnims } from "./anims";
import { blush, canvas, ellipse, eyes, feet, finish, ink, shadeBottom } from "./draw";
import type { CreatureFrames, PixelFrame } from "./types";

/** Honey dumpling. Two round eyes — never a visor bar. */
function gizem(kind: "baby" | "child" | "teen" | "adult" | "elder"): PixelFrame {
  const g = canvas();
  const baby = kind === "baby";
  const cy = baby ? 17 : 16;
  const rx = baby ? 10.2 : 10.8;
  const ry = baby ? 8.2 : 8.8;

  ellipse(g, 16, cy, rx, ry, "body");
  shadeBottom(g, 16, cy, rx, ry);
  ellipse(g, 16, cy + 2, 5.2, 3.6, "belly");

  ink(g, 12, cy - 10, "accent");
  ink(g, 12, cy - 11, "accent");
  ink(g, 11, cy - 10, "accent");
  ink(g, 13, cy - 10, "accent");
  ink(g, 20, cy - 10, "accent");
  ink(g, 20, cy - 11, "accent");
  ink(g, 19, cy - 10, "accent");
  ink(g, 21, cy - 10, "accent");

  eyes(g, 11, 21, cy - 1, baby ? 2.5 : 2.2);
  blush(g, 9, 23, cy + 3);
  ink(g, 15, cy + 3, "shade");
  ink(g, 17, cy + 3, "shade");

  feet(g, cy + 8, baby ? 6 : 7);
  if (kind === "elder") ink(g, 6, 12, "accent");
  return finish(g);
}

export const GIZEM_STAGES: Record<string, CreatureFrames> = {
  baby: makeAnims(gizem("baby")),
  child: makeAnims(gizem("child")),
  teen: makeAnims(gizem("teen")),
  adult: makeAnims(gizem("adult")),
  elder: makeAnims(gizem("elder")),
};
