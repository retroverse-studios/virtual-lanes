# Trace (ball tracking) — implementation plan

> Working plan agreed 2026-07-06, derived from the PWA audit + `docs/product-direction.md`
> (Mode 3) + the validated `prototype/trace.html`. Check items off as they land.
> Decision baked in: **never persist video** — only calibration, a downsampled track
> (≤200 points), and derived metrics (localStorage-sized; IndexedDB deferred).

## Phase 0 — Foundations (audit fixes that block/de-risk Trace)

- [x] Commit the WIP baseline (localStore refactor, vitest setup, new route files)
- [x] Fix sport-pattern toggle no-op (`Setup.svelte` `===` vs `=`) — High
- [x] Checkpoint in-progress bowl-off to localStorage + rehydrate on load — High
- [x] Service worker: cache only status 200, skip Range requests (video cache poisoning) — Medium
      (also folded in: precache `prerendered` pages, offline-navigate fallback → `200.html`)
- [x] Refactor `GameRecord` into a discriminated union (`bowloff | journal | trace`-ready)
      with exhaustive handling in `history`, `stats.ts`, history page

## Phase 1 — Plumbing: clip import + scrubbing

- [x] `src/lib/trace/` module: `state.svelte.ts` session state machine
      (load → calibrate → scan → results → save)
- [x] Pure CV modules with Vitest coverage (same style as `bowling.test.ts`):
      `cv/homography.ts` (solveH/applyH), `cv/blob.ts` (gray/diff/largest-blob),
      `cv/metrics.ts` (laydown/breakpoint/entry/speed from a track)
      — lane coords locked: x = boards from the RIGHT gutter (0–39), y = ft from foul (0–60)
- [x] `/trace` route: replace coming-soon with ClipLoader (file input → `<video>` + scrub canvas)

## Phase 2 — Calibration

- [x] Tap-4-corners UI (foul-L/R, pin-L/R) with overlay, reset, compute
      (+ drag-to-adjust placed corners; corner-order + collinearity validation with friendly errors)
- [x] Corner-tap accuracy aid (magnifier loupe while dragging)
- [x] Remember last calibration as the starting guess for the next clip (same video dims)

## Phase 3 — Ball scan

- [x] Frame-diff scan ported from prototype, plus the fixes it punted on:
  - [x] restrict diff mask to the calibrated lane quad (ignore the bowler/arm)
  - [x] real monotonic-progress filter (prototype only sorts by time)
  - [x] drop out-of-lane/pre-release hits; interpolate blur gaps (median-dt, capped)
- [x] ~~Web Worker~~ — processing at 192 px is sub-ms/frame, so it runs inline (the async
      seek loop already yields to the UI). cv/ stays DOM-free, so a worker move is
      mechanical if higher-res processing ever needs it.
- [ ] (Later option) WebCodecs VideoDecoder fast path with seek-loop fallback

## Phase 4 — Metrics + results

- [ ] laydown / breakpoint (board + ft) / entry board + **entry angle** / pocket / speed
- [ ] Use profile `handedness` to flip breakpoint logic
- [ ] Top-down SVG path render (reuse the lane art from the coming-soon page)
- [ ] Revs shown as "not measured" (honest-estimate policy)

## Phase 5 — Save to shared history

- [ ] `TraceRecord` variant (per the sketch in product-direction.md) saved via `history`
- [ ] History card with mini top-down path
- [ ] Optional link to a game/frame (sit beside the journaled shot)
- [ ] Include trace records (and arsenal/rivals/centres/profile) in export/import

## Deferred

Auto corner detection (Canny/Hough) · live mode (Capacitor for 120/240 fps) ·
rev estimation · OpenCV.js only if the classical pipeline proves fragile.

## Audit backlog (not Trace-blocking; schedule separately)

SW: 200.html offline fallback, precache `prerendered`, stranded-session update flow ·
persistence: corrupt-payload backup, multi-tab `storage` events, payload versioning,
import validation, full export · Done-screen `writeFailed` warning · `bowl()` unit tests ·
dialog a11y (post-it, ball picker) · manifest `id` · `svelte.config.js` ·
`mobile-web-app-capable` meta · in-app destructive confirms.
