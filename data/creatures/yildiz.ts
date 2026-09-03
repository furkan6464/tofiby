import { makeAnims } from "./anims";
import { blush, canvas, ellipse, eyes, feet, finish, ink, shadeBottom, spark } from "./draw";
import type { CreatureFrames, PixelFrame } from "./types";

/** Dew lantern / pear. Gold droplet crown — not a lion cub. */
function yildiz(kind: "baby" | "child" | "teen" | "adult" | "elder"): PixelFrame {
  const g = canvas();
  const baby = kind === "baby";
  const headY = baby ? 14 : 13;

  ellipse(g, 16, headY, baby ? 7.2 : 7.6, baby ? 8.4 : 9.2, "body");
  ellipse(g, 16, headY + 8, baby ? 6.2 : 7.2, baby ? 5.2 : 6.2, "body");
  shadeBottom(g, 16, headY + 8, 6.4, 5.4);
  ellipse(g, 16, headY + 7, 3.6, 3.2, "belly");

  spark(g, 16, headY - 9);
  ink(g, 16, headY - 6, "accent");

  eyes(g, 13, 19, headY, baby ? 2.2 : 1.9);
  blush(g, 11, 21, headY + 3);
  ink(g, 15, headY + 4, "shade");
  ink(g, 17, headY + 4, "shade");

  feet(g, headY + 13, baby ? 4 : 5);
  if (kind === "elder") spark(g, 25, 9);
  return finish(g);
}

export const YILDIZ_STAGES: Record<string, CreatureFrames> = {
  baby: makeAnims(yildiz("baby")),
  child: makeAnims(yildiz("child")),
  teen: makeAnims(yildiz("teen")),
  adult: makeAnims(yildiz("adult")),
  elder: makeAnims(yildiz("elder")),
};
