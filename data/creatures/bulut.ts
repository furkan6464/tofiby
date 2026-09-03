import { makeAnims } from "./anims";
import { blush, canvas, ellipse, eyes, finish, ink, shadeBottom, spark } from "./draw";
import type { CreatureFrames, PixelFrame } from "./types";

/** Steam dumpling. Scalloped hem, lemon puffs — not a seal. */
function bulut(kind: "baby" | "child" | "teen" | "adult" | "elder"): PixelFrame {
  const g = canvas();
  const baby = kind === "baby";
  const cy = baby ? 16 : 15;
  const r = baby ? 8.4 : 9.2;

  ellipse(g, 16, cy, r, r - 1.2, "body");
  ellipse(g, 8, cy + 1, 4.6, 4.4, "body");
  ellipse(g, 24, cy + 1, 4.6, 4.4, "body");
  ellipse(g, 16, cy - 6, 5.2, 4.2, "body");
  ellipse(g, 11, cy + 7, 4.2, 3.2, "body");
  ellipse(g, 16, cy + 8, 4.4, 3.4, "body");
  ellipse(g, 21, cy + 7, 4.2, 3.2, "body");
  shadeBottom(g, 16, cy + 4, r - 1, 5, 0.45);
  ellipse(g, 16, cy + 3, 4.4, 3.2, "belly");

  eyes(g, 12, 20, cy - 1, baby ? 2.5 : 2.1);
  blush(g, 10, 22, cy + 3);
  ink(g, 15, cy + 3, "shade");
  ink(g, 17, cy + 3, "shade");

  ink(g, 7, cy - 6, "accent");
  ink(g, 8, cy - 7, "accent");
  ink(g, 24, cy - 6, "accent");
  ink(g, 25, cy - 7, "accent");

  if (kind === "elder" || kind === "adult") spark(g, 16, 5);
  return finish(g);
}

export const BULUT_STAGES: Record<string, CreatureFrames> = {
  baby: makeAnims(bulut("baby")),
  child: makeAnims(bulut("child")),
  teen: makeAnims(bulut("teen")),
  adult: makeAnims(bulut("adult")),
  elder: makeAnims(bulut("elder")),
};
