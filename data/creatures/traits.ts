import { extraBlush, extraSparkle, stamp } from "./parse";
import { canvas, ink } from "./draw";
import type { Genetics } from "@/lib/types";
import type { CreatureFrames, PixelFrame } from "./types";

function overlay(paint: (g: PixelFrame) => void): PixelFrame {
  const g = canvas();
  paint(g);
  return g;
}

const HORNS = overlay((g) => {
  ink(g, 10, 4, "accent");
  ink(g, 10, 5, "accent");
  ink(g, 22, 4, "accent");
  ink(g, 22, 5, "accent");
});

const ANTENNA = overlay((g) => {
  ink(g, 10, 5, "accent");
  ink(g, 9, 4, "accent");
  ink(g, 9, 3, "accent");
  ink(g, 22, 5, "accent");
  ink(g, 23, 4, "accent");
  ink(g, 23, 3, "accent");
});

const BOW = overlay((g) => {
  for (const [x, y] of [
    [21, 6],
    [22, 6],
    [23, 6],
    [22, 7],
    [21, 8],
    [22, 8],
    [23, 8],
  ] as const) {
    ink(g, x, y, "accent");
  }
});

const STICKER = overlay((g) => {
  ink(g, 21, 21, "accent");
  ink(g, 20, 22, "accent");
  ink(g, 22, 22, "accent");
  ink(g, 21, 23, "accent");
});

const FRECKLES = overlay((g) => {
  ink(g, 11, 16, "blush");
  ink(g, 21, 16, "blush");
  ink(g, 10, 17, "blush");
  ink(g, 22, 17, "blush");
});

const DROOP = overlay((g) => {
  ink(g, 7, 9, "shade");
  ink(g, 6, 10, "shade");
  ink(g, 25, 9, "shade");
  ink(g, 26, 10, "shade");
});

function mapFrames(frames: CreatureFrames, fn: (f: PixelFrame) => PixelFrame): CreatureFrames {
  const keys = Object.keys(frames) as (keyof CreatureFrames)[];
  const next = { ...frames };
  for (const k of keys) next[k] = frames[k].map(fn);
  return next;
}

export function applyGenetics(frames: CreatureFrames, genetics?: Genetics | null): CreatureFrames {
  if (!genetics) return frames;
  return mapFrames(frames, (frame) => {
    let out = frame;
    if (genetics.earForm === "antenli") out = stamp(out, ANTENNA);
    if (genetics.earForm === "dusuk") out = stamp(out, DROOP);
    if (genetics.signature === "kalp_yanak") out = extraBlush(out);
    if (genetics.signature === "yildiz_parilti") out = extraSparkle(out);
    if (genetics.signature === "minik_boynuz") out = stamp(out, HORNS);
    if (genetics.accessory === "fiyonk") out = stamp(out, BOW);
    if (genetics.accessory === "yildiz_cikartma") out = stamp(out, STICKER);
    if (genetics.accessory === "cil") out = stamp(out, FRECKLES);
    return out;
  });
}
