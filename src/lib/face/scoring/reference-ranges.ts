import type { ReferenceConfidence } from "@/types/face";

export interface ReferenceConfig {
  min: number;
  max: number;
  idealMin: number;
  idealMax: number;
  sigma: number;
  weight: number;
  source: string;
  confidence: ReferenceConfidence;
}

const experimental = (
  note: string,
  values: Omit<ReferenceConfig, "source" | "confidence">,
): ReferenceConfig => ({
  ...values,
  confidence: "experimental",
  source: `Experimental MogLabs band. ${note} These limits are application choices, not a clinical dataset.`,
});

/** Usual band with the middle half marked ideal. */
function inset(
  note: string,
  min: number,
  max: number,
  sigma: number,
  weight: number,
): ReferenceConfig {
  const pad = (max - min) * 0.25;
  return experimental(note, {
    min,
    max,
    idealMin: min + pad,
    idealMax: max - pad,
    sigma,
    weight,
  });
}

/** Zero is the ideal end. Higher values leave the usual range. */
function low(
  note: string,
  max: number,
  idealMax: number,
  sigma: number,
  weight: number,
): ReferenceConfig {
  return experimental(note, { min: 0, max, idealMin: 0, idealMax, sigma, weight });
}

function span(
  note: string,
  min: number,
  max: number,
  idealMin: number,
  idealMax: number,
  sigma: number,
  weight: number,
): ReferenceConfig {
  return experimental(note, { min, max, idealMin, idealMax, sigma, weight });
}

/**
 * Central reference configuration.
 * The usual band is what scores 10. The ideal band is the middle of that
 * range, or the low end when smaller means more symmetric.
 * Replace entries later with literature-derived, sex-specific, or age-specific
 * tables without changing metric formulas.
 */
export const referenceRanges: Record<string, ReferenceConfig> = {
  "facial-width-height": inset(
    "Width-to-height uses lateral face points and the mesh forehead, not caliper bizygomatic breadth or the hairline.",
    0.64,
    0.8,
    0.05,
    1.2,
  ),
  "upper-third": inset(
    "Loosely aligned with roughly equal thirds, measured from the mesh forehead apex rather than the hairline.",
    0.3,
    0.37,
    0.03,
    0.7,
  ),
  "middle-third": inset(
    "Loosely aligned with a middle third close to one third of the mesh forehead-to-chin span.",
    0.3,
    0.37,
    0.03,
    0.7,
  ),
  "lower-third": inset(
    "Loosely aligned with a lower third close to one third of the mesh forehead-to-chin span.",
    0.3,
    0.37,
    0.03,
    0.9,
  ),
  "jaw-cheek-ratio": inset(
    "Compares an approximate jaw-angle width with the lateral face width.",
    0.7,
    0.86,
    0.05,
    1,
  ),
  "chin-height-ratio": inset(
    "Share of the lower face that sits below the mouth opening.",
    0.6,
    0.74,
    0.04,
    0.9,
  ),
  "lower-middle-ratio": inset(
    "Compares the lower third with the middle third. Near 1 means those two spans are similar.",
    0.85,
    1.2,
    0.1,
    0.6,
  ),
  "intercanthal-face-ratio": inset(
    "Inner eye-corner distance relative to lateral face width.",
    0.18,
    0.24,
    0.02,
    0.9,
  ),
  "interpupillary-face-ratio": inset(
    "Pupil-center distance relative to lateral face width.",
    0.42,
    0.5,
    0.025,
    1,
  ),
  "eye-spacing-ratio": inset(
    "Inner eye-corner distance divided by mean eye width. Values near 1 mean the gap is similar to one eye width.",
    0.9,
    1.15,
    0.08,
    1,
  ),
  "eye-width-symmetry": low(
    "Percent difference between the two eye widths. Lower is more symmetric.",
    6,
    2,
    3,
    0.8,
  ),
  "eye-height-symmetry": low(
    "Percent difference between the two eye heights. Lower is more symmetric.",
    8,
    2.5,
    4,
    0.7,
  ),
  "canthal-tilt": span(
    "Average outer-canthus elevation in degrees. Positive means the outer corner sits higher in the photo.",
    0,
    8,
    3,
    7,
    4,
    0.55,
  ),
  "eye-face-width": inset(
    "Mean eye width divided by lateral face width.",
    0.16,
    0.22,
    0.02,
    0.8,
  ),
  "nasal-width-face": inset(
    "Alar width divided by lateral face width.",
    0.22,
    0.29,
    0.025,
    0.9,
  ),
  "nasal-width-intercanthal": inset(
    "Alar width divided by inner eye-corner distance. Values near 1 mean those spans are similar.",
    0.9,
    1.12,
    0.07,
    1,
  ),
  "nasal-length-ratio": inset(
    "Nasal-root to nose-base length divided by mesh forehead-to-chin height.",
    0.27,
    0.36,
    0.03,
    0.8,
  ),
  "nasal-alar-level": low(
    "Vertical mismatch of the two alar points, as a percent of alar width.",
    5,
    1.5,
    2.5,
    0.7,
  ),
  "mouth-width-ipd": inset(
    "Mouth-corner width divided by interpupillary distance.",
    0.75,
    0.98,
    0.07,
    0.9,
  ),
  "lip-height-ratio": inset(
    "Upper vermilion height divided by lower vermilion height.",
    0.45,
    0.85,
    0.12,
    0.8,
  ),
  "philtrum-proportion": inset(
    "Subnasale-to-upper-lip distance divided by subnasale-to-chin distance.",
    0.25,
    0.38,
    0.04,
    0.7,
  ),
  "chin-jaw-width": inset(
    "Lateral chin width divided by approximate jaw-angle width.",
    0.68,
    0.92,
    0.07,
    0.8,
  ),
  "jaw-level-symmetry": low(
    "Vertical mismatch of the jaw-angle points, as a percent of facial height.",
    4,
    1.2,
    2.2,
    0.8,
  ),
  "eye-level-asymmetry": low(
    "Vertical mismatch of the pupils, as a percent of interpupillary distance.",
    3.5,
    1,
    2,
    0.85,
  ),
  "nasal-midline-deviation": low(
    "Horizontal offset of the nose tip from the pupil midline, as a percent of face width.",
    2.5,
    0.8,
    1.6,
    0.9,
  ),
  "mouth-level-asymmetry": low(
    "Vertical mismatch of the mouth corners, as a percent of mouth width.",
    4,
    1.2,
    2.2,
    0.8,
  ),
  "chin-midline-deviation": low(
    "Horizontal offset of menton from the pupil midline, as a percent of face width.",
    2.5,
    0.8,
    1.6,
    0.85,
  ),
  "facial-convexity": span(
    "Angle at subnasale between glabella and pogonion. A straight profile is 180°. The ideal sits near 168°, the soft-tissue convexity often used in profile photographs.",
    160,
    178,
    166,
    174,
    7,
    1.1,
  ),
  "nasofrontal-angle": span(
    "Angle at nasion between glabella and the nasal bridge. The usual photographic range centers near 125°.",
    115,
    140,
    120,
    132,
    8,
    0.9,
  ),
  "nasofacial-angle": span(
    "Smaller angle between the nasal bridge and the glabella–pogonion line. Often cited near 30–40°.",
    28,
    42,
    32,
    38,
    6,
    1,
  ),
  "nasolabial-angle": span(
    "Angle at subnasale between the columella and the upper lip. Men tend lower and women higher, so the ideal here is the shared middle.",
    90,
    115,
    96,
    110,
    8,
    1,
  ),
  "mentolabial-angle": span(
    "Angle at the chin fold between the lower lip and pogonion.",
    108,
    140,
    118,
    132,
    10,
    0.9,
  ),
  "nasal-projection": span(
    "Distance from the nose tip to the nasion–subnasale line, divided by nasion–pronasale length.",
    0.25,
    0.55,
    0.36,
    0.48,
    0.08,
    0.9,
  ),
  "chin-projection": span(
    "Signed anterior offset of pogonion from the glabella–menton line, divided by lower-face height. Positive is a chin point in front of that line.",
    -0.02,
    0.14,
    0.02,
    0.09,
    0.05,
    1,
  ),
};
