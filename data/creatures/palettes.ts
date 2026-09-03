import type { SpeciesId } from "@/lib/types";
import type { Palette } from "./types";

export const SHELL: Pick<Palette, "shell" | "shellShade" | "outline" | "eye" | "highlight" | "lid" | "belly"> =
  {
    shell: "#F3E6C8",
    shellShade: "#D7C197",
    outline: "#3A2A22",
    eye: "#1A1020",
    highlight: "#FFFFFF",
    lid: "#4A3040",
    belly: "#FFF6E8",
  };

export const PALETTES: Record<SpeciesId, Palette> = {
  tofiby: {
    body: "#FF3E9E",
    shade: "#C41E72",
    belly: "#FFE6F3",
    eye: "#1A1020",
    highlight: "#FFFFFF",
    blush: "#FF8AB8",
    outline: "#3B1028",
    accent: "#FF7EB5",
    lid: "#4A2038",
    shell: SHELL.shell,
    shellShade: SHELL.shellShade,
    speckle: "#FF3E9E",
  },
  bulut: {
    body: "#B084FF",
    shade: "#7A54C8",
    belly: "#F0E6FF",
    eye: "#1A1020",
    highlight: "#FFFFFF",
    blush: "#D4B0FF",
    outline: "#2A1848",
    accent: "#E2C6FF",
    lid: "#3A2860",
    shell: SHELL.shell,
    shellShade: SHELL.shellShade,
    speckle: "#B084FF",
  },
  yildiz: {
    body: "#39FFC0",
    shade: "#1FB88A",
    belly: "#E4FFF5",
    eye: "#102018",
    highlight: "#FFFFFF",
    blush: "#7DFFD4",
    outline: "#0C2A22",
    accent: "#C8FFE8",
    lid: "#1A4034",
    shell: SHELL.shell,
    shellShade: SHELL.shellShade,
    speckle: "#39FFC0",
  },
  gizem: {
    body: "#1A1625",
    shade: "#0C0A12",
    belly: "#2A2438",
    eye: "#FFC53A",
    highlight: "#FFF4C2",
    blush: "#FF8A3A",
    outline: "#000000",
    accent: "#FF9F1C",
    lid: "#5A3A10",
    shell: SHELL.shell,
    shellShade: SHELL.shellShade,
    speckle: "#FFC53A",
  },
  isilti: {
    body: "#FFB347",
    shade: "#E07A2F",
    belly: "#FFE7C2",
    eye: "#1A1020",
    highlight: "#FFFFFF",
    blush: "#FF7A6E",
    outline: "#3A1C10",
    accent: "#FFF1A8",
    lid: "#4A2818",
    shell: SHELL.shell,
    shellShade: SHELL.shellShade,
    speckle: "#FFB347",
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
