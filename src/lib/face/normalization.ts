/**
 * FaceLab never mixes pixel distances into a score.
 * Every metric declares one of these relationships. Ratios are dimensionless.
 * Angles are degrees. Symmetry values are percentages of a named reference span.
 */
export const NORMALIZATION = {
  widthOverHeight:
    "Euclidean facial width divided by Euclidean facial height. Both spans come from the same normalized landmark frame, so image resolution cancels out.",
  verticalShare:
    "Vertical segment divided by the sum of the vertical facial thirds in the same photograph.",
  segmentRatio:
    "One vertical or Euclidean segment divided by another segment in the same photograph.",
  widthRatio:
    "One horizontal facial span divided by another span in the same photograph.",
  symmetryPercent:
    "Absolute left/right difference divided by a reference span, expressed as a percent. Zero is symmetric.",
  angleDegrees:
    "Planar angle in degrees computed from normalized landmarks. Translation and uniform scale cancel out.",
  lineAngle:
    "Smaller angle between two lines, in degrees (0–90).",
  signedProjection:
    "Signed distance from a point to a facial reference line, divided by a vertical facial segment. Positive is anterior on a right-facing profile.",
} as const;
