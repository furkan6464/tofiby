import { makeAnims } from "./anims";
import { blush, canvas, ellipse, eyes, feet, finish, ink, shadeBottom, spark } from "./draw";
import type { CreatureFrames, PixelFrame } from "./types";

/** Short, puffy, mustached — comic muscle in a small frame. */
function podo(kind: "baby" | "child" | "teen" | "adult" | "elder"): PixelFrame {
  const g = canvas();
  const baby = kind === "baby";
  const grown = kind === "adult" || kind === "elder";
  const headY = baby ? 15 : 14;
  const headR = baby ? 6.6 : 6.2;
  const bodyY = baby ? 23 : 22;
  const bodyRx = baby ? 8.6 : 9.2;
  const bodyRy = baby ? 6.2 : 7;

  ellipse(g, 16, bodyY, bodyRx, bodyRy, "body");
  ellipse(g, 16, headY, headR, headR - 0.3, "body");
  shadeBottom(g, 16, bodyY, bodyRx, bodyRy);
  ellipse(g, 16, bodyY + 0.4, 4.8, 3.6, "belly");

  ellipse(g, 8, bodyY - 1, 2.8, 2.6, "body");
  ellipse(g, 24, bodyY - 1, 2.8, 2.6, "body");

  eyes(g, 11, 21, headY, baby ? 2.3 : 2.1);
  blush(g, 10, 22, headY + 3);
  ink(g, 16, headY + 3, "shade");

  ink(g, 13, headY + 5, "accent");
  ink(g, 14, headY + 5, "accent");
  ink(g, 15, headY + 6, "accent");
  ink(g, 16, headY + 6, "accent");
  ink(g, 17, headY + 6, "accent");
  ink(g, 18, headY + 5, "accent");
  ink(g, 19, headY + 5, "accent");
  if (grown) {
    ink(g, 12, headY + 5, "accent");
    ink(g, 20, headY + 5, "accent");
  }

  feet(g, bodyY + 5, baby ? 4 : 4.6);
  if (kind === "elder") spark(g, 25, 10);
  return finish(g);
}

export const PODO_STAGES: Record<string, CreatureFrames> = {
  baby: makeAnims(podo("baby")),
  child: makeAnims(podo("child")),
  teen: makeAnims(podo("teen")),
  adult: makeAnims(podo("adult")),
  elder: makeAnims(podo("elder")),
};
