import { describe, expect, it } from "vitest";
import { extractFacialOrientation, type FacialMatrix } from "@/lib/face/facial-transform";

function columnMajor(rows: number[][]): FacialMatrix {
  const data = new Array<number>(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) data[col * 4 + row] = rows[row][col];
  }
  return { rows: 4, columns: 4, data };
}

function rowMajor(rows: number[][]): FacialMatrix {
  return { rows: 4, columns: 4, data: rows.flat() };
}

function rx(degrees: number): number[][] {
  const t = (degrees * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [
    [1, 0, 0, 0],
    [0, c, -s, 0],
    [0, s, c, 0],
    [0, 0, 0, 1],
  ];
}

function ry(degrees: number): number[][] {
  const t = (degrees * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [
    [c, 0, s, 0],
    [0, 1, 0, 0],
    [-s, 0, c, 0],
    [0, 0, 0, 1],
  ];
}

function rz(degrees: number): number[][] {
  const t = (degrees * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [
    [c, -s, 0, 0],
    [s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

function mul(a: number[][], b: number[][]): number[][] {
  const out = Array.from({ length: 4 }, () => Array<number>(4).fill(0));
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[row][k] * b[k][col];
      out[row][col] = sum;
    }
  }
  return out;
}

/** Uniform scale plus a translation in the last column, as MediaPipe emits. */
function pose(rotation: number[][], scale = 1): number[][] {
  const scaled = rotation.map((row) => row.slice());
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) scaled[row][col] *= scale;
  }
  scaled[0][3] = 12;
  scaled[1][3] = -4;
  scaled[2][3] = -48;
  return scaled;
}

describe("facial transformation orientation", () => {
  it("reads a frontal matrix as zero yaw, pitch, and roll", () => {
    const angles = extractFacialOrientation(columnMajor(pose(ry(0), 7)));
    expect(angles).not.toBeNull();
    expect(angles?.yaw).toBeCloseTo(0, 5);
    expect(angles?.pitch).toBeCloseTo(0, 5);
    expect(angles?.roll).toBeCloseTo(0, 5);
  });

  it("reports positive and negative yaw with opposite signs", () => {
    const positive = extractFacialOrientation(columnMajor(pose(ry(-30), 6)));
    const negative = extractFacialOrientation(columnMajor(pose(ry(30), 6)));
    expect(positive?.yaw).toBeCloseTo(30, 4);
    expect(negative?.yaw).toBeCloseTo(-30, 4);
    expect(positive && negative && positive.yaw).toBeCloseTo(-(negative?.yaw ?? 0), 4);
  });

  it("reads pitch and roll from the same column-major pose", () => {
    expect(extractFacialOrientation(columnMajor(pose(rx(12), 5)))?.pitch).toBeCloseTo(12, 4);
    expect(extractFacialOrientation(columnMajor(pose(rx(-9), 5)))?.pitch).toBeCloseTo(-9, 4);
    expect(extractFacialOrientation(columnMajor(pose(rz(14), 5)))?.roll).toBeCloseTo(14, 4);
    expect(extractFacialOrientation(columnMajor(pose(rz(-8), 5)))?.roll).toBeCloseTo(-8, 4);
  });

  it("recovers a combined yaw, pitch, and roll", () => {
    const rotation = mul(mul(ry(-20), rx(10)), rz(-5));
    const angles = extractFacialOrientation(columnMajor(pose(rotation, 4)));
    expect(angles?.yaw).toBeCloseTo(20, 3);
    expect(angles?.pitch).toBeCloseTo(10, 3);
    expect(angles?.roll).toBeCloseTo(-5, 3);
  });

  it("rejects a row-major copy instead of guessing the layout", () => {
    expect(extractFacialOrientation(rowMajor(pose(ry(-25), 6)))).toBeNull();
    expect(extractFacialOrientation({ rows: 4, columns: 4, data: [1, 0, 0] })).toBeNull();
    expect(extractFacialOrientation(null)).toBeNull();
  });
});
