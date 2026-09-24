# HarmonyLabs

HarmonyLabs measures facial geometry from a front photograph and a side-profile photograph. Computer vision proposes landmarks. You can move them. Distances, angles, and ratios are then calculated from those points.

Harmony V2 compares those measurements with research-backed attractiveness, aesthetic-harmony, and proportional references. Stronger evidence receives greater influence. Harmony is not a clinical diagnostic score. It is not a perfect or universal mathematical definition of attractiveness.

## Architecture

```text
Image
→ standardized capture
→ MediaPipe landmarks
→ robust multi-frame geometry
→ semantic / anatomical landmarks
→ deterministic measurements
→ evidence-tier comparison
→ reliability-weighted aggregation
→ Harmony
```

An optional language model can explain the structured report. It does not create the measurements or the score. If no model is configured, HarmonyLabs answers from the same structured numbers.

Left-facing profiles are mirrored into a right-facing frame before landmark mapping, and the stored photograph is flipped to match. Anterior is the larger x direction.

## Local setup

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. Without `NEXT_PUBLIC_CONVEX_URL`, development sign-in is available on the login page and analyses are stored under `.data/`. That path is ignored by git and is not available in production. With Convex configured, run `pnpm exec convex dev` beside the Next.js server.

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Production | Convex deployment URL. Accounts, analyses, and photographs are stored there. |
| `AI_API_KEY` | Optional | Key for an OpenAI-compatible chat API |
| `AI_BASE_URL` | Optional | API origin, for example `https://api.openai.com/v1` |
| `AI_MODEL` | Optional | Model name sent with explanation requests |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | Optional | Upload limit. Defaults to 10 |
| `HARMONYLABS_DEV_AUTH` | Optional | Set to `0` to disable development sign-in |
| `HARMONYLABS_DEV_SECRET` | Optional | Signs the development session cookie |
| `HARMONYLABS_DATA_DIR` | Optional | Overrides the local JSON store directory |

`NEXT_PUBLIC_E2E=1` replaces the face detector with a fixture mesh. It is ignored in production.

## Convex

Production sign-in is email and password through Convex Auth. Photographs are stored in Convex file storage and are readable only by the account that uploaded them. Deleting an analysis or an account removes those files.

`pnpm exec convex dev` creates the local deployment, generates `convex/_generated`, and keeps functions in sync. `pnpm exec convex deploy` publishes the production deployment. Set `NEXT_PUBLIC_CONVEX_URL` to that deployment's URL before building the Next.js app. The JWT signing keys live on the Convex deployment, not in the Next.js environment.

## Computer vision

MediaPipe indexes live only in `src/lib/face/mediapipe-map.ts`. The rest of the app uses semantic names such as `nasion` and `pronasale`. Points that the mesh does not mark directly, including zygion, gonion, columella, stomion, sublabiale, and pogonion, are derived and can be dragged.

The Face Landmarker task, the WASM runtime, and the `@mediapipe/tasks-vision` package are pinned together in `src/lib/mediapipe/assets.ts` (`tasks-vision` 0.10.35, float16 Face Landmarker task 1). Detection stays in the browser. Face photographs are not sent to a language model.

## Scoring

Harmony V2 (`harmony-v2`) scores each eligible measurement against an aesthetic target and a wider harmony range. A value at a supported center can score 10. The rest of the harmony range declines smoothly and does not score 10. Evidence quality does not change that measurement score. It changes how much the measurement can move Harmony.

Aggregation is metric, then feature group, then view. Front Harmony and Profile Harmony are always reported separately. Combined Harmony is the reliability-weighted average of the measured feature groups. It is not a 62% / 38% mix. Correlated ratios share a group, so adding another ratio does not add another vote. Tier 3 anthropometric metrics can contribute modestly and cannot, as a group, outvote stronger evidence.

`src/lib/face/scoring/reference-ranges.ts` is the frozen Harmony V1 table. New analyses do not use it. Stored V1 results stay on `harmony-v1` and are not rewritten. Comparisons warn when the two scoring versions differ.

Optional masculine and feminine reference profiles are applied only when the user selects them. HarmonyLabs does not infer sex, gender, race, or ethnicity, and it does not estimate age. Aesthetic scoring is withheld unless the analysis is acknowledged as an adult.

The per-metric registry, formulas, and citations are in `docs/measurement-evidence.md`. The validation model is in `docs/HARMONYLABS_VALIDATION_AND_EVIDENCE.md`.

## Testing

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```

End-to-end tests start the app on port 3010 with the detector fixture enabled. Install Playwright's Chromium once with `pnpm exec playwright install chromium`.

Headless tests cover upload, landmark review, and the report. A phone camera cannot be validated there. On a device, check front, three-quarter, and side: the three-quarter step should appear as soon as the front photo is accepted, the preview should feel like a mirror, a halfway turn should capture on the three-quarter step, and only a true side view should capture on the side step. The turned stages show brackets and how far to turn, not a drawn face.

## Omitted on purpose

These were left out because a 2D mesh cannot measure them reliably, or because they are future modules rather than part of this score:

- Treating the MediaPipe forehead-mesh boundary as trichion. The mesh shares are informational. Hairline-to-chin length is scored only if you place trichion.
- Palpated bizygomatic breadth and a true gonial angle. Zygion and gonion in this app are geometric approximations.
- Calibrated millimetre scale. Every metric is a ratio, a percent, or an angle.
- Angularity, feature ratings, surgical simulation, and visual skin assessments. `src/lib/face/scoring/modules.ts` records them as not implemented so they stay separate from geometry.
