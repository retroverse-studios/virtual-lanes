# VirtualLanes — Full Code Audit

Date: 2026-11-01 · Scope: SvelteKit app (`src/`), landing workflow, Python
reference parity (spot-check). Baseline: `pnpm check` 0 errors/warnings;
`pnpm build` clean; `pnpm test` 136 tests — **one intermittent failure seen
at baseline, then 7 consecutive green runs** (see M1). App live at
virtuallanes.app (Cloudflare Pages, external to this repo's workflows);
landing workflow green.

Severity: **High** = broken/misleading core behaviour or real exposure ·
**Medium** = wrong results, divergence, missing wiring ·
**Low** = dead code, polish, defence-in-depth.

Overall this is the cleanest codebase in the sweep so far: typed engine with
real tests, quota-aware persistence with user-visible failure states,
checkpointed live games, careful service worker. Findings are fewer and
smaller than previous projects.

---

## High

_None found._ No XSS sinks (no `{@html}`), no third-party requests, no
secrets, no broken core flow found in static review.

## Medium

### M1. Simulation tests are unseeded Monte Carlo — the suite flakes
`src/lib/engine/bowling.ts` uses bare `Math.random()`; tests such as
"elite tiers bowl a higher projected house average than rookies" (60-run
averages) and the wild-shot comparisons (2000 games, 1.15× margin) are
statistical assertions over unseeded samples. At audit baseline the suite
reported 1 failure / 136, then passed 7 consecutive runs — consistent with
a low-probability statistical flake (the test comment itself records an
earlier crossing at 400 games). Fix: seed the RNG in tests (spy on
`Math.random` with a small PRNG) or thread an injectable `rng` through
`simBowlerGame`/`projectAverage`; keep the statistical assertions, make
them deterministic.

### M2. TS spare simulation diverges from the canonical Python reference
`simReg`/`simTen` in `bowling.ts`: on a missed spare conversion the TS port
rolls `irange(rem + 1)` (0..rem **inclusive**), so a "miss" can still knock
down every remaining pin and score as a spare. For a single-pin leave that
is a 50% bonus conversion on top of the spare probability. The Python
reference (`reference/src/virtual_lanes/game.py:72`) rolls
`integers(0, remaining)` — exclusive — so a missed conversion never
converts. README calls the Python lib "the canonical scoring reference".
Fix: miss branch should be `irange(rem)` (0..rem-1); same in `simTen`'s
`at()`. Add a distribution test pinning single-pin conversion ≈ spare prob.

### M3. No undo for a mis-entered ball in Bowl-off
Pin entry is tap-the-pins + "Bowl" commit; once bowled there is no way to
correct a mis-tap short of discarding the whole game (`reset()`), and the
checkpoint faithfully restores the mistake. At a real alley, mis-taps are
the most likely input error. Fix (product decision): an "undo last ball"
that rewinds `humanFrames`, `curStanding`, `#pendingLeave`/`leaves`,
`revealed`, and re-checkpoints. Needs the pre-ball standing snapshot —
derivable by replaying frames, or store the knocked set per ball.

### M4. Journal sessions aren't checkpointed (Bowl-off games are)
Bowl-off checkpoints every ball to `vl.bowloff.live.v1` and resumes after a
refresh/tab-kill; Journal keeps shots only in memory, so the same event
loses the whole journal session, including a typed-but-unsaved draft (which
`finish()` also silently drops). The update-deferral logic in `+layout`
even special-cases "active journal" as fragile state. Fix: checkpoint the
journal session (alley/pattern/ball/shots/draft) like Bowl-off, and have
`finish()` include a non-empty draft (or warn).

### M5. `breakdownRate` divides by zero when nobody is on the lane
With `laneMode: 'manual'` the occupancy comes from `manualCount`, but
`avgAgg`/`avgCov` still divide by `onLane.length`. `startGame` always passes
at least the human, so it's unreachable today — but the exported function
returns `NaN` for an empty lane, and `NaN` friction would silently poison a
whole simulated game if a future caller passes only a manual count.
Fix: guard `onLane.length === 0` (return the manual-occupancy rate with
neutral averages, or 0); add a unit test.

### M6. No CI runs the app's checks
The only workflow publishes `landing/` (+ docs). The app deploys via
Cloudflare Pages' own integration, so `pnpm check` and the 136 tests never
gate anything — the M1 flake or a type regression ships unnoticed.
Fix: a small `ci.yml` (install, `pnpm check`, `pnpm test`, `pnpm build`).

## Low

### L1. "Clear all data" only clears games
Settings' danger button calls `history.clear()`; profile/setup, custom
arsenal/rivals/centres, the live-game checkpoint, and the saved Trace
calibration all remain. The confirm text says "ALL saved games" (accurate),
but the button label reads as a full wipe. Fix: rename to "Clear game
history", or make it a true factory reset of every `vl.*` key (decision).

### L2. Numeric profile inputs can store NaN
Settings binds `avg`/`handicap` with `type="number"`; clearing the field
yields `NaN`, which `saveSetup` persists and `handicap()` then propagates
(`b.avg ?? 150` does not catch `NaN`) — standings totals become `NaN` in
percent-handicap mode. Fix: coerce/clamp on save and in `handicap()`.

### L3. Stored/imported records are cast, not shape-checked
`History.load()` and `StockedStore.hydrate()` trust parsed JSON beyond
array checks; a malformed custom bowler (missing `attr`) would crash
`startGame`/`derive`. `History.import` validates only id/date/mode.
Older-schema or hand-edited storage is the risk. Fix: minimal per-record
guards at load (drop unusable records), reusing the import validator.

### L4. Stale comment + deferred-update edge in `+layout.svelte`
The comment says a live bowl-off is "in-memory until Finish" — no longer
true since checkpointing landed (a reload resumes it). The deferral itself
is still right for Journal (M4) but, once deferred, `controllerchange`
never re-fires, so the update waits for a manual reload; worth a comment
fix and, if M4 lands, simplifying to always-reload.

### L5. Tenth-frame second leave isn't counted in spare stats
After a tenth-frame strike, ball 2's leave (for ball 3) is never recorded in
`leaves`, so spare-attempt stats undercount tenth-frame conversions.
Defensible either way; document or record it.

### L6. Import summary overcounts "already present"
Settings import reports `games.length - added` as duplicates, but that
figure also includes records dropped as malformed. Cosmetic.

### L7. `update()` persists even when the id wasn't found
`StockedStore.update` writes storage unconditionally — harmless, but it can
flip `writeFailed` on a full disk for a no-op. Skip persist when nothing
changed.

---

## Verified good (checked, no action)
- Traditional scoring (`cumulative`, `tenthComplete`, `glyphs`) — carefully
  handled strike/spare bonus and tenth-frame glyph edge cases; 71 engine
  tests.
- Persistence: quota failures surface in UI (`writeFailed`), corrupt JSON
  falls back to defaults, stock+custom+hidden merge is sound, v2 backup
  export/import covers games + arsenal + rivals + centres + profile.
- Service worker: per-asset precache (one failure can't abort install),
  Range-response guard for video, offline deep-link fallback to the neutral
  shell, versioned caches.
- Trace CV is pure, tested (homography/blob/scan/metrics), honest about
  accuracy ("relative > absolute"); video never leaves the device; object
  URLs revoked.
- Form route is an honest "coming soon" sketch, labelled as such with a
  real implementation plan in `docs/`.
- No third-party requests anywhere in `src/`; all data local by design.

## Suggested fix order
M2 (one-line parity fix + test) → M1 (seed the tests) → M5 guard →
M3/M4 (product decisions) → M6 CI → L-sweep.

---

## Resolution (2026-11-01)

Fixed in this pass (user approved: everything incl. Low; add undo;
factory reset):

- **M1** Test RNG seeded (`Math.random` spied with a mulberry32 PRNG in
  `bowling.test.ts`) — the statistical tests are now deterministic.
- **M2** Missed spare conversions roll `irange(rem)` in `simReg`/`simTen`,
  matching the Python reference. Regression test measures single-pin
  conversion for a low-accuracy bowler against the analytic expectation;
  verified it fails on the old engine (as do the M5/L2 tests).
- **M3** Undo-last-ball in Bowl-off: pre-ball snapshots (frames, standing,
  leaves, pending leave, revealed) kept in a capped stack, checkpointed
  with the live game so undo survives refresh; "↩ Undo ball" on Play.
  Play-screen only — a finished game is already in history. Covered by new
  `src/lib/bowloff/state.test.ts`.
- **M4** Journal sessions checkpoint to `vl.journal.live.v1` on every
  mutation (including draft typing via `oninput`) and resume on load;
  `finish()` includes a complete unlogged draft; `discard()` clears the
  checkpoint.
- **M5** `breakdownRate` returns 0 for an empty lane (+ test).
- **M6** New `ci.yml`: typecheck + test + build on push/PR.
- **L1** "Clear all data" is now a true factory reset: every `vl.*`
  localStorage key removed, then reload to defaults; confirm text
  enumerates what goes.
- **L2** `handicap()` coerces non-finite inputs (+ test).
- **L3** `History.load()` filters with the import validator;
  `StockedStore.hydrate` drops records without a string id and non-string
  hidden entries.
- **L4** Update-deferral removed: with Bowl-off and Journal both
  checkpointed, the layout always reloads on `controllerchange`; stale
  comment corrected.
- **L5** Tenth-frame strike → partial ball 2 now records a leave for
  ball 3 (+ test).
- **L6** Import summary says "skipped — duplicates or invalid".
- **L7** `StockedStore.update` no-ops (no write) for unknown ids.

Verification: `pnpm check` 0/0 · `pnpm test` 142/142 (6 new) ·
`pnpm build` clean · `pnpm audit --prod` no known vulnerabilities.
Not exercised: real-device PWA install/update flow and Trace video
analysis on phone footage.

---

## Known issue (reported 2026-11-01, deferred — owner to investigate)

**Trace appears mirrored for a right-handed bowler** (reads like a
left-handed trace). Static review of the coordinate chain found it
internally consistent *for a rear-camera clip filmed from behind the
approach*: lane x is boards-from-right (`cv/homography.ts`), foul-L maps
to x=39, RH breakpoint = min x, RH pocket 17.5, and `TopDown.svelte`
renders small x on the right (bowler's POV). So the reversal most likely
enters before the math:

1. **Front-camera (selfie) clips are mirrored at the source** — image-left
   is then the lane's right, so correct taps still produce a mirrored lane.
2. **Corner labels are ambiguous**: "foul line — LEFT corner"
   (`state.svelte.ts: CORNER_LABELS`) invites screen-left vs lane-left
   confusion; 7-pin/10-pin side labels would be unambiguous.
3. **Saved calibration reuse**: a calibration from a rear-camera clip
   applied to a mirrored clip (or vice versa) flips everything.

Suggested future fixes: a "mirror clip" toggle on the Calibrate screen,
7-pin/10-pin corner labels, and/or a warning when the breakpoint side
strongly contradicts profile handedness (`state.svelte.ts: handedness()`
+ `cv/metrics.ts`). Not fixed in the audit pass, by request.
