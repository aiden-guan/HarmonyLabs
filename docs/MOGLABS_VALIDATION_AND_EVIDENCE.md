# MogLabs validation and evidence

Harmony is a reproducible, evidence-weighted comparison of facial geometry with research-supported attractiveness, aesthetic-harmony, and proportional references.

It is not a clinical diagnostic score. It is not a claim that one mathematical face is the attractive face. It does not infer sex, gender, race, ethnicity, or age.

## Scientific model

People agree about facial attractiveness more than chance, including across some cultural samples. The agreement is substantial and incomplete. Langlois and colleagues' meta-analysis (PMID 10825783) and Rhodes' review (PMID 16318594) are the framing papers. Shared contributors that those reviews, and the studies they rest on, support include:

- averageness, meaning closeness to a population prototype rather than identity with every population mean
- symmetry, usually a modest effect once measurement noise and normal biological asymmetry are acknowledged (Rhodes, PMID 11430245; Van Dongen, PMID 21271817)
- proportional relationships among features
- sex-typical morphology, which can shift preference and is never inferred here

Those signals coexist with population variation (Fang and colleagues, PMID 21285791) and with individual preference. A biological component does not imply one optimum, one attractiveness gene, or a template that every ancestry should match. Khoshab and colleagues (PMID 34515761, DOI 10.1093/asj/sjab339) show that neoclassical canons and the golden ratio are poor descriptions of real faces. Harmony does not use phi as a master standard.

The scored model is therefore a set of partially shared relationships:

- proportional coherence among features
- feature balance of spacing and relative scale
- avoidance of severe disproportion, which is not the same as rewarding the arithmetic mean
- modest symmetry, with a noise deadband
- profile relationships only where the photograph and the formula can support them
- sex-typical profile targets only on an explicit masculine or feminine presentation profile

Averageness is not implemented as a distance-to-mean model. Compatible population distributions are not available for the MogLabs landmark set at the precision that would justify one. Extremeness screens on relational ratios are the current stand-in, and their numeric edges are disproportion bounds, not published attractiveness cutoffs. That limitation is stored on each Tier 3 record.

## Evidence tiers

| Tier | Meaning | Aggregation weight |
| --- | --- | --- |
| 1 | Direct attractiveness or preference evidence, when the MogLabs formula is compatible | 1.0 |
| 2 | Established aesthetic-harmony evidence, including attractive cohorts and aesthetic analysis | 0.75 |
| 3 | Anthropometric proportional evidence used as a modest coherence check | 0.40 |
| 4 | Unsupported, custom, or formula-incompatible | 0 |

The weights are relative influence, not beauty multipliers. A Tier 3 metric can score 9.5 against its own screen and still move Harmony less than a Tier 1 metric. Level weights (high 1, moderate 0.85, low 0.65, insufficient 0) further scale influence when the sample or method generalizes poorly.

Inside a feature group, Tier 2 influence is capped at 0.55 of the Tier 1 influence in that group, and Tier 3 at 0.28 of Tier 1 (or 0.45 of Tier 2 when no Tier 1 member is present). Across groups, Tier 3-only groups together cannot exceed half the weight of the Tier 1 groups that were measured.

## Four different intervals

Each scored metric can carry:

- an aesthetic target, a narrow interval or center with direct or strong aesthetic support
- a harmony range, a broader interval of acceptable proportional or aesthetic variation
- a population range, a descriptive spread that is not an optimum
- a measurement uncertainty, used as a deadband so noise is not scored as a difference

## Capture protocol

Measurement-grade front capture aims for yaw, pitch, and roll within about ±4°, with a sharp image and the face not filling the frame. A wider band, about ±8°, is "good". Beyond that the capture is "limited". The looser on-screen gate still allows a usable photograph; it does not pretend that photograph is measurement-grade. Large pose error is not warped into a fake frontal mesh.

Profile capture does not require MediaPipe yaw to read 90°. A usable profile is a side pose from the combined orientation and silhouette cues. A measurement-grade profile also needs the far eye collapsed, a stable silhouette, and a non-borderline turn. Only that grade keeps full profile-angle confidence.

Distance is the control for perspective. About 1.2–1.5 m (4–5 ft), with a stand, timer, or a step back and a crop, is the requested protocol. The user records whether they followed it. A close face is still analyzed, flagged as a perspective-distortion risk, and down-weighted on perspective-sensitive metrics. Estimated Brown–Conrady correction addresses radial lens distortion only. It does not undo selfie perspective.

Neutral expression is requested: relaxed jaw, lips gently together, eyes open. MediaPipe blendshapes, when the landmarker returns them, are used only as capture QC. They are not attractiveness metrics.

Camera capture keeps about 15 landmark frames, aligns them to the shutter frame with a 2D similarity on the pupils and menton, rejects outliers with a MAD gate, and scores the median mesh when at least 7 frames agree. The representative image is the shutter frame, so the points stay on that photograph. Dispersion is stored with the photo.

Three-quarter capture is an optional turn check between front and profile. It is not stored as a scored view and it has no attractiveness metrics.

## Measurement pipeline

Versions stored with each completed analysis:

- `LANDMARK_MODEL_VERSION`: mediapipe-face-landmarker-float16-1
- `MEDIAPIPE_TASKS_VERSION`: 0.10.35
- `METRIC_DEFINITION_VERSION`: metrics-2.0.0
- `REFERENCE_DATA_VERSION`: references-2.0.0
- `SCORING_VERSION`: harmony-v2

Landmark confidence, derived-versus-manual source, approximate zygion and gonion, pose grade, perspective risk, and formula compatibility enter the aggregation weight:

```text
effective influence =
  feature-group base
  × evidence-tier weight
  × measurement reliability
  × formula compatibility
  × landmark factor
  × capture factor
  × evidence-level weight
```

The visible metric score is not multiplied by reliability. Low measurement confidence lowers influence. Low evidence confidence lowers influence. A missing landmark produces a null measurement, not a zero.

Feature groups: eye spacing, nasal width balance, oral proportions, facial verticals, eye morphology, jaw balance, midline symmetry, profile convexity, nasal profile, chin profile. Group bases are larger for independent, better-supported relationships and smaller for symmetry and approximate jaw breadth.

## Metric policy

Exact formulas, bands, populations, and citations are in `docs/measurement-evidence.md`, generated from the typed registry.

Scored examples, after formula checks:

- Pallett eye–mouth / hairline–chin length (PMID 19896961) only when trichion is placed. The published face-width ratio is not used, because MogLabs has no inner-ear width.
- Mentolabial angle from Naini and colleagues (PMID 28217687), with the published male silhouette preference as the neutral and masculine target. No female optimum was invented. The feminine profile uses a wider acceptable interval and a reduced compatibility weight.
- Facial convexity as the interior angle at subnasale from glabella and pogonion, compared with the Fortes pleasant-cohort description (PMID 24945516). Optional presentation centers from PMID 40742908 are labeled as a different modality and are not the neutral target.
- Nasolabial angle as a three-point approximation of the columella and upper-lip tangents, compared with the pairwise preference in Okumura and colleagues (PMID 40678082). Nasofacial angles from that paper are not copied, because the reference lines differ.
- Relational Tier 3 screens for eye spacing, nasal width versus intercanthal distance, lip height, mouth width versus interpupillary distance, philtrum, chin height, lower-to-middle face, and approximate jaw ratios. Equal thirds and 1:1.618 lip height are not targets.
- Symmetry as a lower-is-better percent, Tier 1 for the direction of the evidence and only moderate formula compatibility, because the percent cutoffs are engineering deadbands rather than published thresholds.

Informational, and therefore zero Harmony weight:

- Mesh forehead, midface, and lower shares. The forehead endpoint is the mesh boundary, not trichion.
- Facial width-height on approximate zygion. It is not a facial index.
- Intercanthal-to-face and interpupillary-to-face ratios. They are not the Pallett 0.46 width ratio.
- Nasal width divided by face width. Scoring it would penalize ancestry-typical nasal breadth.
- Nasofrontal and nasofacial point angles whose definitions do not match the tangent or Frankfort constructions in the papers.
- Custom nasal projection. It is not Goode's ratio. The alar-facial groove is not on the anterior silhouette.
- Custom chin projection, which would double-count convexity.

## Uncertainty

Degrees are shown as whole degrees. Ratios keep three decimals. Each report row can show the measured value, aesthetic target, harmony range, population range, measurement confidence, evidence tier, source population, citation, formula, limitation, and Harmony contribution.

## Validation

Synthetic checks cover translation and scale invariance of a ratio, a one-sided landmark shift, a missing point, multi-frame median aggregation, and expression QC. Repeatability helpers compute mean, sample standard deviation, MAD, coefficient of variation, mean absolute error, and balanced ICC(1) from supplied repeats. They do not embed a fabricated test-retest error.

Score tests require a peak at a supported center, a smooth decline, a harmony edge near 7 rather than 10, zero influence for unsupported metrics, a lower influence rather than a lower metric score when landmark confidence falls, null rather than zero for missing metrics, finite bounded scores, group weight that does not grow with metric count, and a Tier 3 stack that cannot outvote one Tier 1 metric.

Source tests fail if a score-eligible metric has no reference, no population, no formula note, no limitation, no accuracy budget, or an unsupported type with nonzero tier weight.

Pose, jitter, and radial-distortion sweeps beyond the ratio invariants above are not yet a full camera simulator. Metrics that use approximate breadth or profile tangents should be treated as more pose-sensitive than intercanthal ratios until repeated real captures exist.

## Reproduction

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

Harmony V1 remains available as `runMeasurementPipelineV1` and `scoreMetricV1`. Do not compare a V1 analysis with a V2 analysis as if the numbers used the same scale.

## Limitations

- 2D photographs are not cephalograms. Perspective, expression, and landmark error remain.
- Zygion and gonion are approximations. Dependent breadth ratios stay low-reliability or informational.
- Several attractive-cohort numbers come from narrow samples. Source population is shown, and level weight is reduced. Those samples are not racial scores.
- No population-specific attractiveness table is inferred from a face.
- Goode nasal projection and tangent nasofrontal and nasofacial angles are not implemented, because the required landmarks are not reliable on this contour.
- Blendshape QC depends on the landmarker returning coefficients. A missing coefficient skips the check.
- Repeatability bands will be updated only from observed repeats.

## Bibliography

See the citations on each metric in `docs/measurement-evidence.md`. Framing sources:

- Langlois JH, et al. Maxims or myths of beauty? Psychological Bulletin. PMID 10825783.
- Rhodes G. The evolutionary psychology of facial beauty. Annual Review of Psychology. PMID 16318594.
- Rhodes G, et al. Attractiveness of facial averageness and symmetry in non-Western cultures. PMID 11430245.
- Khoshab N, et al. Historical tools of anthropometric facial assessment. PMID 34515761. DOI 10.1093/asj/sjab339.
- Fang F, et al. A systematic review of interethnic variability in facial dimensions. PMID 21285791.
- Pallett PM, Link S, Lee K. New "golden" ratios for facial beauty. PMID 19896961. DOI 10.1016/j.visres.2009.11.003.
- Van Dongen S. Associations between asymmetry and human attractiveness. PMID 21271817.
- Naini FB, et al. Mentolabial angle and aesthetics. PMID 28217687.
- Anic-Milosevic S, et al. Soft-tissue profile relationships. PMID 18263886.
- Fortes H, et al. Photometric analysis of aesthetically pleasant faces. PMID 24945516.
- Okumura Y, et al. Nasolabial angle preference. PMID 40678082. DOI 10.1093/asjof/ojaf052.
- Paskhover B, et al. Nasal distortion in short-distance photographs. PMID 29494735.
- Quantifying facial distortion in modern digital photography. PMID 37543968.
- Lim HW, et al. Reliability and accuracy of 2D photogrammetry. PMID 35155360.
- MediaPipe Face Landmarker documentation, task graph float16 version 1.
