/**
 * Framing proportions for the capture guide.
 * Turned views draw brackets and, at most, a generic head-sized oval.
 * They do not draw eyes, a nose, an ear, or a profile silhouette.
 */

/** Width / height of the preferred head region. */
export const FRONT_FRAME_RATIO = 0.72;

/** Halfway turn: a little wider than a straight-on face. */
export const THREE_QUARTER_FRAME_RATIO = 0.92;

/** Side framing leaves room in front of the nose and behind the head. */
export const SIDE_FRAME_RATIO = 1.15;
