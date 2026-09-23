# Changelog

## 2026-09-23

### Summary
Phone cameras no longer stretch the preview, and face alignment uses a separate lens model for a phone and a desk webcam.

### Architectural & Functional Highlights
| Component / Layer | Change | Impact |
| :--- | :--- | :--- |
| **Camera preview** | Size the stage from the camera buffer and use `object-fit: contain` | The face and the alignment mesh share one aspect ratio |
| **Lens model** | Detect a phone versus a desk camera and undistort the saved frame | Wide phone lenses and narrower webcams are not treated as the same optic |
| **Pose checks** | Scale portrait frames onto the 4:3 frame the thresholds were tuned on | A tall phone photo is not read as extra tilt or a failed side view |

### Detailed Changes

#### Added
- **Camera optics**: Device detection, portrait and landscape capture constraints, and a Brown–Conrady correction for the saved photograph.
- **Layout**: Phone-width padding, viewport fit, and larger landmark dots on a coarse pointer.

#### Changed / Refactored
- **Live guide**: Pose and side-view checks run on lens-corrected landmarks. The outline drawn on the preview stays on the raw camera image.
- **Photo stage**: Front and profile photographs keep their aspect ratio and stay within the viewport.

#### Fixed
- **Camera preview**: Removed `object-fit: fill`, which stretched the video whenever the box and the sensor aspect differed. The mesh then missed the face.

#### Tooling & Hygiene
- **Git**: Ignore the local `.pnpm-store` directory so the package cache is not treated as source changes.

### Verification Proof
- `pnpm test` — 50 tests passed.
- `pnpm typecheck` — passed.
- Homepage and sign-in at a 390px viewport — no horizontal overflow.
- Live camera capture on a signed-in phone was not exercised in this pass.
