import type { SpeciesId } from "@/lib/types";
import type { Palette } from "./types";

/** Shared warm shell — never as dark as the creature. */
export const SHELL: Pick<Palette, "shell" | "shellShade" | "outline" | "eye" | "highlight" | "lid" | "belly"> =
  {
    shell: "#FFE7C4",
    shellShade: "#F0C48A",
    outline: "#C48A4A",
    eye: "#2A1840",
    highlight: "#FFFFFF",
    lid: "#5A3860",
    belly: "#FFF8EE",
  };

export const PALETTES: Record<SpeciesId, Palette> = {
  tofiby: {
    body: "#FF5BA8",
    shade: "#E02E7A",
    belly: "#FFE4F4",
    eye: "#3A1048",
    highlight: "#FFFFFF",
    blush: "#FF8EC4",
    outline: "#8A1848",
    accent: "#FFC857",
    lid: "#5A2048",
    shell: SHELL.shell,
    shellShade: SHELL.shellShade,
    speckle: "#FF5BA8",
  },
  bulut: {
    body: "#C9A6FF",
    shade: "#8E6AD8",
    belly: "#F6EEFF",
    eye: "#1E2A6A",
    highlight: "#FFFFFF",
    blush: "#E2C4FF",
    outline: "#4A2A88",
    accent: "#FFE36A",
    lid: "#3A3878",
    shell: SHELL.shell,
    shellShade: SHELL.shellShade,
    speckle: "#C9A6FF",
  },
  yildiz: {
    body: "#3EE8B0",
    shade: "#1BB888",
    belly: "#E8FFF6",
    eye: "#143028",
    highlight: "#FFFFFF",
    blush: "#8AFFD4",
    outline: "#0C5A44",
    accent: "#FFD24A",
    lid: "#1A5040",
    shell: SHELL.shell,
    shellShade: SHELL.shellShade,
    speckle: "#3EE8B0",
  },
  gizem: {
    body: "#FFB45A",
    shade: "#E07A28",
    belly: "#FFE7C2",
    eye: "#2A1848",
    highlight: "#FFFFFF",
    blush: "#FF8A6A",
    outline: "#8A4010",
    accent: "#2ED4C8",
    lid: "#4A2860",
    shell: SHELL.shell,
    shellShade: SHELL.shellShade,
    speckle: "#2ED4C8",
  },
  isilti: {
    body: "#FFB347",
    shade: "#E07A2F",
    belly: "#FFF0C8",
    eye: "#3A1810",
    highlight: "#FFFFFF",
    blush: "#FF7A6E",
    outline: "#8A3A14",
    accent: "#FFF36A",
    lid: "#5A2818",
    shell: SHELL.shell,
    shellShade: SHELL.shellShade,
    speckle: "#FFF36A",
  },
};

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

const HUE_KEYS: (keyof Palette)[] = [
  "body",
  "shade",
  "belly",
  "blush",
  "accent",
  "speckle",
];

export function tintPalette(base: Palette, targetHue: number): Palette {
  const body = hexToRgb(base.body);
  const current = rgbToHsl(body.r, body.g, body.b).h;
  const delta = targetHue - current;
  const next = { ...base };
  for (const key of HUE_KEYS) {
    const { r, g, b } = hexToRgb(base[key]);
    const hsl = rgbToHsl(r, g, b);
    if (hsl.s < 0.08) continue;
    const shifted = hslToRgb((hsl.h + delta + 360) % 360, hsl.s, hsl.l);
    next[key] = rgbToHex(shifted.r, shifted.g, shifted.b);
  }
  return next;
}
