import { GRID, type PaletteKey, type Pixel, type PixelFrame } from "./types";

export function canvas(): PixelFrame {
  return Array.from({ length: GRID }, () => Array<Pixel>(GRID).fill(null));
}

export function ink(g: PixelFrame, x: number, y: number, key: PaletteKey) {
  if (x >= 0 && x < GRID && y >= 0 && y < GRID) g[y][x] = key;
}

export function ellipse(
  g: PixelFrame,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  key: PaletteKey,
) {
  const x0 = Math.floor(cx - rx);
  const x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry);
  const y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) ink(g, x, y, key);
    }
  }
}

export function shadeBottom(
  g: PixelFrame,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  band = 0.55,
) {
  const x0 = Math.floor(cx - rx);
  const x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry);
  const y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && dy > band && g[y]?.[x] === "body") ink(g, x, y, "shade");
    }
  }
}

/** Two glossy eyes with a body gap — never a visor bar. */
export function eyes(g: PixelFrame, lx: number, rx: number, y: number, r = 2) {
  ellipse(g, lx, y, r, r, "eye");
  ellipse(g, rx, y, r, r, "eye");
  ink(g, lx - 1, y - 1, "highlight");
  ink(g, rx - 1, y - 1, "highlight");
}

export function blush(g: PixelFrame, lx: number, rx: number, y: number) {
  ink(g, lx, y, "blush");
  ink(g, lx + 1, y, "blush");
  ink(g, rx, y, "blush");
  ink(g, rx - 1, y, "blush");
}

const OUTLINE_FROM = new Set<PaletteKey>([
  "body",
  "shade",
  "belly",
  "accent",
  "shell",
  "shellShade",
  "speckle",
  "lid",
]);

export function outline(g: PixelFrame): PixelFrame {
  const next = g.map((row) => row.slice());
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (g[y][x] !== null) continue;
      const hit = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([nx, ny]) => {
        if (ny < 0 || ny >= GRID || nx < 0 || nx >= GRID) return false;
        const c = g[ny][nx];
        return c !== null && OUTLINE_FROM.has(c);
      });
      if (hit) next[y][x] = "outline";
    }
  }
  return next;
}

export function spark(g: PixelFrame, x: number, y: number) {
  ink(g, x, y, "accent");
  ink(g, x - 1, y, "accent");
  ink(g, x + 1, y, "accent");
  ink(g, x, y - 1, "accent");
  ink(g, x, y + 1, "accent");
}

export function heart(g: PixelFrame, cx: number, cy: number, key: PaletteKey = "blush") {
  ink(g, cx - 1, cy, key);
  ink(g, cx + 1, cy, key);
  ink(g, cx, cy + 1, key);
}

export function feet(g: PixelFrame, cy: number, spread = 5) {
  ellipse(g, 16 - spread, cy, 2.2, 1.4, "body");
  ellipse(g, 16 + spread, cy, 2.2, 1.4, "body");
}

export function finish(g: PixelFrame): PixelFrame {
  return outline(g);
}
