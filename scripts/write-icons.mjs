import { deflateSync } from "zlib";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const cx = size / 2;
  const r = size * 0.34;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cx + size * 0.04;
      const d = Math.sqrt(dx * dx + dy * dy);
      const i = y * (size * 3 + 1) + 1 + x * 3;
      if (d < r) {
        raw[i] = 255;
        raw[i + 1] = 62;
        raw[i + 2] = 158;
      } else {
        raw[i] = 7;
        raw[i + 1] = 6;
        raw[i + 2] = 11;
      }
      if (d < r * 0.18 && Math.abs(dx) > r * 0.16 && dy < -r * 0.05 && dy > -r * 0.38) {
        raw[i] = 26;
        raw[i + 1] = 16;
        raw[i + 2] = 32;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(join(dir, "icon-192.png"), png(192));
writeFileSync(join(dir, "icon-512.png"), png(512));
console.log("icons written");
