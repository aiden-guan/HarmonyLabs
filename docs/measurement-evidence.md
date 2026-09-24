# Measurement evidence

This catalog is the Harmony V2 evidence registry. Scoring reads the same records in `src/lib/face/scoring/evidence-registry.ts`. A population mean is not an aesthetic optimum. A metric with `Harmony eligible: no` is informational and has zero Harmony weight.

Tier 1 is direct attractiveness or preference evidence. Tier 2 is established aesthetic-harmony evidence. Tier 3 is anthropometric proportional evidence and contributes modestly. Tier 4 is unsupported and does not affect Harmony.

Presentation-specific masculine and feminine bands are used only when the user selects that profile. They are never inferred from the photograph.

## Facial width-to-height

- Metric ID: `facial-width-height`
- View: front
- Formula: distance(leftZygion, rightZygion) / distance(foreheadApex, menton)
- Landmarks: leftZygion, rightZygion, foreheadApex, menton
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 0.6–0.9 ratio.
- Formula notes: Pallett's 46% width ratio needs the inner ear margins and is not substituted here.
- Accuracy budget: Approximate zygion mesh apex yaw perspective
- Limitations: Not a classical facial index. Width is approximate zygion and height starts at the mesh forehead, not trichion or nasion. Face width varies across populations. A narrower mesh is not scored as more attractive.
- References: Lim YC, Abdul Shakor AS, Shaharudin R (2022). Reliability and accuracy of 2D photogrammetry: a comparison with direct measurement. PMID 35155360. Population: Photogrammetry compared with direct anthropometry. Reliability study of 2D photographs. Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Pallett PM, Link S, Lee K (2010). New “golden” ratios for facial beauty. PMID 19896961. Population: Manipulated photographs; the reported average ratios come from 40 Caucasian female faces. Paired attractiveness comparisons while eye–mouth distance and interocular distance were varied independently. Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces.

## Mesh brow span

- Metric ID: `upper-third`
- View: front
- Formula: vertical(foreheadApex, glabella) / (upper + middle + lower)
- Landmarks: foreheadApex, glabella, subnasale, menton
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 0.2–0.4 ratio.
- Formula notes: Trichion-based literature is not applied.
- Accuracy budget: Mesh boundary instead of hairline
- Limitations: This is the mesh-brow span, from the face-mesh apex to glabella, as a share of mesh apex to menton. It is not the trichion–glabella facial third and is not scored against equal-thirds canons.
- References: Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Google (2023). MediaPipe Face Landmarker. no indexed id. Population: Face mesh model, 478 landmarks. Official Face Landmarker documentation for the pinned float16 task.

## Midface mesh share

- Metric ID: `middle-third`
- View: front
- Formula: vertical(glabella, subnasale) / (upper + middle + lower)
- Landmarks: foreheadApex, glabella, subnasale, menton
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 0.25–0.45 ratio.
- Formula notes: Equal thirds are not a Harmony target. The lower-to-middle ratio uses the landmarks that do not need the hairline.
- Accuracy budget: Mesh apex in the denominator pitch
- Limitations: Share of the mesh apex–menton span from glabella to subnasale. The denominator includes the mesh brow, so this is not a classical facial third.
- References: Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces.

## Lower mesh share

- Metric ID: `lower-third`
- View: front
- Formula: vertical(subnasale, menton) / (upper + middle + lower)
- Landmarks: foreheadApex, glabella, subnasale, menton
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 0.25–0.45 ratio.
- Formula notes: Not scored as a classical lower third.
- Accuracy budget: Mesh apex in the denominator
- Limitations: Share of the mesh apex–menton span from subnasale to menton. Same denominator limitation as the middle mesh share.
- References: Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces.

## Jaw-to-cheek width

- Metric ID: `jaw-cheek-ratio`
- View: front
- Formula: distance(leftGonion, rightGonion) / distance(leftZygion, rightZygion)
- Landmarks: leftGonion, rightGonion, leftZygion, rightZygion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 3 (Anthropometric proportional evidence)
- Evidence type: anthropometric-proportion
- Evidence level: low
- Harmony eligible: yes
- Evidence weight: 0.4
- Measurement reliability prior: 0.4
- Formula compatibility: 0.7
- Scoring shape: extremeness
- Source population: Cross-population anthropometry. No ancestry is inferred, and the band is intentionally wide.
- Harmony range: 0.62–0.95 ratio.
- Formula notes: Both widths use approximate gonion and zygion. Reliability is low on purpose.
- Accuracy budget: Approximate zygion approximate gonion yaw 2D breadth error
- Limitations: There is no formula-compatible attractiveness optimum for this ratio. The interval is a disproportion screen. Values inside it are not ranked toward a population mean. Equal neoclassical canons and phi are not targets. Both widths use approximate gonion and zygion. Reliability is low on purpose.
- References: Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings.

## Chin height ratio

- Metric ID: `chin-height-ratio`
- View: front
- Formula: vertical(stomion, menton) / vertical(subnasale, menton)
- Landmarks: stomion, menton, subnasale
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 3 (Anthropometric proportional evidence)
- Evidence type: anthropometric-proportion
- Evidence level: low
- Harmony eligible: yes
- Evidence weight: 0.4
- Measurement reliability prior: 0.82
- Formula compatibility: 0.7
- Scoring shape: extremeness
- Source population: Cross-population anthropometry. No ancestry is inferred, and the band is intentionally wide.
- Harmony range: 0.45–0.8 ratio.
- Formula notes: Stomion-to-menton over subnasale-to-menton.
- Accuracy budget: Mouth opening menton expression
- Limitations: There is no formula-compatible attractiveness optimum for this ratio. The interval is a disproportion screen. Values inside it are not ranked toward a population mean. Equal neoclassical canons and phi are not targets. Stomion-to-menton over subnasale-to-menton.
- References: Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings.

## Lower-to-middle third

- Metric ID: `lower-middle-ratio`
- View: front
- Formula: vertical(subnasale, menton) / vertical(glabella, subnasale)
- Landmarks: glabella, subnasale, menton
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 3 (Anthropometric proportional evidence)
- Evidence type: anthropometric-proportion
- Evidence level: low
- Harmony eligible: yes
- Evidence weight: 0.4
- Measurement reliability prior: 0.84
- Formula compatibility: 0.7
- Scoring shape: extremeness
- Source population: Cross-population anthropometry. No ancestry is inferred, and the band is intentionally wide.
- Harmony range: 0.75–1.45 ratio.
- Formula notes: Subnasale–menton over glabella–subnasale. Equal thirds are not the target. The hairline is not in this ratio.
- Accuracy budget: Glabella subnasale menton pitch perspective
- Limitations: There is no formula-compatible attractiveness optimum for this ratio. The interval is a disproportion screen. Values inside it are not ranked toward a population mean. Equal neoclassical canons and phi are not targets. Subnasale–menton over glabella–subnasale. Equal thirds are not the target. The hairline is not in this ratio.
- References: Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings.

## Eye–mouth face length

- Metric ID: `pallett-length-ratio`
- View: front
- Formula: vertical(pupil midpoint, stomion) / vertical(trichion, menton)
- Landmarks: trichion, menton, leftPupil, rightPupil, stomion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 1 (Direct attractiveness evidence)
- Evidence type: direct-attractiveness
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 1
- Measurement reliability prior: 0.72
- Formula compatibility: 0.85
- Scoring shape: peaked-target
- Source population: Caucasian female faces in Pallett, Link, and Lee (2010); raters in their paired-comparison experiments
- Aesthetic target: 0.343–0.377 (center 0.36) ratio. Harmony range: 0.326–0.394 ratio. Population range: 0.326–0.394 ratio.
- Formula notes: Eye–mouth distance is the vertical span from the pupil midpoint to stomion. Face length is trichion to menton. Pallett used the eyes, the mouth, the hairline, and the chin.
- Accuracy budget: Hairline placement pitch pupil and stomion localization close-camera perspective
- Limitations: Scored only when trichion is placed. The mesh forehead apex is not the hairline. The source faces were female and Caucasian. This is a relational ratio, not a race score, and generalization confidence is moderate. Their 46% width ratio is not used. HarmonyLabs does not measure the inner ear margins.
- References: Pallett PM, Link S, Lee K (2010). New “golden” ratios for facial beauty. PMID 19896961. Population: Manipulated photographs; the reported average ratios come from 40 Caucasian female faces. Paired attractiveness comparisons while eye–mouth distance and interocular distance were varied independently. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings. Rhodes G (2006). The evolutionary psychology of facial beauty. PMID 16318594. Population: Review of averageness, symmetry, and sexual dimorphism research. Annual review of experimental attractiveness research.

## Intercanthal width ratio

- Metric ID: `intercanthal-face-ratio`
- View: front
- Formula: distance(leftInnerCanthus, rightInnerCanthus) / distance(leftZygion, rightZygion)
- Landmarks: leftInnerCanthus, rightInnerCanthus, leftZygion, rightZygion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 0.15–0.28 ratio.
- Formula notes: The intercanthal-to-eye-width ratio is the scored relational alternative.
- Accuracy budget: Approximate zygion canthi
- Limitations: Divides a reliable canthus span by approximate zygion width. The face-width denominator is too uncertain to score.
- References: Lim YC, Abdul Shakor AS, Shaharudin R (2022). Reliability and accuracy of 2D photogrammetry: a comparison with direct measurement. PMID 35155360. Population: Photogrammetry compared with direct anthropometry. Reliability study of 2D photographs. Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions.

## Interpupillary ratio

- Metric ID: `interpupillary-face-ratio`
- View: front
- Formula: distance(leftPupil, rightPupil) / distance(leftZygion, rightZygion)
- Landmarks: leftPupil, rightPupil, leftZygion, rightZygion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 0.35–0.55 ratio.
- Formula notes: Do not read the display scale as the Pallett width ratio.
- Accuracy budget: Approximate zygion pupils
- Limitations: Pupil span over approximate zygion width. Pallett's 0.46 optimum used inner ear margins, so that number is not attached.
- References: Pallett PM, Link S, Lee K (2010). New “golden” ratios for facial beauty. PMID 19896961. Population: Manipulated photographs; the reported average ratios come from 40 Caucasian female faces. Paired attractiveness comparisons while eye–mouth distance and interocular distance were varied independently. Lim YC, Abdul Shakor AS, Shaharudin R (2022). Reliability and accuracy of 2D photogrammetry: a comparison with direct measurement. PMID 35155360. Population: Photogrammetry compared with direct anthropometry. Reliability study of 2D photographs.

## Eye spacing ratio

- Metric ID: `eye-spacing-ratio`
- View: front
- Formula: intercanthal distance / mean(left eye width, right eye width)
- Landmarks: leftInnerCanthus, rightInnerCanthus, leftOuterCanthus, rightOuterCanthus
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 3 (Anthropometric proportional evidence)
- Evidence type: anthropometric-proportion
- Evidence level: low
- Harmony eligible: yes
- Evidence weight: 0.4
- Measurement reliability prior: 0.88
- Formula compatibility: 0.7
- Scoring shape: extremeness
- Source population: Cross-population anthropometry. No ancestry is inferred, and the band is intentionally wide.
- Harmony range: 0.75–1.4 ratio.
- Formula notes: Intercanthal distance over mean eye width. Equality with one eye width is a neoclassical canon and is not the peak.
- Accuracy budget: Canthus localization small yaw
- Limitations: There is no formula-compatible attractiveness optimum for this ratio. The interval is a disproportion screen. Values inside it are not ranked toward a population mean. Equal neoclassical canons and phi are not targets. Intercanthal distance over mean eye width. Equality with one eye width is a neoclassical canon and is not the peak.
- References: Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings.

## Eye width symmetry

- Metric ID: `eye-width-symmetry`
- View: front
- Formula: 100 * |left eye width − right eye width| / mean eye width
- Landmarks: leftOuterCanthus, leftInnerCanthus, rightOuterCanthus, rightInnerCanthus
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 1 (Direct attractiveness evidence)
- Evidence type: direct-attractiveness
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 1
- Measurement reliability prior: 0.78
- Formula compatibility: 0.45
- Scoring shape: lower-is-better
- Source population: Attractiveness experiments on symmetry and averageness, not a single demographic cutoff
- Aesthetic target: 0–1.2 percent. Harmony range: 0–8 percent.
- Formula notes: Direction (lower asymmetry scores higher) follows the experiments. The percent scale is a HarmonyLabs photographic summary.
- Accuracy budget: Canthus localization partial blink
- Limitations: The literature supports a modest preference for symmetry. It does not publish this percent cutoff. The low end is a measurement-noise deadband. Natural asymmetry inside the harmony range is expected. These are 2D photographic differences, not the fluctuating-asymmetry indices used in the cited experiments.
- References: Rhodes G (2006). The evolutionary psychology of facial beauty. PMID 16318594. Population: Review of averageness, symmetry, and sexual dimorphism research. Annual review of experimental attractiveness research. Rhodes G, Yoshikawa S, Clark A, Lee K, McKay R, Akamatsu S (2001). Attractiveness of facial averageness and symmetry in non-Western cultures: in search of biologically based standards of beauty. PMID 11430245. Population: Cross-cultural samples including Japanese and Caucasian faces. Averageness and symmetry manipulations rated for attractiveness. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings. Van Dongen S (2011). Associations between asymmetry and human attractiveness: possible evidence for an evolved adaptation. PMID 21271817. Population: Review and analysis of fluctuating asymmetry and attractiveness. Quantitative review. The association is real and small.

## Eye height symmetry

- Metric ID: `eye-height-symmetry`
- View: front
- Formula: 100 * |left eye height − right eye height| / mean eye height
- Landmarks: leftEyeTop, leftEyeBottom, rightEyeTop, rightEyeBottom
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 1 (Direct attractiveness evidence)
- Evidence type: direct-attractiveness
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 1
- Measurement reliability prior: 0.7
- Formula compatibility: 0.45
- Scoring shape: lower-is-better
- Source population: Attractiveness experiments on symmetry and averageness, not a single demographic cutoff
- Aesthetic target: 0–1.2 percent. Harmony range: 0–10 percent.
- Formula notes: Direction (lower asymmetry scores higher) follows the experiments. The percent scale is a HarmonyLabs photographic summary.
- Accuracy budget: Lid borders blink expression
- Limitations: The literature supports a modest preference for symmetry. It does not publish this percent cutoff. The low end is a measurement-noise deadband. Natural asymmetry inside the harmony range is expected. These are 2D photographic differences, not the fluctuating-asymmetry indices used in the cited experiments.
- References: Rhodes G (2006). The evolutionary psychology of facial beauty. PMID 16318594. Population: Review of averageness, symmetry, and sexual dimorphism research. Annual review of experimental attractiveness research. Rhodes G, Yoshikawa S, Clark A, Lee K, McKay R, Akamatsu S (2001). Attractiveness of facial averageness and symmetry in non-Western cultures: in search of biologically based standards of beauty. PMID 11430245. Population: Cross-cultural samples including Japanese and Caucasian faces. Averageness and symmetry manipulations rated for attractiveness. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings. Van Dongen S (2011). Associations between asymmetry and human attractiveness: possible evidence for an evolved adaptation. PMID 21271817. Population: Review and analysis of fluctuating asymmetry and attractiveness. Quantitative review. The association is real and small.

## Canthal tilt

- Metric ID: `canthal-tilt`
- View: front
- Formula: mean canthal tilt of both eyes, degrees, positive when the outer corner is higher
- Landmarks: leftOuterCanthus, leftInnerCanthus, rightOuterCanthus, rightInnerCanthus
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: -2–10 degrees.
- Formula notes: Shown for inspection. Not a Harmony component.
- Accuracy budget: Canthi camera roll
- Limitations: No formula-compatible attractiveness target in degrees was adopted. Head roll moves this angle.
- References: Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Google (2023). MediaPipe Face Landmarker. no indexed id. Population: Face mesh model, 478 landmarks. Official Face Landmarker documentation for the pinned float16 task.

## Eye-to-face width

- Metric ID: `eye-face-width`
- View: front
- Formula: mean eye width / distance(leftZygion, rightZygion)
- Landmarks: leftOuterCanthus, leftInnerCanthus, rightOuterCanthus, rightInnerCanthus, leftZygion, rightZygion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 0.14–0.24 ratio.
- Formula notes: Eye width relative to intercanthal distance is the scored spacing metric.
- Accuracy budget: Approximate zygion
- Limitations: Mean eye width over approximate facial width. Not scored.
- References: Lim YC, Abdul Shakor AS, Shaharudin R (2022). Reliability and accuracy of 2D photogrammetry: a comparison with direct measurement. PMID 35155360. Population: Photogrammetry compared with direct anthropometry. Reliability study of 2D photographs.

## Nasal width to face

- Metric ID: `nasal-width-face`
- View: front
- Formula: distance(leftAlare, rightAlare) / distance(leftZygion, rightZygion)
- Landmarks: leftAlare, rightAlare, leftZygion, rightZygion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 0.18–0.34 ratio.
- Formula notes: Nasal width relative to intercanthal distance is the scored alternative, and only as a wide disproportion screen.
- Accuracy budget: Alare approximate zygion selfie perspective
- Limitations: Alar width over approximate zygion width. Scoring it would treat population differences in nasal and facial width as a harmony error.
- References: Paskhover B, et al. (2018). Nasal distortion in short-distance photographs: the selfie effect. PMID 29494735. Population: Nasal appearance at selfie distances versus a standardized distance. Compared nasal dimensions as camera distance decreased. See PubMed 37543968 (2023). Quantifying facial distortion in modern digital photography. PMID 37543968. Population: Digital photographs at varying subject-to-camera distances. Quantified how close-range photography changes facial proportions. Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Lim YC, Abdul Shakor AS, Shaharudin R (2022). Reliability and accuracy of 2D photogrammetry: a comparison with direct measurement. PMID 35155360. Population: Photogrammetry compared with direct anthropometry. Reliability study of 2D photographs.

## Nasal width to intercanthal

- Metric ID: `nasal-width-intercanthal`
- View: front
- Formula: distance(leftAlare, rightAlare) / distance(leftInnerCanthus, rightInnerCanthus)
- Landmarks: leftAlare, rightAlare, leftInnerCanthus, rightInnerCanthus
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 3 (Anthropometric proportional evidence)
- Evidence type: anthropometric-proportion
- Evidence level: low
- Harmony eligible: yes
- Evidence weight: 0.4
- Measurement reliability prior: 0.86
- Formula compatibility: 0.7
- Scoring shape: extremeness
- Source population: Cross-population anthropometry. No ancestry is inferred, and the band is intentionally wide.
- Harmony range: 0.7–1.45 ratio.
- Formula notes: Alar width over intercanthal distance. Matching the eye spacing is a canon, not an attractiveness optimum.
- Accuracy budget: Alar points canthi close-camera nasal enlargement
- Limitations: There is no formula-compatible attractiveness optimum for this ratio. The interval is a disproportion screen. Values inside it are not ranked toward a population mean. Equal neoclassical canons and phi are not targets. Alar width over intercanthal distance. Matching the eye spacing is a canon, not an attractiveness optimum.
- References: Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings.

## Nasal length ratio

- Metric ID: `nasal-length-ratio`
- View: front
- Formula: distance(nasion, subnasale) / distance(foreheadApex, menton)
- Landmarks: nasion, subnasale, foreheadApex, menton
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 0.22–0.4 ratio.
- Formula notes: Not scored against nasal-length canons.
- Accuracy budget: Nasion mesh apex perspective
- Limitations: Nasion–subnasale over mesh forehead–menton. The denominator is not a standard morphological face height.
- References: Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Google (2023). MediaPipe Face Landmarker. no indexed id. Population: Face mesh model, 478 landmarks. Official Face Landmarker documentation for the pinned float16 task.

## Alar level

- Metric ID: `nasal-alar-level`
- View: front
- Formula: 100 * |leftAlare.y − rightAlare.y| / alar width
- Landmarks: leftAlare, rightAlare
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 1 (Direct attractiveness evidence)
- Evidence type: direct-attractiveness
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 1
- Measurement reliability prior: 0.75
- Formula compatibility: 0.45
- Scoring shape: lower-is-better
- Source population: Attractiveness experiments on symmetry and averageness, not a single demographic cutoff
- Aesthetic target: 0–1.2 percent. Harmony range: 0–6 percent.
- Formula notes: Direction (lower asymmetry scores higher) follows the experiments. The percent scale is a HarmonyLabs photographic summary.
- Accuracy budget: Alar points yaw
- Limitations: The literature supports a modest preference for symmetry. It does not publish this percent cutoff. The low end is a measurement-noise deadband. Natural asymmetry inside the harmony range is expected. These are 2D photographic differences, not the fluctuating-asymmetry indices used in the cited experiments.
- References: Rhodes G (2006). The evolutionary psychology of facial beauty. PMID 16318594. Population: Review of averageness, symmetry, and sexual dimorphism research. Annual review of experimental attractiveness research. Rhodes G, Yoshikawa S, Clark A, Lee K, McKay R, Akamatsu S (2001). Attractiveness of facial averageness and symmetry in non-Western cultures: in search of biologically based standards of beauty. PMID 11430245. Population: Cross-cultural samples including Japanese and Caucasian faces. Averageness and symmetry manipulations rated for attractiveness. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings. Van Dongen S (2011). Associations between asymmetry and human attractiveness: possible evidence for an evolved adaptation. PMID 21271817. Population: Review and analysis of fluctuating asymmetry and attractiveness. Quantitative review. The association is real and small.

## Nasal midline deviation

- Metric ID: `nasal-midline-deviation`
- View: front
- Formula: 100 * |pronasale.x − pupil midline| / face width
- Landmarks: pronasale, leftPupil, rightPupil, leftZygion, rightZygion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 1 (Direct attractiveness evidence)
- Evidence type: direct-attractiveness
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 1
- Measurement reliability prior: 0.7
- Formula compatibility: 0.45
- Scoring shape: lower-is-better
- Source population: Attractiveness experiments on symmetry and averageness, not a single demographic cutoff
- Aesthetic target: 0–1.2 percent. Harmony range: 0–3.5 percent.
- Formula notes: Direction (lower asymmetry scores higher) follows the experiments. The percent scale is a HarmonyLabs photographic summary.
- Accuracy budget: Pronasale pupil midline approximate face width in the denominator
- Limitations: The literature supports a modest preference for symmetry. It does not publish this percent cutoff. The low end is a measurement-noise deadband. Natural asymmetry inside the harmony range is expected. These are 2D photographic differences, not the fluctuating-asymmetry indices used in the cited experiments.
- References: Rhodes G (2006). The evolutionary psychology of facial beauty. PMID 16318594. Population: Review of averageness, symmetry, and sexual dimorphism research. Annual review of experimental attractiveness research. Rhodes G, Yoshikawa S, Clark A, Lee K, McKay R, Akamatsu S (2001). Attractiveness of facial averageness and symmetry in non-Western cultures: in search of biologically based standards of beauty. PMID 11430245. Population: Cross-cultural samples including Japanese and Caucasian faces. Averageness and symmetry manipulations rated for attractiveness. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings. Van Dongen S (2011). Associations between asymmetry and human attractiveness: possible evidence for an evolved adaptation. PMID 21271817. Population: Review and analysis of fluctuating asymmetry and attractiveness. Quantitative review. The association is real and small.

## Mouth width to IPD

- Metric ID: `mouth-width-ipd`
- View: front
- Formula: distance(leftCheilion, rightCheilion) / distance(leftPupil, rightPupil)
- Landmarks: leftCheilion, rightCheilion, leftPupil, rightPupil
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 3 (Anthropometric proportional evidence)
- Evidence type: anthropometric-proportion
- Evidence level: low
- Harmony eligible: yes
- Evidence weight: 0.4
- Measurement reliability prior: 0.84
- Formula compatibility: 0.7
- Scoring shape: extremeness
- Source population: Cross-population anthropometry. No ancestry is inferred, and the band is intentionally wide.
- Harmony range: 0.65–1.15 ratio.
- Formula notes: Mouth-corner width over interpupillary distance. No copied optimum.
- Accuracy budget: Cheilion pupils smile
- Limitations: There is no formula-compatible attractiveness optimum for this ratio. The interval is a disproportion screen. Values inside it are not ranked toward a population mean. Equal neoclassical canons and phi are not targets. Mouth-corner width over interpupillary distance. No copied optimum.
- References: Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings.

## Upper-to-lower lip

- Metric ID: `lip-height-ratio`
- View: front
- Formula: vertical(labialeSuperius, stomion) / vertical(stomion, labialeInferius)
- Landmarks: labialeSuperius, stomion, labialeInferius
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 3 (Anthropometric proportional evidence)
- Evidence type: anthropometric-proportion
- Evidence level: low
- Harmony eligible: yes
- Evidence weight: 0.4
- Measurement reliability prior: 0.75
- Formula compatibility: 0.7
- Scoring shape: extremeness
- Source population: Cross-population anthropometry. No ancestry is inferred, and the band is intentionally wide.
- Harmony range: 0.35–1.05 ratio.
- Formula notes: Upper vermilion over lower vermilion. A 1:1.618 lip ratio is not used.
- Accuracy budget: Vermilion borders lip color and shadow expression
- Limitations: There is no formula-compatible attractiveness optimum for this ratio. The interval is a disproportion screen. Values inside it are not ranked toward a population mean. Equal neoclassical canons and phi are not targets. Upper vermilion over lower vermilion. A 1:1.618 lip ratio is not used.
- References: Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings.

## Philtrum proportion

- Metric ID: `philtrum-proportion`
- View: front
- Formula: vertical(subnasale, labialeSuperius) / vertical(subnasale, menton)
- Landmarks: subnasale, labialeSuperius, menton
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 3 (Anthropometric proportional evidence)
- Evidence type: anthropometric-proportion
- Evidence level: low
- Harmony eligible: yes
- Evidence weight: 0.4
- Measurement reliability prior: 0.8
- Formula compatibility: 0.7
- Scoring shape: extremeness
- Source population: Cross-population anthropometry. No ancestry is inferred, and the band is intentionally wide.
- Harmony range: 0.18–0.45 ratio.
- Formula notes: Subnasale-to-labiale superius over subnasale-to-menton.
- Accuracy budget: Subnasale lip border chin
- Limitations: There is no formula-compatible attractiveness optimum for this ratio. The interval is a disproportion screen. Values inside it are not ranked toward a population mean. Equal neoclassical canons and phi are not targets. Subnasale-to-labiale superius over subnasale-to-menton.
- References: Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings.

## Mouth corner level

- Metric ID: `mouth-level-asymmetry`
- View: front
- Formula: 100 * |leftCheilion.y − rightCheilion.y| / mouth width
- Landmarks: leftCheilion, rightCheilion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 1 (Direct attractiveness evidence)
- Evidence type: direct-attractiveness
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 1
- Measurement reliability prior: 0.72
- Formula compatibility: 0.45
- Scoring shape: lower-is-better
- Source population: Attractiveness experiments on symmetry and averageness, not a single demographic cutoff
- Aesthetic target: 0–1.2 percent. Harmony range: 0–5 percent.
- Formula notes: Direction (lower asymmetry scores higher) follows the experiments. The percent scale is a HarmonyLabs photographic summary.
- Accuracy budget: Cheilion smile or speech
- Limitations: The literature supports a modest preference for symmetry. It does not publish this percent cutoff. The low end is a measurement-noise deadband. Natural asymmetry inside the harmony range is expected. These are 2D photographic differences, not the fluctuating-asymmetry indices used in the cited experiments.
- References: Rhodes G (2006). The evolutionary psychology of facial beauty. PMID 16318594. Population: Review of averageness, symmetry, and sexual dimorphism research. Annual review of experimental attractiveness research. Rhodes G, Yoshikawa S, Clark A, Lee K, McKay R, Akamatsu S (2001). Attractiveness of facial averageness and symmetry in non-Western cultures: in search of biologically based standards of beauty. PMID 11430245. Population: Cross-cultural samples including Japanese and Caucasian faces. Averageness and symmetry manipulations rated for attractiveness. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings. Van Dongen S (2011). Associations between asymmetry and human attractiveness: possible evidence for an evolved adaptation. PMID 21271817. Population: Review and analysis of fluctuating asymmetry and attractiveness. Quantitative review. The association is real and small.

## Chin-to-jaw width

- Metric ID: `chin-jaw-width`
- View: front
- Formula: distance(leftChinLateral, rightChinLateral) / distance(leftGonion, rightGonion)
- Landmarks: leftChinLateral, rightChinLateral, leftGonion, rightGonion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 3 (Anthropometric proportional evidence)
- Evidence type: anthropometric-proportion
- Evidence level: low
- Harmony eligible: yes
- Evidence weight: 0.4
- Measurement reliability prior: 0.42
- Formula compatibility: 0.7
- Scoring shape: extremeness
- Source population: Cross-population anthropometry. No ancestry is inferred, and the band is intentionally wide.
- Harmony range: 0.55–1 ratio.
- Formula notes: Lateral chin over approximate gonion width.
- Accuracy budget: Chin points approximate gonion
- Limitations: There is no formula-compatible attractiveness optimum for this ratio. The interval is a disproportion screen. Values inside it are not ranked toward a population mean. Equal neoclassical canons and phi are not targets. Lateral chin over approximate gonion width.
- References: Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings.

## Jaw level

- Metric ID: `jaw-level-symmetry`
- View: front
- Formula: 100 * |leftGonion.y − rightGonion.y| / facial height
- Landmarks: leftGonion, rightGonion, foreheadApex, menton
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 1 (Direct attractiveness evidence)
- Evidence type: direct-attractiveness
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 1
- Measurement reliability prior: 0.4
- Formula compatibility: 0.45
- Scoring shape: lower-is-better
- Source population: Attractiveness experiments on symmetry and averageness, not a single demographic cutoff
- Aesthetic target: 0–1.2 percent. Harmony range: 0–5 percent.
- Formula notes: Direction (lower asymmetry scores higher) follows the experiments. The percent scale is a HarmonyLabs photographic summary.
- Accuracy budget: Approximate gonion mesh facial height
- Limitations: The literature supports a modest preference for symmetry. It does not publish this percent cutoff. The low end is a measurement-noise deadband. Natural asymmetry inside the harmony range is expected. These are 2D photographic differences, not the fluctuating-asymmetry indices used in the cited experiments.
- References: Rhodes G (2006). The evolutionary psychology of facial beauty. PMID 16318594. Population: Review of averageness, symmetry, and sexual dimorphism research. Annual review of experimental attractiveness research. Rhodes G, Yoshikawa S, Clark A, Lee K, McKay R, Akamatsu S (2001). Attractiveness of facial averageness and symmetry in non-Western cultures: in search of biologically based standards of beauty. PMID 11430245. Population: Cross-cultural samples including Japanese and Caucasian faces. Averageness and symmetry manipulations rated for attractiveness. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings. Van Dongen S (2011). Associations between asymmetry and human attractiveness: possible evidence for an evolved adaptation. PMID 21271817. Population: Review and analysis of fluctuating asymmetry and attractiveness. Quantitative review. The association is real and small.

## Eye level

- Metric ID: `eye-level-asymmetry`
- View: front
- Formula: 100 * |leftPupil.y − rightPupil.y| / interpupillary distance
- Landmarks: leftPupil, rightPupil
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 1 (Direct attractiveness evidence)
- Evidence type: direct-attractiveness
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 1
- Measurement reliability prior: 0.8
- Formula compatibility: 0.45
- Scoring shape: lower-is-better
- Source population: Attractiveness experiments on symmetry and averageness, not a single demographic cutoff
- Aesthetic target: 0–1.2 percent. Harmony range: 0–4 percent.
- Formula notes: Direction (lower asymmetry scores higher) follows the experiments. The percent scale is a HarmonyLabs photographic summary.
- Accuracy budget: Pupil vertical localization camera roll expression
- Limitations: The literature supports a modest preference for symmetry. It does not publish this percent cutoff. The low end is a measurement-noise deadband. Natural asymmetry inside the harmony range is expected. These are 2D photographic differences, not the fluctuating-asymmetry indices used in the cited experiments.
- References: Rhodes G (2006). The evolutionary psychology of facial beauty. PMID 16318594. Population: Review of averageness, symmetry, and sexual dimorphism research. Annual review of experimental attractiveness research. Rhodes G, Yoshikawa S, Clark A, Lee K, McKay R, Akamatsu S (2001). Attractiveness of facial averageness and symmetry in non-Western cultures: in search of biologically based standards of beauty. PMID 11430245. Population: Cross-cultural samples including Japanese and Caucasian faces. Averageness and symmetry manipulations rated for attractiveness. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings. Van Dongen S (2011). Associations between asymmetry and human attractiveness: possible evidence for an evolved adaptation. PMID 21271817. Population: Review and analysis of fluctuating asymmetry and attractiveness. Quantitative review. The association is real and small.

## Chin midline deviation

- Metric ID: `chin-midline-deviation`
- View: front
- Formula: 100 * |menton.x − pupil midline| / face width
- Landmarks: menton, leftPupil, rightPupil, leftZygion, rightZygion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 1 (Direct attractiveness evidence)
- Evidence type: direct-attractiveness
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 1
- Measurement reliability prior: 0.68
- Formula compatibility: 0.45
- Scoring shape: lower-is-better
- Source population: Attractiveness experiments on symmetry and averageness, not a single demographic cutoff
- Aesthetic target: 0–1.2 percent. Harmony range: 0–3.5 percent.
- Formula notes: Direction (lower asymmetry scores higher) follows the experiments. The percent scale is a HarmonyLabs photographic summary.
- Accuracy budget: Menton pupil midline approximate face width
- Limitations: The literature supports a modest preference for symmetry. It does not publish this percent cutoff. The low end is a measurement-noise deadband. Natural asymmetry inside the harmony range is expected. These are 2D photographic differences, not the fluctuating-asymmetry indices used in the cited experiments.
- References: Rhodes G (2006). The evolutionary psychology of facial beauty. PMID 16318594. Population: Review of averageness, symmetry, and sexual dimorphism research. Annual review of experimental attractiveness research. Rhodes G, Yoshikawa S, Clark A, Lee K, McKay R, Akamatsu S (2001). Attractiveness of facial averageness and symmetry in non-Western cultures: in search of biologically based standards of beauty. PMID 11430245. Population: Cross-cultural samples including Japanese and Caucasian faces. Averageness and symmetry manipulations rated for attractiveness. Langlois JH, Kalakanis L, Rubenstein AJ, Larson A, Hallam M, Smoot M (2000). Maxims or myths of beauty? A meta-analytic and theoretical review. PMID 10825783. Population: Meta-analysis of facial attractiveness judgments. Meta-analytic review of agreement, averageness, and related attractiveness findings. Van Dongen S (2011). Associations between asymmetry and human attractiveness: possible evidence for an evolved adaptation. PMID 21271817. Population: Review and analysis of fluctuating asymmetry and attractiveness. Quantitative review. The association is real and small.

## Facial convexity

- Metric ID: `facial-convexity`
- View: profile
- Formula: angle(glabella, subnasale, pogonion)
- Landmarks: glabella, subnasale, pogonion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 2 (Established aesthetic evidence)
- Evidence type: aesthetic-harmony
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 0.75
- Measurement reliability prior: 0.7
- Formula compatibility: 0.78
- Scoring shape: peaked-target
- Source population: Neutral target: Fortes et al. pleasant profiles (n = 30). Masculine and feminine centers: cephalometric profile-angle maxima in Chinese adults (PMID 40742908), used only when that presentation is selected.
- Aesthetic target: 165.3–173.1 (center 169.2) degrees. Harmony range: 160–178 degrees. Population range: 155–180 degrees.
- Formula notes: HarmonyLabs uses the interior angle at subnasale between glabella and pogonion, matching Fortes G′–Sn–Pg′ more closely than total convexity G′–Pn–Pg′.
- Accuracy budget: Profile yaw short of a true lateral glabella and pogonion on the contour perspective expression
- Limitations: The pleasant-cohort mean is not a proof that 169.2° is the unique optimum. Presentation-specific centers come from cephalograms correlated with photo ratings, not from the same 2D construction. Naini 2012 supports straighter profiles but uses a different convexity angle, so its ±10° to −12° limits are not copied.
- References: Fortes HNR, Guimarães TC, Belo IML, Matta ENR (2014). Photometric analysis of esthetically pleasant and unpleasant facial profile. PMID 24945516. Population: Pleasant versus unpleasant profile photographs; 30 pleasant profiles. Photometric soft-tissue angles, including facial convexity G′–Sn–Pg′. Reported on PubMed as PMID 40742908 (2025). A study on gender differences in the maximum attractiveness values for cephalometric measures. PMID 40742908. Population: 180 untreated Chinese adults (90 male, 90 female) rated from photographs by 16 laypersons; measures taken from cephalograms. Quadratic association between cephalometric measures and photograph attractiveness. Profile-angle maxima were 169.6° (male) and 167.3° (female). Naini FB, Donaldson ANA, McDonald F, Cobourne MT (2012). Assessing the influence of lower facial profile convexity on perceived attractiveness in the orthognathic patient, clinician, and layperson. PMID 22883980. Population: Patients, laypeople, and clinicians rating an altered profile. Lower-face convexity was varied from +14° to −16°. Anić-Milošević S, Lapter-Varga M, Šlaj M (2008). Soft-tissue facial profile of attractive Croatian adults. PMID 18263886. Population: Aesthetically harmonious Croatian adults. Soft-tissue profile measurements in a selected harmonious cohort.

## Nasofrontal angle

- Metric ID: `nasofrontal-angle`
- View: profile
- Formula: angle(glabella, nasion, rhinion)
- Landmarks: glabella, nasion, rhinion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 110–145 degrees.
- Formula notes: Contour smoothing stabilizes the points. The angle stays informational.
- Accuracy budget: Nasion dorsum tangent profile yaw
- Limitations: The point angle glabella–nasion–rhinion only approximates a forehead tangent against the dorsum. Textbook nasofrontal ranges were not attached, because the tangent construction and the study population would not match.
- References: Anić-Milošević S, Lapter-Varga M, Šlaj M (2008). Soft-tissue facial profile of attractive Croatian adults. PMID 18263886. Population: Aesthetically harmonious Croatian adults. Soft-tissue profile measurements in a selected harmonious cohort. Google (2023). MediaPipe Face Landmarker. no indexed id. Population: Face mesh model, 478 landmarks. Official Face Landmarker documentation for the pinned float16 task.

## Nasofacial angle

- Metric ID: `nasofacial-angle`
- View: profile
- Formula: smaller angle between line(nasion, rhinion) and line(glabella, pogonion)
- Landmarks: nasion, rhinion, glabella, pogonion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 25–45 degrees.
- Formula notes: Different reference line. Informational only.
- Accuracy budget: Dorsum points pogonion missing Frankfort horizontal
- Limitations: HarmonyLabs measures the smaller angle between nasion–rhinion and glabella–pogonion. Okumura et al. measured nasion–pronasale against a Frankfort vertical. Those 30° and 33° preferences are not copied.
- References: Okumura K, Tamura T, Teranishi H, Funakoshi Y (2025). Ideal nasal angle preferences among Japanese people: a prospective observational study on aesthetic perception. PMID 40678082. Population: 783 Japanese adults, mostly women, rating one male and one female Japanese 3D profile. Nasolabial angle, defined by a columella tangent and an upper-lip tangent at subnasale, was shown at 95°, 105°, and 115°.

## Nasolabial angle

- Metric ID: `nasolabial-angle`
- View: profile
- Formula: angle(columella, subnasale, labialeSuperius)
- Landmarks: columella, subnasale, labialeSuperius
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 1 (Direct attractiveness evidence)
- Evidence type: direct-attractiveness
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 1
- Measurement reliability prior: 0.62
- Formula compatibility: 0.72
- Scoring shape: flat-target
- Source population: 783 Japanese adults rating one male and one female Japanese profile (Okumura et al. 2025)
- Aesthetic target: 95–105 degrees. Harmony range: 90–115 degrees.
- Formula notes: The cited angle is the columella tangent against the upper-lip tangent at subnasale. HarmonyLabs approximates those tangents with columella, subnasale, and labiale superius on a smoothed profile contour.
- Accuracy budget: Columella localization upper-lip contour expression profile yaw perspective contour smoothing
- Limitations: Only three angles were tested: 95°, 105°, and 115°. The peak is the best of those steps, not a continuous fit. Raters were predominantly women. Two model faces cannot represent every population. Sinno et al. used a Frankfort-perpendicular definition. Those degrees are not applied. Fortes et al. did not find nasolabial angle separated pleasant from unpleasant profiles.
- References: Okumura K, Tamura T, Teranishi H, Funakoshi Y (2025). Ideal nasal angle preferences among Japanese people: a prospective observational study on aesthetic perception. PMID 40678082. Population: 783 Japanese adults, mostly women, rating one male and one female Japanese 3D profile. Nasolabial angle, defined by a columella tangent and an upper-lip tangent at subnasale, was shown at 95°, 105°, and 115°. Sinno HH, Markarian MK, Ibrahim AMS, Lin SJ (2012). Defining the ideal nasolabial angle. PMID 22090249. Population: Altered rhinoplasty photographs rated by 16 observers. Nasolabial angle defined with a line through the nostril aperture and a perpendicular to Frankfort horizontal. Fortes HNR, Guimarães TC, Belo IML, Matta ENR (2014). Photometric analysis of esthetically pleasant and unpleasant facial profile. PMID 24945516. Population: Pleasant versus unpleasant profile photographs; 30 pleasant profiles. Photometric soft-tissue angles, including facial convexity G′–Sn–Pg′.

## Mentolabial angle

- Metric ID: `mentolabial-angle`
- View: profile
- Formula: angle(labialeInferius, sublabiale, pogonion)
- Landmarks: labialeInferius, sublabiale, pogonion
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 1 (Direct attractiveness evidence)
- Evidence type: direct-attractiveness
- Evidence level: moderate
- Harmony eligible: yes
- Evidence weight: 1
- Measurement reliability prior: 0.6
- Formula compatibility: 0.8
- Scoring shape: flat-target
- Source population: Observers of one idealized male Caucasian silhouette (Naini et al. 2017)
- Aesthetic target: 107–118 degrees. Harmony range: 98–140 degrees. Population range: 90–150 degrees.
- Formula notes: The angle at sublabiale between labiale inferius and pogonion matches the mentolabial angle that was manipulated.
- Accuracy budget: Finding the mentolabial sulcus on the contour lip posture profile yaw pogonion
- Limitations: The manipulation used a male silhouette. The feminine profile therefore keeps the acceptable span and does not invent a female optimum. Farkas population means differ by sex and ancestry and are shown as population context, not as the target. A silhouette has no photographic texture, expression, or lens distortion.
- References: Naini FB, Cobourne MT, Garagiola U, McDonald F, Wertheim D (2017). Mentolabial angle and aesthetics: a quantitative investigation of idealized and normative values. PMID 28217687. Population: Observers rating an idealized male Caucasian profile silhouette: 75 patients, 75 lay people, 35 clinicians. The mentolabial angle of one male silhouette was varied from 84° to 162° and rated on a Likert scale. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph.

## Nasal projection

- Metric ID: `nasal-projection`
- View: profile
- Formula: distance from pronasale to line(nasion, subnasale) / distance(nasion, pronasale)
- Landmarks: pronasale, nasion, subnasale
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: 0.2–0.6 ratio.
- Formula notes: Labelled as a HarmonyLabs construction. Clinical 0.55–0.60 norms are not used.
- Accuracy budget: Pronasale nasion–subnasale line perspective profile yaw
- Limitations: Custom HarmonyLabs tip offset: distance from pronasale to the nasion–subnasale line, divided by nasion–pronasale. This is not Goode's ratio. The alar-facial groove is not on the anterior silhouette, so a Goode target is not applied.
- References: Paskhover B, et al. (2018). Nasal distortion in short-distance photographs: the selfie effect. PMID 29494735. Population: Nasal appearance at selfie distances versus a standardized distance. Compared nasal dimensions as camera distance decreased. Google (2023). MediaPipe Face Landmarker. no indexed id. Population: Face mesh model, 478 landmarks. Official Face Landmarker documentation for the pinned float16 task.

## Chin projection

- Metric ID: `chin-projection`
- View: profile
- Formula: signed distance from pogonion to line(glabella, menton) / distance(subnasale, menton)
- Landmarks: pogonion, glabella, menton, subnasale
- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.
- Evidence tier: 4 (Informational only)
- Evidence type: unsupported
- Evidence level: insufficient
- Harmony eligible: no
- Evidence weight: 0
- Measurement reliability prior: 0.45
- Formula compatibility: 0.3
- Scoring shape: extremeness
- Source population: Not used as a Harmony reference
- Harmony range: -0.06–0.16 ratio.
- Formula notes: Informational, so it cannot double-count convexity.
- Accuracy budget: Pogonion glabella–menton line profile yaw
- Limitations: Custom signed offset of pogonion from the glabella–menton line, divided by subnasale–menton. Facial convexity already carries the scored profile relationship. This construction is not given a separate clinical norm.
- References: Khoshab N, et al. (2021). Historical tools of anthropometric facial assessment: a systematic raw data analysis on the applicability of the neoclassical canons and golden ratio. PMID 34515761. Population: Systematic raw-data analysis across published anthropometric samples. Tested neoclassical canons and phi against measured faces. Fang F, Clapham PJ, Chung KC (2011). A systematic review of interethnic variability in facial dimensions. PMID 21285791. Population: Published anthropometric samples across ethnic groups. Systematic review of linear facial dimensions. Farkas LG (1994). Anthropometry of the Head and Face. no indexed id. Population: North American and comparative anthropometric samples. Direct anthropometry reference monograph. Google (2023). MediaPipe Face Landmarker. no indexed id. Population: Face mesh model, 478 landmarks. Official Face Landmarker documentation for the pinned float16 task.
