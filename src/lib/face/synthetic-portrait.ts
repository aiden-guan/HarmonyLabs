import { deflateSync } from "node:zlib";
import type { FaceView } from "@/types/face";
import { SAMPLE_FRONT, SAMPLE_PROFILE } from "@/fixtures/sample-face";

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

export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const offset = y * (width * 4 + 1);
    raw[offset] = 0;
    rgba.subarray(y * width * 4, (y + 1) * width * 4).forEach((value, index) => {
      raw[offset + 1 + index] = value;
    });
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array()),
  ]);
}

function setPixel(
  rgba: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  color: [number, number, number],
) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= width || py >= height) return;
  const index = (py * width + px) * 4;
  rgba[index] = color[0];
  rgba[index + 1] = color[1];
  rgba[index + 2] = color[2];
  rgba[index + 3] = 255;
}

function fill(rgba: Uint8Array, color: [number, number, number]) {
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = color[0];
    rgba[i + 1] = color[1];
    rgba[i + 2] = color[2];
    rgba[i + 3] = 255;
  }
}

function disc(
  rgba: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  color: [number, number, number],
) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= cy + radius; y += 1) {
    for (let x = Math.floor(cx - radius); x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) setPixel(rgba, width, height, x, y, color);
    }
  }
}

function line(
  rgba: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: [number, number, number],
) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    setPixel(rgba, width, height, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, color);
  }
}

export function renderSamplePortrait(view: FaceView): { bytes: Buffer; width: number; height: number } {
  const width = 640;
  const height = 800;
  const rgba = new Uint8Array(width * height * 4);
  fill(rgba, [231, 237, 242]);
  const points = view === "front" ? SAMPLE_FRONT : SAMPLE_PROFILE;
  const px = (key: string) => {
    const point = points[key as keyof typeof points];
    if (!point) return null;
    return { x: point[0] * (width - 1), y: point[1] * (height - 1) };
  };
  const ink: [number, number, number] = [20, 32, 43];
  const skin: [number, number, number] = [244, 236, 228];
  if (view === "front") {
    disc(rgba, width, height, width / 2, height * 0.52, 210, skin);
  } else {
    disc(rgba, width, height, width * 0.48, height * 0.54, 190, skin);
  }
  for (const key of Object.keys(points)) {
    const point = px(key);
    if (!point) continue;
    line(rgba, width, height, point.x - 5, point.y, point.x + 5, point.y, ink);
    line(rgba, width, height, point.x, point.y - 5, point.x, point.y + 5, ink);
  }
  const bytes = encodePng(width, height, rgba);
  return { bytes, width, height };
}
