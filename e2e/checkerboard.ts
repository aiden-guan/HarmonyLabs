import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  const signed = Buffer.concat([name, Buffer.from(data)]);
  crc.writeUInt32BE(crc32(signed), 0);
  return Buffer.concat([length, signed, crc]);
}

/** High-contrast diagram so the quality check does not reject the fixture as blur. */
export function writeCheckerboards(directory: string) {
  mkdirSync(directory, { recursive: true });
  for (const name of ["front.png", "profile.png"]) {
    writeFileSync(path.join(directory, name), checkerboard(240, 320));
  }
}

function checkerboard(width: number, height: number): Buffer {
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y += 1) {
    const offset = y * rowSize;
    raw[offset] = 0;
    for (let x = 0; x < width; x += 1) {
      const dark = (Math.floor(x / 12) + Math.floor(y / 12)) % 2 === 0;
      const pixel = offset + 1 + x * 4;
      const value = dark ? 28 : 210;
      raw[pixel] = value;
      raw[pixel + 1] = value;
      raw[pixel + 2] = dark ? 40 : 220;
      raw[pixel + 3] = 255;
    }
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
