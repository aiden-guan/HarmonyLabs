import type { LiteratureReference } from "@/lib/face/scoring/evidence-types";

export const PALLETT_2010: LiteratureReference = {
  title: "New “golden” ratios for facial beauty",
  authors: "Pallett PM, Link S, Lee K",
  year: 2010,
  doi: "10.1016/j.visres.2009.11.003",
  pmid: "19896961",
  population: "Manipulated photographs; the reported average ratios come from 40 Caucasian female faces",
  sampleSize: 40,
  methodology:
    "Paired attractiveness comparisons while eye–mouth distance and interocular distance were varied independently.",
  findingType: "preference-experiment",
  notes:
    "Length ratio peaks near 0.36 (eye-to-mouth / hairline-to-chin), SD 0.017 in the 40-face average. Width ratio peaks near 0.46 of face width measured between the inner edges of the ears. That width ratio is not scored here.",
};

export const NAINI_MENTOLABIAL_2017: LiteratureReference = {
  title: "Mentolabial angle and aesthetics: a quantitative investigation of idealized and normative values",
  authors: "Naini FB, Cobourne MT, Garagiola U, McDonald F, Wertheim D",
  year: 2017,
  doi: "10.1186/s40902-017-0102-8",
  pmid: "28217687",
  population: "Observers rating an idealized male Caucasian profile silhouette: 75 patients, 75 lay people, 35 clinicians",
  sampleSize: 185,
  methodology: "The mentolabial angle of one male silhouette was varied from 84° to 162° and rated on a Likert scale.",
  findingType: "preference-experiment",
  notes: "About 107–118° was most attractive. Up to about 140° was acceptable. Below 98° or above 162° was very unattractive. The image was male.",
};

export const FORTES_2014: LiteratureReference = {
  title: "Photometric analysis of esthetically pleasant and unpleasant facial profile",
  authors: "Fortes HNR, Guimarães TC, Belo IML, Matta ENR",
  year: 2014,
  doi: "10.1590/2176-9451.19.2.066-075.oar",
  pmid: "24945516",
  population: "Pleasant versus unpleasant profile photographs; 30 pleasant profiles",
  sampleSize: 30,
  methodology: "Photometric soft-tissue angles, including facial convexity G′–Sn–Pg′.",
  findingType: "attractive-cohort",
  notes:
    "Pleasant profiles had facial convexity 169.20° ± 3.88°. That mean is the center of a pleasant cohort, not a manipulated optimum. Nasolabial angle did not separate pleasant from unpleasant in this sample (104.37° ± 7.25°, p = 0.951) and is not used as a target.",
};

export const MAV_2025: LiteratureReference = {
  title: "A study on gender differences in the maximum attractiveness values for cephalometric measures",
  authors: "Reported on PubMed as PMID 40742908",
  year: 2025,
  doi: "10.1097/scs.0000000000011763",
  pmid: "40742908",
  population: "180 untreated Chinese adults (90 male, 90 female) rated from photographs by 16 laypersons; measures taken from cephalograms",
  sampleSize: 180,
  methodology: "Quadratic association between cephalometric measures and photograph attractiveness. Profile-angle maxima were 169.6° (male) and 167.3° (female).",
  findingType: "attractiveness-rating",
  notes:
    "The profile angle is treated as soft-tissue convexity only as a presentation-specific center. Imaging is cephalometric, not a phone photograph, so formula compatibility stays moderate.",
};

export const OKUMURA_2025: LiteratureReference = {
  title: "Ideal nasal angle preferences among Japanese people: a prospective observational study on aesthetic perception",
  authors: "Okumura K, Tamura T, Teranishi H, Funakoshi Y",
  year: 2025,
  doi: "10.1093/asjof/ojaf052",
  pmid: "40678082",
  population: "783 Japanese adults, mostly women, rating one male and one female Japanese 3D profile",
  sampleSize: 783,
  methodology:
    "Nasolabial angle, defined by a columella tangent and an upper-lip tangent at subnasale, was shown at 95°, 105°, and 115°.",
  findingType: "preference-experiment",
  notes:
    "Pairwise ratings preferred 95° on the male model and 105° on the female model. A weighted-average summary in the same paper lands on 105° for both; HarmonyLabs uses the pairwise preference and treats the conflict as a limitation. Nasofacial angles in this paper use Frankfort vertical and are not copied onto the HarmonyLabs nasofacial line pair.",
};

export const SINNO_2012: LiteratureReference = {
  title: "Defining the ideal nasolabial angle",
  authors: "Sinno HH, Markarian MK, Ibrahim AMS, Lin SJ",
  year: 2012,
  doi: "10.1097/PRS.0b013e3182402e12",
  pmid: "22090249",
  population: "Altered rhinoplasty photographs rated by 16 observers",
  sampleSize: 20,
  methodology:
    "Nasolabial angle defined with a line through the nostril aperture and a perpendicular to Frankfort horizontal.",
  findingType: "preference-experiment",
  notes: "Cited only to record a different angle definition. Its 93–100° means are not applied to the columella–lip tangent.",
};

export const LANGLOIS_2000: LiteratureReference = {
  title: "Maxims or myths of beauty? A meta-analytic and theoretical review",
  authors: "Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M",
  year: 2000,
  doi: "10.1037/0033-2909.126.3.390",
  pmid: "10825783",
  population: "Meta-analysis of facial attractiveness judgments",
  methodology: "Meta-analytic review of agreement, averageness, and related attractiveness findings.",
  findingType: "systematic-review",
  notes: "Supports shared attractiveness judgments and averageness. It does not supply a single template or a percent cutoff.",
};

export const RHODES_2006: LiteratureReference = {
  title: "The evolutionary psychology of facial beauty",
  authors: "Rhodes G",
  year: 2006,
  doi: "10.1146/annurev.psych.57.102904.190208",
  pmid: "16318594",
  population: "Review of averageness, symmetry, and sexual dimorphism research",
  methodology: "Annual review of experimental attractiveness research.",
  findingType: "systematic-review",
};

export const RHODES_2001: LiteratureReference = {
  title: "Attractiveness of facial averageness and symmetry in non-Western cultures: in search of biologically based standards of beauty",
  authors: "Rhodes G, Yoshikawa S, Clark A, Lee K, McKay R, Akamatsu S",
  year: 2001,
  pmid: "11430245",
  population: "Cross-cultural samples including Japanese and Caucasian faces",
  methodology: "Averageness and symmetry manipulations rated for attractiveness.",
  findingType: "preference-experiment",
};

export const VAN_DONGEN_2011: LiteratureReference = {
  title: "Associations between asymmetry and human attractiveness: possible evidence for an evolved adaptation",
  authors: "Van Dongen S",
  year: 2011,
  pmid: "21271817",
  population: "Review and analysis of fluctuating asymmetry and attractiveness",
  methodology: "Quantitative review. The association is real and small.",
  findingType: "systematic-review",
  notes: "Symmetry is included with a small feature-group weight. Natural asymmetry is not treated as a defect.",
};

export const KHOSHAB_2021: LiteratureReference = {
  title:
    "Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio",
  authors: "Khoshab N, et al.",
  year: 2021,
  doi: "10.1093/asj/sjab339",
  pmid: "34515761",
  population: "Systematic raw-data analysis across published anthropometric samples",
  methodology: "Tested neoclassical canons and phi against measured faces.",
  findingType: "systematic-review",
  notes: "Canons and phi = 1.618 do not hold as universal facial standards. They are not Harmony targets.",
};

export const FANG_2011: LiteratureReference = {
  title: "A systematic review of interethnic variability in facial dimensions",
  authors: "Fang F, Clapham PJ, Chung KC",
  year: 2011,
  pmid: "21285791",
  population: "Published anthropometric samples across ethnic groups",
  methodology: "Systematic review of linear facial dimensions.",
  findingType: "systematic-review",
  notes: "Population means differ. A mean is not treated as an attractiveness optimum, and ancestry is not inferred.",
};

export const LIM_2022: LiteratureReference = {
  title: "Reliability and accuracy of 2D photogrammetry: a comparison with direct measurement",
  authors: "Lim YC, Abdul Shakor AS, Shaharudin R",
  year: 2022,
  pmid: "35155360",
  population: "Photogrammetry compared with direct anthropometry",
  methodology: "Reliability study of 2D photographs.",
  findingType: "anthropometry",
  notes: "Bizygomatic and related breadths are among the less accurate 2D measurements. Approximate zygion and gonion stay lower confidence.",
};

export const PASKHOVER_2018: LiteratureReference = {
  title: "Nasal distortion in short-distance photographs: the selfie effect",
  authors: "Paskhover B, et al.",
  year: 2018,
  pmid: "29494735",
  population: "Nasal appearance at selfie distances versus a standardized distance",
  methodology: "Compared nasal dimensions as camera distance decreased.",
  findingType: "anthropometry",
  notes: "Close cameras enlarge the nose. HarmonyLabs does not claim radial lens correction undoes that perspective effect.",
};

export const DISTORTION_2023: LiteratureReference = {
  title: "Quantifying facial distortion in modern digital photography",
  authors: "See PubMed 37543968",
  year: 2023,
  pmid: "37543968",
  population: "Digital photographs at varying subject-to-camera distances",
  methodology: "Quantified how close-range photography changes facial proportions.",
  findingType: "anthropometry",
};

export const NAINI_CONVEXITY_2012: LiteratureReference = {
  title: "Assessing the influence of lower facial profile convexity on perceived attractiveness in the orthognathic patient, clinician, and layperson",
  authors: "Naini FB, Donaldson ANA, McDonald F, Cobourne MT",
  year: 2012,
  pmid: "22883980",
  population: "Patients, laypeople, and clinicians rating an altered profile",
  methodology: "Lower-face convexity was varied from +14° to −16°.",
  findingType: "preference-experiment",
  notes:
    "Straighter profiles were preferred. The manipulated angle is not the interior G–Sn–Pg angle, so its degree limits are not copied.",
};

export const ANIC_2008: LiteratureReference = {
  title: "Soft-tissue facial profile of attractive Croatian adults",
  authors: "Anić-Milošević S, Lapter-Varga M, Šlaj M",
  year: 2008,
  pmid: "18263886",
  population: "Aesthetically harmonious Croatian adults",
  methodology: "Soft-tissue profile measurements in a selected harmonious cohort.",
  findingType: "attractive-cohort",
  notes: "Contextual support for profile relationships. Cohort means are not copied onto a different photographic construction.",
};

export const FARKAS_1994: LiteratureReference = {
  title: "Anthropometry of the Head and Face",
  authors: "Farkas LG",
  year: 1994,
  population: "North American and comparative anthropometric samples",
  methodology: "Direct anthropometry reference monograph.",
  findingType: "anthropometry",
  notes: "Used as population context. Table means are not pasted onto mesh ratios with different landmarks.",
};

export const MEDIAPIPE_DOCS: LiteratureReference = {
  title: "MediaPipe Face Landmarker",
  authors: "Google",
  year: 2023,
  population: "Face mesh model, 478 landmarks",
  methodology: "Official Face Landmarker documentation for the pinned float16 task.",
  findingType: "anthropometry",
  notes: "Landmark indices are model vertices, not palpated skeletal points.",
};
