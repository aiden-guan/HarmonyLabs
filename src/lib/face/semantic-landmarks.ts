import type { FaceView, SemanticLandmarkKey } from "@/types/face";

export interface LandmarkGuide {
  label: string;
  hint: string;
}

export const LANDMARK_GUIDE: Record<SemanticLandmarkKey, LandmarkGuide> = {
  leftPupil: {
    label: "Left pupil",
    hint: "Center of the iris on the subject's left eye.",
  },
  rightPupil: {
    label: "Right pupil",
    hint: "Center of the iris on the subject's right eye.",
  },
  leftInnerCanthus: {
    label: "Left inner canthus",
    hint: "Inner corner of the subject's left eye.",
  },
  rightInnerCanthus: {
    label: "Right inner canthus",
    hint: "Inner corner of the subject's right eye.",
  },
  leftOuterCanthus: {
    label: "Left outer canthus",
    hint: "Outer corner of the subject's left eye.",
  },
  rightOuterCanthus: {
    label: "Right outer canthus",
    hint: "Outer corner of the subject's right eye.",
  },
  leftEyeTop: {
    label: "Left upper lid",
    hint: "Highest point of the subject's left palpebral fissure.",
  },
  leftEyeBottom: {
    label: "Left lower lid",
    hint: "Lowest point of the subject's left palpebral fissure.",
  },
  rightEyeTop: {
    label: "Right upper lid",
    hint: "Highest point of the subject's right palpebral fissure.",
  },
  rightEyeBottom: {
    label: "Right lower lid",
    hint: "Lowest point of the subject's right palpebral fissure.",
  },
  leftZygion: {
    label: "Left lateral face",
    hint: "Most lateral mesh point near the cheek, an approximation of zygion. Not a palpated bony landmark.",
  },
  rightZygion: {
    label: "Right lateral face",
    hint: "Most lateral mesh point near the cheek, an approximation of zygion. Not a palpated bony landmark.",
  },
  leftGonion: {
    label: "Left jaw angle",
    hint: "Mesh point near the mandibular angle. Place it on the jaw corner if the estimate is off.",
  },
  rightGonion: {
    label: "Right jaw angle",
    hint: "Mesh point near the mandibular angle. Place it on the jaw corner if the estimate is off.",
  },
  leftChinLateral: {
    label: "Left chin",
    hint: "Lateral chin point on the subject's left.",
  },
  rightChinLateral: {
    label: "Right chin",
    hint: "Lateral chin point on the subject's right.",
  },
  glabella: {
    label: "Glabella",
    hint: "Most prominent midline point between the brows.",
  },
  nasion: {
    label: "Nasion",
    hint: "Deepest point of the nasal root, between the brow and the bridge.",
  },
  rhinion: {
    label: "Rhinion",
    hint: "Point on the nasal bridge above the tip. Profile angles use this point rather than the tip.",
  },
  pronasale: {
    label: "Pronasale",
    hint: "Most anterior point of the nose tip.",
  },
  subnasale: {
    label: "Subnasale",
    hint: "Midline point where the nose column meets the upper lip.",
  },
  leftAlare: {
    label: "Left alar",
    hint: "Most lateral point of the subject's left nostril wing.",
  },
  rightAlare: {
    label: "Right alar",
    hint: "Most lateral point of the subject's right nostril wing.",
  },
  labialeSuperius: {
    label: "Labiale superius",
    hint: "Midline top of the upper lip vermilion.",
  },
  stomion: {
    label: "Stomion",
    hint: "Midpoint of the closed mouth opening.",
  },
  labialeInferius: {
    label: "Labiale inferius",
    hint: "Midline bottom of the lower lip vermilion.",
  },
  leftCheilion: {
    label: "Left mouth corner",
    hint: "Subject's left corner of the mouth.",
  },
  rightCheilion: {
    label: "Right mouth corner",
    hint: "Subject's right corner of the mouth.",
  },
  pogonion: {
    label: "Pogonion",
    hint: "Most anterior midline point of the chin.",
  },
  menton: {
    label: "Menton",
    hint: "Lowest midline point of the chin.",
  },
  foreheadApex: {
    label: "Forehead apex",
    hint: "Top of the face mesh on the forehead. This is not the hairline.",
  },
  columella: {
    label: "Columella",
    hint: "Estimated point on the nose column. Drag it if the nasolabial angle looks wrong.",
  },
  sublabiale: {
    label: "Sublabiale",
    hint: "Deepest point of the fold between the lower lip and the chin.",
  },
};

export const FRONT_LANDMARK_KEYS: SemanticLandmarkKey[] = [
  "foreheadApex",
  "glabella",
  "nasion",
  "leftPupil",
  "rightPupil",
  "leftOuterCanthus",
  "leftInnerCanthus",
  "rightInnerCanthus",
  "rightOuterCanthus",
  "leftEyeTop",
  "leftEyeBottom",
  "rightEyeTop",
  "rightEyeBottom",
  "leftZygion",
  "rightZygion",
  "pronasale",
  "subnasale",
  "leftAlare",
  "rightAlare",
  "labialeSuperius",
  "stomion",
  "labialeInferius",
  "leftCheilion",
  "rightCheilion",
  "leftGonion",
  "rightGonion",
  "leftChinLateral",
  "rightChinLateral",
  "pogonion",
  "menton",
];

export const PROFILE_LANDMARK_KEYS: SemanticLandmarkKey[] = [
  "foreheadApex",
  "glabella",
  "nasion",
  "rhinion",
  "pronasale",
  "columella",
  "subnasale",
  "labialeSuperius",
  "stomion",
  "labialeInferius",
  "sublabiale",
  "pogonion",
  "menton",
];

export function landmarkKeysForView(view: FaceView): SemanticLandmarkKey[] {
  return view === "front" ? FRONT_LANDMARK_KEYS : PROFILE_LANDMARK_KEYS;
}
