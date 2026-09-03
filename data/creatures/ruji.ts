import { makeAnims } from "./anims";
import { blush, canvas, ellipse, eyes, feet, finish, ink, shadeBottom, spark } from "./draw";
import type { CreatureFrames, PixelFrame } from "./types";

/** Pastel queen with a huge fuchsia bow. */
function ruji(kind: "baby" | "child" | "teen" | "adult" | "elder"): PixelFrame {
  const g = canvas();
  const baby = kind === "baby";
  const grown = kind === "adult" || kind === "elder";
  const tilt = grown ? 1 : 0;
  const headY = baby ? 14 : 13;
  const headR = baby ? 7.8 : 7.2;
  const bodyY = baby ? 23 : 22;
  const bodyRx = baby ? 6.8 : 7.8;
  const bodyRy = baby ? 5.2 : 6.4;

  ellipse(g, 16 + tilt, bodyY, bodyRx, bodyRy, "body");
  ellipse(g, 16 + tilt, headY, headR, headR - 0.5, "body");
  shadeBottom(g, 16 + tilt, bodyY, bodyRx, bodyRy);
  ellipse(g, 16 + tilt, bodyY + 0.4, 3.8, 2.8, "belly");

  ellipse(g, 7 + tilt, 6, grown ? 6.4 : 5.6, grown ? 4.4 : 3.8, "accent");
  ellipse(g, 25 + tilt, 6, grown ? 6.4 : 5.6, grown ? 4.4 : 3.8, "accent");
  ellipse(g, 16 + tilt, 7, grown ? 4.2 : 3.4, grown ? 3.2 : 2.6, "accent");
  ellipse(g, 11 + tilt, 11, 1.8, 3.4, "accent");
  ellipse(g, 21 + tilt, 11, 1.8, 3.4, "accent");
  ink(g, 16 + tilt, 7, "shade");
  ink(g, 15 + tilt, 6, "shade");
  ink(g, 17 + tilt, 6, "shade");
  if (grown) {
    spark(g, 16 + tilt, 4);
    ink(g, 15 + tilt, 4, "highlight");
  }

  eyes(g, 12 + tilt, 20 + tilt, headY, baby ? 2.4 : 2.1);
  ink(g, 13 + tilt, headY - 1, "highlight");
  ink(g, 21 + tilt, headY - 1, "highlight");
  blush(g, 10 + tilt, 22 + tilt, headY + 3);
  ink(g, 15 + tilt, headY + 4, "shade");

  feet(g, bodyY + 5, baby ? 4.2 : 5);
  if (kind === "elder") spark(g, 26, 26);
  return finish(g);
}

export const RUJI_STAGES: Record<string, CreatureFrames> = {
  baby: makeAnims(ruji("baby")),
  child: makeAnims(ruji("child")),
  teen: makeAnims(ruji("teen")),
  adult: makeAnims(ruji("adult")),
  elder: makeAnims(ruji("elder")),
};
