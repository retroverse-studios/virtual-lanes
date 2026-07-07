# Form (body / pose tracking) — implementation plan

> Staged plan agreed 2026-07, extending `product-direction.md` (Mode 4) with the decisions
> made after Trace shipped. Sibling of `trace-implementation-plan.md` — same philosophy
> (**relative > absolute**, consistency of measurement over accuracy, never store video,
> honest about what isn't measured), and heavy reuse of Trace's plumbing.

## Decisions locked up front

- **Engine: MediaPipe Pose Landmarker** (Tasks Vision, WASM, on-device). 33 landmarks
  incl. feet — the 17-keypoint models (PoseNet/MoveNet, what Teachable Machine wraps)
  can't do step detection. We need raw landmarks over time, not pose classification.
- **Model delivery:** `pose_landmarker_lite.task` (~5–6 MB) + WASM hosted in `static/`
  (same-origin so the SW's 200-only runtime cache can hold it). NOT precached — Form
  offers a one-time "enable Form (~10 MB download)" step so the base app install stays
  small; after that it works offline like everything else.
- **Occlusion policy (per-landmark, not per-frame):** the arm *will* vanish behind the
  torso/ball at release and reappear on the follow-through. Gate each landmark on the
  model's visibility score; **interpolate bounded gaps** between the last and next
  confident detection (same median-interval + cap approach as Trace's blur-gap fill);
  beyond the cap, the limb honestly disappears. Interpolated spans are drawn dashed in
  the overlay — never presented as measured. A user setting picks
  `interpolate | hide` for how missing limbs render.
- **Clip-quality feedback, not silent failure:** after a pose pass, score the clip
  (% of frames where key joints are confident, split by body region). Poor scores →
  targeted photography tips instead of bad numbers:
  - centre the bowler in frame for down-the-line; keep the whole body in frame side-on
  - avoid the ball return / other bowlers between camera and bowler
  - more light beats more zoom; prop the phone (static camera, same as Trace)
- **Two camera angles = two instruments.** Each clip is tagged `side` or
  `down-the-line` at import (user choice, one tap). Each angle computes ONLY its own
  metrics; comparisons are always like-with-like:
  - **side-on** → step lengths + timing, knee bend, spine tilt, release posture
  - **down-the-line** → swing-plane arc, arm drift, shoulder alignment
  No single-camera 3D reconstruction — that's a research project, not a phone app.
- **Units are relative.** Step lengths reported as ratios (vs the bowler's own leg
  length, hip→ankle, and vs each other: "step 2 is 0.6× step 4"). No calibration
  step needed, and cross-session comparison is inherently valid — the Trace lesson.

## Phase F0 — Foundations & spike

- [ ] Extract the shared clip plumbing Trace and Form both need: a `ClipSession` base
      (clip meta, video element, seek/frameTick) that `trace/state` and `form/state`
      extend; `ClipLoader`/`Scrub` take the session as a prop instead of importing
      Trace's singleton.
- [ ] Spike: MediaPipe Pose Landmarker running in-browser over an imported clip
      (seek loop like Trace's scan), landmarks logged. Validates bundle size, WASM
      load, per-frame cost on a phone. **Go/no-go gate for everything below.**
- [ ] `/form` page: replace coming-soon with ClipLoader + angle tag picker.

## Phase F1 — Pose pass + stick-figure playback

- [ ] Pose pass over the clip → `PoseFrame[]` (33 landmarks + visibility per frame),
      progress bar (reuse scan UI pattern).
- [ ] **Skeleton overlay on the frame canvas — the stick character.** Scrubbing plays
      the stick figure over the video. Toggle: skeleton on video / skeleton alone.
- [ ] Clip-quality score + photography tips panel (the honest-failure path).
- [ ] Pure module `form/pose/filter.ts`: visibility gating + One-Euro (or moving-average,
      endpoints exact — Trace lesson) smoothing. Unit tests on synthetic landmark streams.

## Phase F2 — Occlusion handling

- [ ] `form/pose/occlusion.ts` (pure): per-landmark gap interpolation with median-interval
      scaling and a hard cap; spans marked `interpolated: true`. Unit tests: arm vanishing
      N frames mid-swing reappears on follow-through with a smooth dashed arc; a gap past
      the cap stays missing.
- [ ] Overlay renders interpolated segments dashed; `interpolate | hide` user setting.

## Phase F3 — Segment the approach (the killer feature)

- [ ] `form/pose/segment.ts` (pure): foot-strike detection from ankle vertical velocity
      (side-on) → stance / pushaway / step 1..4 / release positions. Handles 4- and
      5-step approaches. Unit tests with synthetic walk cycles (+ jitter seeds, same
      consistency discipline as Trace's metrics suite).
- [ ] Position strip UI: captured stills the user flicks between (golf-swing-analyser
      style), each labelled with its phase.
- [ ] Step metrics (side-on only): lengths as ratios of leg length + of each other,
      step timing (ms), tempo. "Step 2 short, step 4 long" is exactly this table.

## Phase F4 — Angle-specific metrics

- [ ] Side-on: spine tilt at release, knee bend, posture line overlays.
- [ ] Down-the-line: wrist-path swing-plane arc drawn over the frame, drift vs a
      vertical reference through the shoulder.
- [ ] Every metric annotated with its angle; UI never mixes angles in a comparison.

## Phase F5 — FormRecord in shared history

- [ ] `FormRecord` variant on the `GameRecord` union (mode `'form'`) — the compiler
      ripple (GAME_MODES / MODE_LABEL / history card) is the designed workflow now.
      Stores: angle, handedness, positions (phase + t), downsampled landmark summary
      (NOT all 33×N frames — decide the minimal replay set), metrics, clip-quality
      score, note. **Never the video.**
- [ ] History card: position-strip thumbnails; export/import ride along (backup v2
      already carries whole records).

## Verification strategy

Pure modules (filter / occlusion / segment) get vitest suites on synthetic landmark
streams — same pattern as `cv/`. The pose model itself can't be driven by synthetic
stick figures (it detects humans), so E2E verification needs a real clip fixture:
film one side-on approach (training with your son is perfect), keep it as a local
fixture outside the repo, and the verify skill drives import → pose → segments →
metrics against known-good values from the first manual run.

## Deferred

Live camera mode (Capacitor) · multi-person filtering · relative-to-baseline trend
views ("step 4 is 10% longer than your average") · 3D lift / two-camera fusion ·
ML on accumulated clips · rev-rate estimation from wrist rotation (shared with Trace).
