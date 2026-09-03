import { makeAnims } from "./anims";
import { canvas, ellipse, eyes, feet, finish, ink, shadeBottom } from "./draw";
import type { CreatureFrames, PixelFrame } from "./types";

/** Stocky anthracite sigma — deadpan brow, shades when grown. */
function kalyoz(kind: "baby" | "child" | "teen" | "adult" | "elder"): PixelFrame {
  const g = canvas();
  const baby = kind === "baby";
  const grown = kind === "adult" || kind === "elder";
  const headY = baby ? 13 : 12;
  const headR = baby ? 7.4 : 6.6;
  const bodyY = baby ? 22 : 21;
  const bodyRx = baby ? 8.2 : 9.4;
  const bodyRy = baby ? 6.4 : 7.8;

  ellipse(g, 16, bodyY, bodyRx, bodyRy, "body");
  ellipse(g, 16, headY, headR + 0.4, headR - 1.1, "body");
  shadeBottom(g, 16, bodyY, bodyRx, bodyRy, 0.35);
  ellipse(g, 16, bodyY + 0.6, 4.6, 3.2, "belly");

  for (let x = 11; x <= 21; x++) ink(g, x, headY - 3, "outline");
  ink(g, 20, headY - 4, "outline");
  ink(g, 21, headY - 4, "outline");

  eyes(g, 12, 20, headY, baby ? 2 : 1.7);
  for (let x = 14; x <= 18; x++) ink(g, x, headY + 4, "outline");

  if (grown) {
    for (let x = 10; x <= 22; x++) ink(g, x, headY, "outline");
    ink(g, 11, headY - 1, "outline");
    ink(g, 21, headY - 1, "outline");
    ink(g, 13, headY, "accent");
    ink(g, 19, headY, "accent");
  }

  feet(g, bodyY + 6, grown ? 6.2 : 5.4);
  if (kind === "elder") ink(g, 7, 12, "accent");
  return finish(g);
}

export const KALYOZ_STAGES: Record<string, CreatureFrames> = {
  baby: makeAnims(kalyoz("baby")),
  child: makeAnims(kalyoz("child")),
  teen: makeAnims(kalyoz("teen")),
  adult: makeAnims(kalyoz("adult")),
  elder: makeAnims(kalyoz("elder")),
};
