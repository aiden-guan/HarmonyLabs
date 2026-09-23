# Changelog

## 2026-09-23 — Capture pipeline

### Summary
The front camera capture now advances to the three-quarter step after a local check, instead of waiting on a new face model, a full-frame lens loop, and two network saves. A three-quarter pose stays its own stage. The side stage after it asks for a true lateral outline.

### Added
- Persistent still-image FaceLandmarker worker, reused across photographs, with request ids, timeout, and shutdown.
- Live camera mesh reuse when the last detection is fresh, with a still-image fallback when it is not.
- A camera session that keeps the media stream and live detector from the front step through the profile step.
- Off-thread lens correction so the saved photograph and the stored landmarks stay in the same coordinate frame.
- One `POST /api/analyses/[analysisId]/captures` request for the photo, its quality, and its landmarks.
- A stricter profile pose classifier (`frontal`, `threeQuarter`, `nearlyLateral`, `lateral`) with temporal hysteresis before auto-capture.
- The capture wizard has a three-quarter stage, then a side stage. The side stage draws a lateral head and rejects a halfway turn. The three-quarter stage keeps the looser pose.

### Changed
- Camera statistics come from a small sample. The camera path no longer decodes and re-encodes the JPEG just to measure blur.
- Profile distance uses facial height. Profile centering uses a point behind the nose so the nose is not forced into the middle of the frame.
- Both front and profile previews are mirrored. Saved pixels stay in camera orientation.
- Background saves can be retried. Photo check waits until the front and profile saves have finished.

### Tests
- Profile pose cases cover frontal, mild turn, three-quarter, near profile, true left and right profiles, tilt, and noisy versus stable frames.
- Capture routing tests cover a fresh live mesh, a stale mesh, one reused still-image worker, and a camera session that survives the front-to-profile step.

## 2026-09-23

### Summary
Complete production-quality UI/UX overhaul transforming the application from an early MVP into a polished facial measurement product, featuring an original MogLabs design system, refined top navigation, photo-forward result reports, interactive measurement studio, and a client-side 1080×1350 (4:5) shareable result card with Web Share API and PNG download fallback.

### Architectural & Functional Highlights
| Component / Layer | Change | Impact |
| :--- | :--- | :--- |
| **Shareable result image** | Client-side Canvas rendering (1080×1350, 4:5 portrait) with landmark-aware cover crop and computed typography | High-resolution social export (Instagram/X/Discord) featuring front photograph, Harmony score, and MogLabs branding without server-side image leakage |
| **Share dialog & preview** | Dedicated `ResultSharePreview` component, Web Share API integration, automatic Download PNG fallback | Native mobile sheet sharing where supported; instant direct PNG download everywhere |
| **Canvas font rendering** | Resolved computed font families dynamically to fix Canvas rejection of CSS `var()` shorthand | Restored proper bold typography on generated PNG cards across all browsers |
| **Application navigation** | Replaced 220px desktop sidebar with responsive top application header and mobile drawer | Maximizes horizontal workspace for photography while keeping Dashboard, Analyze, Compare, and New analysis accessible |
| **Design system & tokens** | Refactored `globals.css` with semantic color, surface, and typography tokens | Cohesive visual language sitting between FaceIQ Labs restraint and modern research analytics; eliminated AI-slop motifs |
| **Result report hero** | Redesigned `analysis-view.tsx` with photo-forward report card and score hierarchy | Displays front photograph, prominent Harmony reference score, Front & Profile sub-scores, confidence ratings, and quick actions |
| **Category & insights** | Native 0–10 reference progress bars and three structured insight panels | Replaced raw charts with readable "Closest to reference", "Furthest from reference", and "Highest potential score impact" cards |
| **Measurement browser** | Two-column desktop studio with sticky detail panel, reference citations, and SVG overlays | Fluid filtering, instant search, and redesigned RangeTrack component while preserving scoring algorithms |
| **Dashboard** | Latest analysis hero card with front photo thumbnail, trend progression, and saved scans | Immediate visibility into latest scan results, progress over time, and scan history |
| **Capture flow** | 4-step guided wizard (Setup, Front, Profile, Check) with distinct quality badges | Clear separation between camera mode and upload mode without touching sensitive optical correction logic |
| **Branding normalization** | Normalized user-facing product branding from FaceLab to MogLabs | Unified product identity across metadata, headers, landing page, auth, reference citations, and dialogs |

### Detailed Changes

#### Added
- **Share system (`src/lib/share/` & `src/components/share/`)**:
  - `render-result-card.ts`: Deterministic 1080×1350 Canvas generator with 70% portrait cover crop, lab alignment brackets, high-resolution typography (120px Harmony score), and MogLabs brand mark.
  - `crop.ts`: Landmark-aware cover crop calculation with vertical centering on detected facial bounds and safe boundary clamping.
  - `result-share-preview.tsx`: Dedicated live 4:5 preview component with lab registration corners, loading spinner, and error handling.
  - `result-share-dialog.tsx`: Modal dialog with live preview, Web Share API (`navigator.share({ files: [...] })`), and PNG file download fallback.
- **UI primitives (`src/components/ui/`)**:
  - `card.tsx`: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter.
  - `badge.tsx`: Semantic badge variants (default, accent, success, warning, danger, outline).
  - `modal.tsx`: Accessible dialog with backdrop animation, Escape key listeners, and viewport height constraints (`max-h-[calc(100dvh-2rem)]`).
  - `tabs.tsx`: Accessible tab bar and segmented control primitives.
  - `score-display.tsx`: Standardized score typography component.
- **E2E and Unit Tests**:
  - `src/lib/share/crop.test.ts`: 7 unit tests for crop calculations, landmark-aware centering, and aspect ratio boundaries.
  - `src/lib/share/render-result-card.test.ts`: 4 unit tests for card dimensions, aspect ratios, and valid CSS font string generation without `var()`.
  - `e2e/analysis.spec.ts`: E2E spec verifying Share dialog opening, 4:5 preview rendering, PNG download event, and non-empty file assertion.
  - `e2e/responsive.spec.ts`: Multi-viewport responsive tests for 390px, 768px, and 1440px ensuring zero horizontal overflow on public and authenticated screens.

#### Changed / Refactored
- **Landing page (`src/app/page.tsx`)**: Replaced basic wireframe with scientific hero ("Your facial proportions, measured"), technical SVG facial thirds diagram, 4-step process cards, sample analysis preview, and privacy guarantees.
- **Dashboard (`src/components/analysis/dashboard-home.tsx`)**: Redesigned latest analysis hero with front photograph, refined Recharts progression line with tokenized tooltip, and saved scan cards.
- **Landmark editor (`src/components/landmark-editor/editor.tsx`)**: Upgraded toolbar, view switcher, landmark inspector card, and keyboard controls; removed duplicate outer header on `/analysis/[analysisId]/edit`.
- **Compare studio (`src/components/analysis/compare-view.tsx`)**: Added paired front photo thumbnails, head-to-head score deltas, and side-by-side metric tables.
- **Range track (`src/components/analysis/range-track.tsx`)**: Polished visual zones and indicators while keeping test-asserted labels and standing markers intact.
- **Login (`src/components/auth/login-form.tsx`)**: Redesigned centered authentication card with MogLabs branding and clear developer sign-in feedback.
- **Settings (`src/components/settings/settings-form.tsx`)**: Structured preference layout with distinct danger zone for account data deletion.
- **Local store (`src/lib/data/local-store.ts`)**: Made atomic temporary write filenames unique to eliminate concurrent write/rename race conditions during parallel test runs.

### Verification Proof
- `pnpm test` — 61 unit and component tests passed across 15 test suites.
- `pnpm typecheck` — 0 TypeScript errors.
- `pnpm lint` — 0 ESLint errors.
- `pnpm build` — Clean Next.js 16 production build.
- `pnpm test:e2e` — 10 Playwright tests passed end-to-end across multiple viewports and test suites.
