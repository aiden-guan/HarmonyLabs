# FaceLab

FaceLab measures facial geometry from a front photograph and a side-profile photograph. Computer vision proposes landmarks. You can move them. Distances, angles, and ratios are then calculated from those points, and a Harmony score compares the results with configurable reference ranges.

Harmony is a proportional reference score for this application. It is not a clinical assessment and it is not an objective measure of attractiveness.

## Architecture

```text
Image
→ MediaPipe Face Landmarker (in the browser)
→ Semantic landmarks
→ Geometry engine
→ Metric engine
→ Scoring engine
→ Report
```

An optional language model can explain the structured report. It does not create the measurements or the score. If no model is configured, FaceLab answers from the same structured numbers.

Left-facing profiles are mirrored into a right-facing frame before landmark mapping, and the stored photograph is flipped to match. Anterior is the larger x direction.

## Local setup

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. Without Supabase environment variables, development sign-in is available on the login page and analyses are stored under `.data/`. That path is ignored by git and is not available in production.

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Public anon key used by the browser and the user-scoped server client |
| `SUPABASE_SERVICE_ROLE_KEY` | Only to delete the auth user | Server-only. Removes the Supabase login when account data is deleted |
| `AI_API_KEY` | Optional | Key for an OpenAI-compatible chat API |
| `AI_BASE_URL` | Optional | API origin, for example `https://api.openai.com/v1` |
| `AI_MODEL` | Optional | Model name sent with explanation requests |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | Optional | Upload limit. Defaults to 10 |
| `FACELAB_DEV_AUTH` | Optional | Set to `0` to disable development sign-in |
| `FACELAB_DEV_SECRET` | Optional | Signs the development session cookie |
| `FACELAB_DATA_DIR` | Optional | Overrides the local JSON store directory |

`NEXT_PUBLIC_E2E=1` replaces the face detector with a fixture mesh. It is ignored in production.

## Supabase

Apply the migration in `supabase/migrations/20260922120000_init.sql`. It creates the tables, enables row-level security, and creates a private `analysis-photos` bucket. Storage paths are `{userId}/{analysisId}/{view}`.

In the Supabase dashboard:

1. Enable Google and email sign-in.
2. Add `http://localhost:3000/auth/callback` and the production callback URL to the redirect allow list.
3. Confirm the `analysis-photos` bucket is private.

The application deletes storage objects when an analysis or account is deleted. SQL cascades do not remove Storage files by themselves.

## Computer vision

MediaPipe indexes live only in `src/lib/face/mediapipe-map.ts`. The rest of the app uses semantic names such as `nasion` and `pronasale`. Points that the mesh does not mark directly, including zygion, gonion, columella, stomion, sublabiale, and pogonion, are derived and can be dragged.

The model file and WASM runtime are loaded from public CDNs the first time a photograph is analyzed. Detection stays in the browser.

## Scoring

Each metric scores 10 inside its reference band. Outside the band, the score falls with a Gaussian curve controlled by that metric's sigma. Category scores are weighted averages. The front score and profile score are weighted averages of the metrics in that view. Harmony is 62% front and 38% profile.

Ranges in `src/lib/face/scoring/reference-ranges.ts` are labeled experimental. They can later be replaced with literature values or with sex- and age-specific tables. This version does not collect sex, because it does not use sex-specific ranges.

Impact is the change in Harmony if that one metric scored 10 and every other score stayed the same.

## Testing

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```

End-to-end tests start the app on port 3010 with the detector fixture enabled. Install Playwright's Chromium once with `pnpm exec playwright install chromium`.

## Omitted on purpose

These were left out because a 2D mesh cannot measure them reliably, or because they are future modules rather than part of this score:

- True trichion / hairline. The upper third uses the mesh forehead apex.
- Palpated bizygomatic breadth and gonial angle.
- Calibrated millimetre scale. Every metric is a ratio, a percent, or an angle.
- Angularity, feature ratings, surgical simulation, and visual skin assessments. `src/lib/face/scoring/modules.ts` records them as not implemented so they stay separate from geometry.
