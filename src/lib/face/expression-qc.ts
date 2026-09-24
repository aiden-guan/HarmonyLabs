export interface ExpressionSignals {
  jawOpen?: number;
  mouthSmileLeft?: number;
  mouthSmileRight?: number;
  mouthPucker?: number;
  eyeBlinkLeft?: number;
  eyeBlinkRight?: number;
}

export interface ExpressionCheck {
  neutral: boolean | null;
  warnings: string[];
}

/**
 * Blendshapes are capture QC only. They are not attractiveness metrics.
 * Missing coefficients mean the check is skipped.
 */
export function checkNeutralExpression(signals: ExpressionSignals | null | undefined): ExpressionCheck {
  if (!signals) return { neutral: null, warnings: [] };
  const warnings: string[] = [];
  const jaw = signals.jawOpen ?? 0;
  const smile = Math.max(signals.mouthSmileLeft ?? 0, signals.mouthSmileRight ?? 0);
  const pucker = signals.mouthPucker ?? 0;
  const blink = Math.max(signals.eyeBlinkLeft ?? 0, signals.eyeBlinkRight ?? 0);
  if (jaw > 0.25) warnings.push("The jaw looks open. A neutral capture keeps the lips gently together.");
  if (smile > 0.35) warnings.push("A smile is showing. Relax the mouth for the measurement.");
  if (pucker > 0.4) warnings.push("The lips look pursed. Let them rest together.");
  if (blink > 0.55) warnings.push("The eyes look closed. Keep them naturally open.");
  return { neutral: warnings.length === 0, warnings };
}

export function expressionFromBlendshapes(
  categories: Array<{ categoryName?: string; score?: number }> | null | undefined,
): ExpressionSignals | null {
  if (!categories || categories.length === 0) return null;
  const score = (name: string) => categories.find((item) => item.categoryName === name)?.score;
  return {
    jawOpen: score("jawOpen"),
    mouthSmileLeft: score("mouthSmileLeft"),
    mouthSmileRight: score("mouthSmileRight"),
    mouthPucker: score("mouthPucker"),
    eyeBlinkLeft: score("eyeBlinkLeft"),
    eyeBlinkRight: score("eyeBlinkRight"),
  };
}
