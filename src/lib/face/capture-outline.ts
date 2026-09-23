/**
 * Camera outlines for the two turned poses.
 * Coordinates are fractions of a guide box.
 * A right-facing outline has the nose toward +x. The preview mirror
 * flips the whole drawing with the camera, so source-left stays source-left.
 *
 * The side path is drawn for a frame about 1.15 times as wide as it is tall,
 * which is a forehead-to-chin head with the ear behind and the nose in front.
 */

export type Facing = "left" | "right";

interface Point {
  x: number;
  y: number;
}

/** Width / height of the side guide. Matches the drawn profile. */
export const SIDE_FRAME_RATIO = 1.15;

/**
 * Landmarks the side outline is built around, in the guide box.
 * Nose ahead of the lips, brow ahead of the nasal root, chin ahead of the groove.
 */
export const SIDE_PROPORTIONS = {
  forehead: { x: 0.5, y: 0.06 },
  glabella: { x: 0.58, y: 0.2 },
  nasion: { x: 0.52, y: 0.28 },
  pronasale: { x: 0.9, y: 0.52 },
  subnasale: { x: 0.74, y: 0.6 },
  labialeSuperius: { x: 0.78, y: 0.66 },
  pogonion: { x: 0.74, y: 0.88 },
  sublabiale: { x: 0.66, y: 0.8 },
  menton: { x: 0.62, y: 0.97 },
  eye: { x: 0.46, y: 0.34 },
  tragion: { x: 0.2, y: 0.38 },
} as const;

const SIDE_OUTLINE =
  "M 0.50 0.06 C 0.60 0.02 0.66 0.10 0.62 0.18 C 0.60 0.24 0.54 0.27 0.56 0.32 C 0.64 0.38 0.74 0.44 0.82 0.49 C 0.90 0.52 0.88 0.57 0.78 0.60 C 0.74 0.62 0.76 0.65 0.80 0.67 C 0.76 0.70 0.78 0.73 0.74 0.75 C 0.68 0.80 0.70 0.85 0.76 0.89 C 0.70 0.96 0.56 0.99 0.44 0.95 C 0.28 0.90 0.16 0.76 0.14 0.62 C 0.12 0.46 0.16 0.28 0.28 0.14 C 0.36 0.06 0.42 0.03 0.50 0.06 Z";

const SIDE_EAR = "M 0.24 0.26 C 0.14 0.28 0.10 0.40 0.16 0.52 C 0.20 0.58 0.28 0.52 0.28 0.44 C 0.28 0.34 0.26 0.28 0.24 0.26";

const SIDE_BROW = "M 0.38 0.30 Q 0.46 0.27 0.54 0.30";

const THREE_QUARTER_HEAD =
  "M 0.46 0.06 C 0.62 0.02 0.76 0.10 0.80 0.26 C 0.86 0.42 0.84 0.62 0.76 0.78 C 0.68 0.94 0.50 0.99 0.40 0.92 C 0.28 0.84 0.22 0.64 0.26 0.42 C 0.28 0.24 0.34 0.10 0.46 0.06 Z";

const THREE_QUARTER_NOSE = "M 0.52 0.46 C 0.56 0.50 0.62 0.54 0.67 0.57 C 0.62 0.60 0.55 0.62 0.50 0.60";

const THREE_QUARTER_EAR = "M 0.80 0.40 C 0.92 0.42 0.94 0.56 0.84 0.66 C 0.78 0.58 0.76 0.48 0.80 0.40";

export interface SideGuide {
  ratio: number;
  outline: string;
  ear: string;
  brow: string;
  eye: { cx: number; cy: number; rx: number; ry: number };
  frankfort: { x1: number; y1: number; x2: number; y2: number };
  pronasale: Point;
  eyeCenter: Point;
}

export interface ThreeQuarterGuide {
  head: string;
  nearEye: { cx: number; cy: number; rx: number; ry: number };
  farEye: { cx: number; cy: number; rx: number; ry: number };
  nose: string;
  mouth: { x1: number; y1: number; x2: number; y2: number };
  ear: string;
}

function mirrorPath(path: string, facing: Facing): string {
  if (facing === "right") return path;
  return path.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_match, x: string, y: string) => {
    return `${(1 - Number(x)).toFixed(3)} ${y}`;
  });
}

function mirrorX(x: number, facing: Facing): number {
  return facing === "right" ? x : 1 - x;
}

export function sideGuide(facing: Facing = "right"): SideGuide {
  const eye = SIDE_PROPORTIONS.eye;
  return {
    ratio: SIDE_FRAME_RATIO,
    outline: mirrorPath(SIDE_OUTLINE, facing),
    ear: mirrorPath(SIDE_EAR, facing),
    brow: mirrorPath(SIDE_BROW, facing),
    eye: {
      cx: mirrorX(eye.x, facing),
      cy: eye.y,
      rx: 0.045,
      ry: 0.018,
    },
    frankfort: {
      x1: mirrorX(0.16, facing),
      y1: eye.y,
      x2: mirrorX(0.6, facing),
      y2: eye.y,
    },
    pronasale: {
      x: mirrorX(SIDE_PROPORTIONS.pronasale.x, facing),
      y: SIDE_PROPORTIONS.pronasale.y,
    },
    eyeCenter: { x: mirrorX(eye.x, facing), y: eye.y },
  };
}

/** A halfway turn: both eyes visible, the near eye larger, the nose off center. */
export function threeQuarterGuide(facing: Facing = "right"): ThreeQuarterGuide {
  return {
    head: mirrorPath(THREE_QUARTER_HEAD, facing),
    nearEye: { cx: mirrorX(0.62, facing), cy: 0.4, rx: 0.08, ry: 0.028 },
    farEye: { cx: mirrorX(0.4, facing), cy: 0.4, rx: 0.045, ry: 0.02 },
    nose: mirrorPath(THREE_QUARTER_NOSE, facing),
    mouth: { x1: mirrorX(0.46, facing), y1: 0.72, x2: mirrorX(0.68, facing), y2: 0.73 },
    ear: mirrorPath(THREE_QUARTER_EAR, facing),
  };
}
