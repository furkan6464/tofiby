import { makeAnims } from "./anims";
import { blush, canvas, ellipse, eyes, feet, finish, ink, shadeBottom, spark } from "./draw";
import type { CreatureFrames, PixelFrame } from "./types";

type Stage = "baby" | "child" | "teen" | "adult" | "elder";

/** Two-tone hair + a mask that grows from floppy baby to locked-in adult. */
function hair(g: PixelFrame, headY: number, headR: number, kind: Stage) {
  const baby = kind === "baby";
  const scalp = headY - headR + 1.2;
  ellipse(g, 16, scalp + 0.6, baby ? 5.4 : 5, 2.2, "outline");
  ellipse(g, 16, scalp - (baby ? 1.4 : 1.8), baby ? 4.8 : 4.2, baby ? 2.6 : 2.2, "accent");
  ink(g, 13, Math.round(scalp), "outline");
  ink(g, 19, Math.round(scalp), "outline");
  ink(g, 15, Math.round(scalp) - 1, "outline");
  ink(g, 17, Math.round(scalp) - 1, "outline");
  ink(g, 14, Math.round(scalp) - 2, "accent");
  ink(g, 18, Math.round(scalp) - 2, "accent");
  ink(g, 16, Math.round(scalp) - 3, "accent");
  if (baby) {
    ink(g, 12, Math.round(scalp) - 1, "accent");
    ink(g, 20, Math.round(scalp) - 2, "accent");
    ink(g, 11, Math.round(scalp), "accent");
  }
}

function mask(g: PixelFrame, headY: number, kind: Stage) {
  const ox = kind === "baby" ? 1 : 0;
  const oy = kind === "baby" ? 1 : 0;
  const y0 = headY - 2 + oy;
  const y1 = headY + (kind === "baby" ? 1 : 0) + oy;
  const x0 = 8 + ox;
  const x1 = kind === "baby" ? 25 : 24;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const extra =
        kind === "baby" ? Math.floor((x - 12) / 6) : kind === "child" && x >= 20 ? 1 : 0;
      ink(g, x, y + extra, "lid");
    }
  }
  ink(g, x0 + 1, y0, "outline");
  ink(g, x1 - 1, y0 + (kind === "baby" ? 2 : 0), "outline");
  if (kind === "teen" || kind === "adult" || kind === "elder") {
    ink(g, 16, headY + 1, "lid");
    ink(g, 8, headY, "lid");
    ink(g, 24, headY, "lid");
  }
  if (kind === "adult" || kind === "elder") {
    ink(g, 16, headY + 2, "lid");
    ink(g, 7, headY, "outline");
    ink(g, 25, headY, "outline");
    ink(g, 8, headY + 1, "outline");
    ink(g, 24, headY + 1, "outline");
  }
}

function maskoz(kind: Stage): PixelFrame {
  const g = canvas();
  const baby = kind === "baby";
  const grown = kind === "adult" || kind === "elder";
  const headY = baby ? 14 : 13;
  const headR = baby ? 7.4 : 6.8;
  const bodyY = baby ? 23 : 22;
  const bodyRx = baby ? 7.2 : grown ? 8.6 : 8;
  const bodyRy = baby ? 5.6 : grown ? 7 : 6.4;

  ellipse(g, 16, bodyY, bodyRx, bodyRy, "body");
  ellipse(g, 16, headY, headR, headR - 0.4, "body");
  shadeBottom(g, 16, bodyY, bodyRx, bodyRy, 0.32);
  ellipse(g, 16, bodyY + 0.4, 4.2, 3, "belly");

  if (grown) {
    ellipse(g, 8, bodyY - 1, 2.6, 2.2, "body");
    ellipse(g, 24, bodyY - 1, 2.6, 2.2, "body");
  }

  hair(g, headY, headR, kind);
  mask(g, headY, kind);
  const eyeY = headY + (baby ? 1 : 0);
  const eyeR = baby ? 2.3 : 2;
  ellipse(g, 11, eyeY, eyeR + 0.5, eyeR + 0.3, "body");
  ellipse(g, 21, eyeY, eyeR + 0.5, eyeR + 0.3, "body");
  eyes(g, 11, 21, eyeY, eyeR);
  if (baby) blush(g, 10, 22, headY + 4);
  ink(g, 16, headY + (baby ? 5 : 4), "shade");

  feet(g, bodyY + 5, baby ? 4.4 : 5.4);
  if (kind === "elder") spark(g, 25, 8);
  return finish(g);
}

export const MASKOZ_STAGES: Record<string, CreatureFrames> = {
  baby: makeAnims(maskoz("baby")),
  child: makeAnims(maskoz("child")),
  teen: makeAnims(maskoz("teen")),
  adult: makeAnims(maskoz("adult")),
  elder: makeAnims(maskoz("elder")),
};
