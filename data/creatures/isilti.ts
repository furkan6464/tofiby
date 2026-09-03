import { makeAnims } from "./anims";
import { blush, canvas, ellipse, eyes, feet, finish, ink, shadeBottom, spark } from "./draw";
import type { CreatureFrames, PixelFrame } from "./types";

/** Jewel peach with a sparkle crown. */
function isilti(kind: "baby" | "child" | "teen" | "adult" | "elder"): PixelFrame {
  const g = canvas();
  const baby = kind === "baby";
  const cy = baby ? 16 : 15;

  ellipse(g, 16, cy, baby ? 8.4 : 9.2, baby ? 8.2 : 9, "body");
  ellipse(g, 16, cy + 6, 7.2, 5.2, "body");
  shadeBottom(g, 16, cy + 3, 8.2, 7.2);
  ellipse(g, 16, cy + 3, 4.2, 3.2, "belly");
  ink(g, 16, cy - 6, "shade");

  spark(g, 16, cy - 10);
  ink(g, 14, cy - 8, "accent");
  ink(g, 18, cy - 8, "accent");

  eyes(g, 12, 20, cy - 1, baby ? 2.5 : 2.1);
  blush(g, 10, 22, cy + 3);
  ink(g, 15, cy + 3, "shade");
  ink(g, 17, cy + 3, "shade");

  feet(g, cy + 11, baby ? 5 : 6);
  if (kind === "elder" || kind === "adult") {
    spark(g, 7, 8);
    ink(g, 25, 9, "highlight");
  }
  return finish(g);
}

export const ISILTI_STAGES: Record<string, CreatureFrames> = {
  baby: makeAnims(isilti("baby")),
  child: makeAnims(isilti("child")),
  teen: makeAnims(isilti("teen")),
  adult: makeAnims(isilti("adult")),
  elder: makeAnims(isilti("elder")),
};
