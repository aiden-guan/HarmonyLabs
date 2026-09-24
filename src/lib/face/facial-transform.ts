/**
 * Head orientation from a MediaPipe Face Landmarker facial transformation matrix.
 *
 * Installed package: `@mediapipe/tasks-vision` 0.10.35.
 * The JS binding copies `MatrixData.packed_data` (proto field 3) into `data`
 * and drops `layout` (proto field 4). That proto stores values in column-major
 * order by default, which matches Eigen and the Java FaceLandmarkerResult
 * contract for this version. The mathematical last row is `[0 0 0 1]`;
 * translation lives in the last column.
 *
 * The reported yaw is flipped relative to a right-handed Y-up rotation so it
 * matches `estimatePose`: positive yaw means the subject's left side is closer
 * to the camera (nose toward image-left in the unmirrored frame). Mirrored
 * preview direction is applied later, not here.
 */

export interface FacialMatrix {
  rows: number;
  columns: number;
  data: number[];
}

export interface FacialAngles {
  /** Degrees. Positive: subject's left side is closer to the camera. */
  yaw: number;
  /** Degrees. Positive: right-handed rotation about camera +X (Y up). */
  pitch: number;
  /** Degrees. Positive: right-handed rotation about camera +Z. */
  roll: number;
}

interface VisionMatrix {
  rows?: number;
  columns?: number;
  data?: ArrayLike<number>;
}

export function facialMatricesFromVision(matrices: VisionMatrix[] | undefined): FacialMatrix[] {
  if (!matrices) return [];
  return matrices.map((matrix) => ({
    rows: matrix.rows ?? 0,
    columns: matrix.columns ?? 0,
    data: Array.from(matrix.data ?? [], (value) => Number(value)),
  }));
}

function degrees(radians: number): number | null {
  if (!Number.isFinite(radians)) return null;
  return (radians * 180) / Math.PI;
}

function hypot3(x: number, y: number, z: number): number {
  return Math.hypot(x, y, z);
}

function det3(r: number[][]): number {
  return (
    r[0][0] * (r[1][1] * r[2][2] - r[1][2] * r[2][1]) -
    r[0][1] * (r[1][0] * r[2][2] - r[1][2] * r[2][0]) +
    r[0][2] * (r[1][0] * r[2][1] - r[1][1] * r[2][0])
  );
}

/**
 * Euler angles from a column-major 4×4 facial transformation matrix.
 * Returns null when the matrix is missing, the wrong shape, or not a
 * column-major rigid pose (so callers can fall back to landmark geometry).
 */
export function extractFacialOrientation(matrix: FacialMatrix | null | undefined): FacialAngles | null {
  if (!matrix || matrix.rows !== 4 || matrix.columns !== 4 || matrix.data.length !== 16) return null;
  const data = matrix.data;
  if (data.some((value) => !Number.isFinite(value))) return null;

  // Last row of a column-major pose is [0, 0, 0, 1]. A row-major copy puts
  // translation in those slots and is rejected instead of being reinterpreted.
  if (Math.abs(data[3]) > 0.25 || Math.abs(data[7]) > 0.25 || Math.abs(data[11]) > 0.25 || Math.abs(data[15] - 1) > 0.25) {
    return null;
  }

  const columns = [0, 1, 2].map((col) => {
    const x = data[col * 4];
    const y = data[col * 4 + 1];
    const z = data[col * 4 + 2];
    const norm = hypot3(x, y, z);
    return { x, y, z, norm };
  });
  if (columns.some((column) => column.norm < 1e-4)) return null;
  const mean = (columns[0].norm + columns[1].norm + columns[2].norm) / 3;
  if (columns.some((column) => column.norm / mean > 1.35 || mean / column.norm > 1.35)) return null;

  const rotation = columns.map((column) => [column.x / column.norm, column.y / column.norm, column.z / column.norm]);
  const r = [
    [rotation[0][0], rotation[1][0], rotation[2][0]],
    [rotation[0][1], rotation[1][1], rotation[2][1]],
    [rotation[0][2], rotation[1][2], rotation[2][2]],
  ];
  if (det3(r) < 0.5) return null;

  // R = Ry(yaw) * Rx(pitch) * Rz(roll), Y up, camera looking down -Z.
  const pitch = degrees(Math.atan2(-r[1][2], Math.hypot(r[0][2], r[2][2])));
  const yawMath = degrees(Math.atan2(r[0][2], r[2][2]));
  const roll = degrees(Math.atan2(r[1][0], r[1][1]));
  if (pitch === null || yawMath === null || roll === null) return null;
  return { yaw: -yawMath, pitch, roll };
}
