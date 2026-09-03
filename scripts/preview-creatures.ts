import { deflateSync } from "zlib";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { getCreatureArt } from "../data/creatures";
import { GRID } from "../data/creatures/types";
import { speciesHue } from "../data/species/catalog";
import type { SpeciesId } from "../lib/types";
import type { CreatureStage } from "../lib/gameConfig";

const SPECIES: SpeciesId[] = [
  "tofiby",
  "bulut",
  "yildiz",
  "ruji",
  "gizem",
  "kalyoz",
  "burku",
  "podo",
  "maskoz",
  "isilti",
];
const STAGES: CreatureStage[] = ["egg", "baby", "child", "teen", "adult", "elder"];
const SCALE = 8;
const OUT = join(process.cwd(), "scripts", "_preview");

function crc32(buf: Buffer) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(w: number, h: number, rgba: Buffer) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hexToRgba(hex: string): [number, number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function visor(frame: (string | null)[][]) {
  for (const row of frame) {
    let run = 0;
    for (const c of row) {
      if (c === "eye") {
        run += 1;
        if (run >= 5) return true;
      } else run = 0;
    }
  }
  return false;
}

mkdirSync(OUT, { recursive: true });
const sheetW = SPECIES.length * GRID * SCALE;
const sheetH = 1 * GRID * SCALE;
const babySheet = Buffer.alloc(sheetW * sheetH * 4);

let failed = false;
for (const species of SPECIES) {
  for (const stage of STAGES) {
    const art = getCreatureArt(species, stage, speciesHue(species));
    const frame = art.frames.idle[0];
    if (!frame || frame.length !== GRID || frame[0].length !== GRID) {
      console.error("bad grid", species, stage);
      failed = true;
      continue;
    }
    if (stage !== "egg" && visor(frame)) {
      console.error("VISOR", species, stage);
      failed = true;
    }
    const w = GRID * SCALE;
    const rgba = Buffer.alloc(w * w * 4);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const key = frame[y][x];
        const [r, g, b, a] = key ? hexToRgba(art.palette[key]) : [0, 0, 0, 0];
        for (let dy = 0; dy < SCALE; dy++) {
          for (let dx = 0; dx < SCALE; dx++) {
            const i = ((y * SCALE + dy) * w + (x * SCALE + dx)) * 4;
            rgba[i] = r;
            rgba[i + 1] = g;
            rgba[i + 2] = b;
            rgba[i + 3] = a;
          }
        }
      }
    }
    writeFileSync(join(OUT, `${species}-${stage}.png`), encodePng(w, w, rgba));
    if (stage === "baby") {
      const col = SPECIES.indexOf(species);
      for (let y = 0; y < w; y++) {
        rgba.copy(babySheet, (y * sheetW + col * w) * 4, y * w * 4, (y + 1) * w * 4);
      }
    }
  }
}
writeFileSync(join(OUT, "babies.png"), encodePng(sheetW, sheetH, babySheet));
if (failed) process.exit(1);
console.log("ok", OUT);
