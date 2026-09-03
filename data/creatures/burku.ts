import { makeStillAnims } from "./anims";
import { canvas, ellipse, eyes, feet, finish, ink, shadeBottom } from "./draw";
import type { CreatureFrames, PixelFrame } from "./types";

/** Crossed-arms boulder — gold chain, almost no idle bounce. */
function burku(kind: "baby" | "child" | "teen" | "adult" | "elder"): PixelFrame {
  const g = canvas();
  const baby = kind === "baby";
  const grown = kind === "adult" || kind === "elder";
  const headY = baby ? 12 : 11;
  const headR = baby ? 7 : 6.4;
  const bodyY = baby ? 21 : 20;
  const bodyRx = baby ? 7.6 : 8.8;
  const bodyRy = baby ? 6.8 : 8;

  ellipse(g, 16, bodyY, bodyRx, bodyRy, "body");
  ellipse(g, 16, headY, headR, headR - 0.8, "body");
  shadeBottom(g, 16, bodyY, bodyRx, bodyRy, 0.4);
  ellipse(g, 16, bodyY + 1, 3.4, 2.4, "belly");

  ellipse(g, 8, bodyY, 3.8, 2.8, "shade");
  ellipse(g, 24, bodyY, 3.8, 2.8, "shade");
  ellipse(g, 16, bodyY, 6.2, 2.6, "shade");
  ink(g, 11, bodyY, "outline");
  ink(g, 21, bodyY, "outline");

  ink(g, 14, headY + 6, "accent");
  ink(g, 16, headY + 7, "accent");
  ink(g, 18, headY + 6, "accent");
  if (grown) {
    ink(g, 13, headY + 6, "accent");
    ink(g, 19, headY + 6, "accent");
    ink(g, 16, headY + 8, "accent");
  }

  eyes(g, 12, 20, headY, baby ? 2 : 1.8);
  ink(g, 15, headY + 3, "outline");
  ink(g, 16, headY + 3, "outline");
  ink(g, 17, headY + 3, "outline");

  feet(g, bodyY + 6, grown ? 5.8 : 5);
  if (kind === "elder") ink(g, 8, 10, "accent");
  return finish(g);
}

export const BURKU_STAGES: Record<string, CreatureFrames> = {
  baby: makeStillAnims(burku("baby")),
  child: makeStillAnims(burku("child")),
  teen: makeStillAnims(burku("teen")),
  adult: makeStillAnims(burku("adult")),
  elder: makeStillAnims(burku("elder")),
};
