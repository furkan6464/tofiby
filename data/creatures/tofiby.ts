import { makeAnims } from "./anims";
import { blush, canvas, ellipse, eyes, feet, finish, heart, ink, shadeBottom, spark } from "./draw";
import type { CreatureFrames, PixelFrame } from "./types";

/** Jam-drop mochi. Round gumdrop ears, heart cheeks, comma tail — not a fox. */
function tofiby(kind: "baby" | "child" | "teen" | "adult" | "elder"): PixelFrame {
  const g = canvas();
  const baby = kind === "baby";
  const grown = kind === "adult" || kind === "elder";
  const headY = baby ? 13 : grown ? 12 : 13;
  const headR = baby ? 8.2 : grown ? 7.2 : 7.6;
  const bodyY = baby ? 22 : 21;
  const bodyRx = baby ? 7.2 : grown ? 8.6 : 8;
  const bodyRy = baby ? 5.6 : grown ? 7.2 : 6.4;

  ellipse(g, 16, bodyY, bodyRx, bodyRy, "body");
  ellipse(g, 16, headY, headR, headR - 0.6, "body");
  ellipse(g, 9, headY + 2, 2.4, 2.2, "body");
  ellipse(g, 23, headY + 2, 2.4, 2.2, "body");
  shadeBottom(g, 16, bodyY, bodyRx, bodyRy);
  ellipse(g, 16, bodyY + 0.5, 4.2, 3.2, "belly");

  ellipse(g, 10, headY - 7, 2.6, 3.4, "body");
  ellipse(g, 22, headY - 7, 2.6, 3.4, "body");
  ink(g, 10, headY - 10, "accent");
  ink(g, 22, headY - 10, "accent");
  ink(g, 9, headY - 9, "accent");
  ink(g, 11, headY - 9, "accent");
  ink(g, 21, headY - 9, "accent");
  ink(g, 23, headY - 9, "accent");

  eyes(g, 12, 20, headY, baby ? 2.5 : 2.1);
  blush(g, 10, 22, headY + 3);
  heart(g, 11, headY + 3);
  heart(g, 21, headY + 3);
  ink(g, 15, headY + 4, "shade");
  ink(g, 17, headY + 4, "shade");

  feet(g, bodyY + 5, baby ? 4.5 : 5.5);
  ellipse(g, 25, bodyY + 1, 2.1, 3.4, "body");
  ink(g, 26, bodyY + 3, "shade");
  ink(g, 27, bodyY + 2, "shade");

  if (kind === "elder") {
    spark(g, 6, 8);
    spark(g, 26, 28);
  }
  return finish(g);
}

export const TOFIBY_STAGES: Record<string, CreatureFrames> = {
  baby: makeAnims(tofiby("baby")),
  child: makeAnims(tofiby("child")),
  teen: makeAnims(tofiby("teen")),
  adult: makeAnims(tofiby("adult")),
  elder: makeAnims(tofiby("elder")),
};
