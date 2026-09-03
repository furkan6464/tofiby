import { GRID, type PaletteKey, type Pixel, type PixelFrame } from "./types";

const CHAR: Record<string, PaletteKey | null> = {
  ".": null,
  B: "body",
  S: "shade",
  C: "belly",
  E: "eye",
  W: "highlight",
  H: "blush",
  O: "outline",
  A: "accent",
  K: "shell",
  D: "shellShade",
  P: "speckle",
  L: "lid",
};

export function parseFrame(art: string): PixelFrame {
  const raw = art.replace(/^\n/, "").replace(/\n$/, "").split("\n");
  const lines = raw.map((l) => l.replace(/\r/g, ""));
  while (lines.length < GRID) lines.push(".".repeat(GRID));
  if (lines.length > GRID) {
    throw new Error(`Frame must be ${GRID} rows, got ${lines.length}`);
  }
  return lines.map((line) => {
    const padded = line.length < GRID ? line.padEnd(GRID, ".") : line;
    if (padded.length !== GRID) {
      throw new Error(`Row length ${padded.length} !== ${GRID}: "${line}"`);
    }
    return padded.split("").map((ch) => {
      if (!(ch in CHAR)) throw new Error(`Unknown pixel char "${ch}"`);
      return CHAR[ch];
    });
  });
}

export function shiftFrame(frame: PixelFrame, dx: number, dy: number): PixelFrame {
  const empty: PixelFrame = Array.from({ length: GRID }, () =>
    Array<Pixel>(GRID).fill(null),
  );
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) {
        empty[ny][nx] = frame[y][x];
      }
    }
  }
  return empty;
}

export function stamp(
  base: PixelFrame,
  overlay: PixelFrame,
): PixelFrame {
  return base.map((row, y) =>
    row.map((cell, x) => overlay[y][x] ?? cell),
  );
}

const ZZZ: PixelFrame = parseFrame(`
....................
....................
..............AAA...
...............A....
............AAA.....
....................
....................
....................
....................
....................
....................
....................
....................
....................
....................
....................
....................
....................
....................
....................
`);

export function withZzz(frame: PixelFrame): PixelFrame {
  return stamp(frame, ZZZ);
}

export function closeEyes(frame: PixelFrame): PixelFrame {
  return frame.map((row) =>
    row.map((cell) => {
      if (cell === "eye" || cell === "highlight") return "lid";
      return cell;
    }),
  );
}

export function halfEyes(frame: PixelFrame): PixelFrame {
  return frame.map((row, y, arr) =>
    row.map((cell, x) => {
      if (cell !== "eye" && cell !== "highlight") return cell;
      const above = y > 0 ? arr[y - 1][x] : null;
      if (above === "eye" || above === "highlight") return "lid";
      return cell === "highlight" ? "eye" : cell;
    }),
  );
}

export function extraBlush(frame: PixelFrame): PixelFrame {
  const next = frame.map((row) => row.slice());
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (frame[y][x] === "blush") {
        if (y + 1 < GRID && next[y + 1][x] === "body") next[y + 1][x] = "blush";
      }
    }
  }
  return next;
}

export function lookShift(frame: PixelFrame, dir: -1 | 1): PixelFrame {
  const moved = frame.map((row) => row.slice());
  for (let y = 0; y < GRID; y++) {
    const eyes: { x: number; cell: Pixel }[] = [];
    for (let x = 0; x < GRID; x++) {
      if (rowHasEye(frame[y][x])) eyes.push({ x, cell: frame[y][x] });
    }
    if (eyes.length === 0) continue;
    for (const e of eyes) moved[y][e.x] = "body";
    for (const e of eyes) {
      const nx = e.x + dir;
      if (nx >= 0 && nx < GRID && (moved[y][nx] === "body" || moved[y][nx] === "belly")) {
        moved[y][nx] = e.cell;
      } else {
        moved[y][e.x] = e.cell;
      }
    }
  }
  return moved;
}

export function extraSparkle(frame: PixelFrame): PixelFrame {
  const next = frame.map((row) => row.slice());
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (frame[y][x] === "highlight") {
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) {
            if (next[ny][nx] === "eye") next[ny][nx] = "highlight";
          }
        }
      }
    }
  }
  return next;
}

const SICK: PixelFrame = parseFrame(`
....................
....................
....................
....................
....................
....................
....................
....................
....................
....................
................A...
...............AA...
................A...
................A...
..............AAA...
....................
....................
....................
....................
....................
`);

const SCARF: PixelFrame = parseFrame(`
....................
....................
....................
....................
....................
....................
....................
....................
....................
....................
....................
.........AAAA.......
........A....A......
....................
....................
....................
....................
....................
....................
....................
`);

export function withSick(frame: PixelFrame): PixelFrame {
  return stamp(stamp(halfEyes(frame), SCARF), SICK);
}

function rowHasEye(cell: Pixel) {
  return cell === "eye" || cell === "highlight";
}
