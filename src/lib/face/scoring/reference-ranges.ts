import type { ReferenceConfidence } from "@/types/face";

export interface ReferenceConfig {
  min: number;
  max: number;
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
  source: `Experimental FaceLab band. ${note} These limits are application choices, not a clinical dataset.`,
});

/**
 * Central reference configuration.
 * Replace entries later with literature-derived, sex-specific, or age-specific
 * tables without changing metric formulas.
 */
export const referenceRanges: Record<string, ReferenceConfig> = {
  "facial-width-height": experimental(
    "Width-to-height uses lateral face points and the mesh forehead, not caliper bizygomatic breadth or the hairline.",
    { min: 0.64, max: 0.8, sigma: 0.05, weight: 1.2 },
  ),
  "upper-third": experimental(
    "Loosely aligned with roughly equal thirds, measured from the mesh forehead apex rather than the hairline.",
    { min: 0.3, max: 0.37, sigma: 0.03, weight: 0.7 },
  ),
  "middle-third": experimental(
    "Loosely aligned with a middle third close to one third of the mesh forehead-to-chin span.",
    { min: 0.3, max: 0.37, sigma: 0.03, weight: 0.7 },
  ),
  "lower-third": experimental(
    "Loosely aligned with a lower third close to one third of the mesh forehead-to-chin span.",
    { min: 0.3, max: 0.37, sigma: 0.03, weight: 0.9 },
  ),
  "jaw-cheek-ratio": experimental(
    "Compares an approximate jaw-angle width with the lateral face width.",
    { min: 0.7, max: 0.86, sigma: 0.05, weight: 1 },
  ),
  "chin-height-ratio": experimental(
    "Share of the lower face that sits below the mouth opening.",
    { min: 0.6, max: 0.74, sigma: 0.04, weight: 0.9 },
  ),
  "lower-middle-ratio": experimental(
    "Compares the lower third with the middle third. Near 1 means those two spans are similar.",
    { min: 0.85, max: 1.2, sigma: 0.1, weight: 0.6 },
  ),
  "intercanthal-face-ratio": experimental(
    "Inner eye-corner distance relative to lateral face width.",
    { min: 0.18, max: 0.24, sigma: 0.02, weight: 0.9 },
  ),
  "interpupillary-face-ratio": experimental(
    "Pupil-center distance relative to lateral face width.",
    { min: 0.42, max: 0.5, sigma: 0.025, weight: 1 },
  ),
  "eye-spacing-ratio": experimental(
    "Inner eye-corner distance divided by mean eye width. Values near 1 mean the gap is similar to one eye width.",
    { min: 0.9, max: 1.15, sigma: 0.08, weight: 1 },
  ),
  "eye-width-symmetry": experimental(
    "Percent difference between the two eye widths. Lower is more symmetric.",
    { min: 0, max: 6, sigma: 3, weight: 0.8 },
  ),
  "eye-height-symmetry": experimental(
    "Percent difference between the two eye heights. Lower is more symmetric.",
    { min: 0, max: 8, sigma: 4, weight: 0.7 },
  ),
  "canthal-tilt": experimental(
    "Average outer-canthus elevation in degrees. Positive means the outer corner sits higher in the photo.",
    { min: 0, max: 8, sigma: 4, weight: 0.55 },
  ),
  "eye-face-width": experimental(
    "Mean eye width divided by lateral face width.",
    { min: 0.16, max: 0.22, sigma: 0.02, weight: 0.8 },
  ),
  "nasal-width-face": experimental(
    "Alar width divided by lateral face width.",
    { min: 0.22, max: 0.29, sigma: 0.025, weight: 0.9 },
  ),
  "nasal-width-intercanthal": experimental(
    "Alar width divided by inner eye-corner distance. Values near 1 mean those spans are similar.",
    { min: 0.9, max: 1.12, sigma: 0.07, weight: 1 },
  ),
  "nasal-length-ratio": experimental(
    "Nasal-root to nose-base length divided by mesh forehead-to-chin height.",
    { min: 0.27, max: 0.36, sigma: 0.03, weight: 0.8 },
  ),
  "nasal-alar-level": experimental(
    "Vertical mismatch of the two alar points, as a percent of alar width.",
    { min: 0, max: 5, sigma: 2.5, weight: 0.7 },
  ),
  "mouth-width-ipd": experimental(
    "Mouth-corner width divided by interpupillary distance.",
    { min: 0.75, max: 0.98, sigma: 0.07, weight: 0.9 },
  ),
  "lip-height-ratio": experimental(
    "Upper vermilion height divided by lower vermilion height.",
    { min: 0.45, max: 0.85, sigma: 0.12, weight: 0.8 },
  ),
  "philtrum-proportion": experimental(
    "Subnasale-to-upper-lip distance divided by subnasale-to-chin distance.",
    { min: 0.25, max: 0.38, sigma: 0.04, weight: 0.7 },
  ),
  "chin-jaw-width": experimental(
    "Lateral chin width divided by approximate jaw-angle width.",
    { min: 0.68, max: 0.92, sigma: 0.07, weight: 0.8 },
  ),
  "jaw-level-symmetry": experimental(
    "Vertical mismatch of the jaw-angle points, as a percent of facial height.",
    { min: 0, max: 4, sigma: 2.2, weight: 0.8 },
  ),
  "eye-level-asymmetry": experimental(
    "Vertical mismatch of the pupils, as a percent of interpupillary distance.",
    { min: 0, max: 3.5, sigma: 2, weight: 0.85 },
  ),
  "nasal-midline-deviation": experimental(
    "Horizontal offset of the nose tip from the pupil midline, as a percent of face width.",
    { min: 0, max: 2.5, sigma: 1.6, weight: 0.9 },
  ),
  "mouth-level-asymmetry": experimental(
    "Vertical mismatch of the mouth corners, as a percent of mouth width.",
    { min: 0, max: 4, sigma: 2.2, weight: 0.8 },
  ),
  "chin-midline-deviation": experimental(
    "Horizontal offset of menton from the pupil midline, as a percent of face width.",
    { min: 0, max: 2.5, sigma: 1.6, weight: 0.85 },
  ),
  "facial-convexity": experimental(
    "Angle at subnasale between glabella and pogonion. 180° would be a straight profile.",
    { min: 160, max: 178, sigma: 7, weight: 1.1 },
  ),
  "nasofrontal-angle": experimental(
    "Angle at nasion between glabella and the nose tip. The band is wide on purpose.",
    { min: 115, max: 140, sigma: 8, weight: 0.9 },
  ),
  "nasofacial-angle": experimental(
    "Smaller angle between the nasal dorsum and the glabella–pogonion line.",
    { min: 28, max: 42, sigma: 6, weight: 1 },
  ),
  "nasolabial-angle": experimental(
    "Angle at subnasale between the estimated columella and the upper lip. Not sex-specific.",
    { min: 90, max: 115, sigma: 8, weight: 1 },
  ),
  "mentolabial-angle": experimental(
    "Angle at the estimated sublabiale point between the lower lip and pogonion.",
    { min: 108, max: 140, sigma: 10, weight: 0.9 },
  ),
  "nasal-projection": experimental(
    "Distance from the nose tip to the nasion–subnasale line, divided by nasion–pronasale length.",
    { min: 0.25, max: 0.55, sigma: 0.08, weight: 0.9 },
  ),
  "chin-projection": experimental(
    "Signed anterior offset of pogonion from the glabella–menton line, divided by lower-face height.",
    { min: -0.02, max: 0.14, sigma: 0.05, weight: 1 },
  ),
};
