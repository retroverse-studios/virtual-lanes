# VirtualLanes — Product Direction & Decisions

> Living record of the product/architecture decisions made while shaping VirtualLanes from a
> Python simulation library into a phone-first bowling companion app. Capture-as-we-go so we
> don't lose the thread between sessions. (Not auto-generated; edit freely.)

## Build status (2026-06)

The SvelteKit + adapter-static PWA is **live on Cloudflare Pages** (`virtuallanes.app` (Pages project `virtuallanes`);
git-connected to this repo 2026-07 — builds on push to `main`. Earlier deploys were manual uploads.) **Done:** Bowl-off (layout B, positional pin deck, leave/spare/
split stats; **rivals optional → solo game tracking**), History (shared `GameRecord`, localStorage),
**Journal v1**, **Rivals manager** (create/edit/delete custom + hide/unhide built-ins),
**Settings** (profile + data export/import), **Stats** (History → Games/Stats: average/trend,
strike%, first-ball avg, spare/makable/split %, most-left pins, by pattern/volume/length),
**PWA** (manifest, icons, offline SW). **Trace v1 shipped 2026-07** (see below).

### Done since
- **Arsenal** — create/edit/delete balls (cover/core/weight/surface/layout) + stock balls with
  hide/show. Profile gained handedness + grip. Sim reads coverstock; rest is record-keeping/ML fuel.
- **Phase 2 (unified session)** — DONE. Bowl-off + Journal are lenses on one shared session:
  per-frame **post-it journal** (sparse/optional), per-frame **ball + ball changes**, and a single
  merged history record (score + notes + ball-downs). By-ball stats breakdown added.

### Next / backlog
- **Centre manager** (future, physics-neutral): a managed collection like Rivals/Arsenal — stock +
  custom + hide/show, generic/no real names. Fields: lanes, pinsetter (free-fall/string), approach
  length, ball-return proximity, location. Only enriches the descriptive `alley` field on a session;
  does NOT touch the engine.
- **ML on journal data** (future): journal = labelled dataset (read/decision → actual leave/outcome,
  now linked per-frame). k-NN ("situations like this, X worked"), decision-tree adjustment
  suggestions, misread-pattern matching. Keep capturing structured, frame-linked data (Phase 2 does).
- **Trace v1 — DONE (2026-07,** plan + status in `trace-implementation-plan.md`**):** clip import,
  tap-corner calibration (loupe, reused across a session), lane-masked frame-diff scan, top-down
  track + metrics (smoothed breakpoint/entry for shot-to-shot consistency), observed-vs-measured
  breakpoint offset, TraceRecord in shared history, full-device backup v2 (arsenal/rivals/centres/
  profile included in export/import). Awaiting first real-clip field test. Deferred: revs, live
  mode, auto corner detect, trace↔game linking.
- Attach `virtuallanes.app`.

## Vision

A **phone-first bowling companion** for real bowlers, with four modes:

1. **Bowl-off (Compete)** — you bowl your *real* frames at the alley; a chosen rival is
   *simulated* and revealed frame-by-frame beside you. Live head-to-head. Makes practice fun
   and competitive. (Prototype: `prototype/bowl-off.html`.)
2. **Journal (Study)** — record *real* shots: what you saw → decided → happened (V/X vs video),
   find misread patterns. (Functionality from the original **LaneRead** proof-of-concept.)
3. **Trace (Measure — the ball)** — *coming soon.* Film a shot; auto-track the ball to show laydown,
   breakpoint, entry angle, pocket and a top-down path, plus speed (and best-effort revs).
4. **Form (Measure — the body)** — *coming soon.* Film your approach; on-device pose tracking reads
   the swing-plane arc, spine tilt, hip turn, knee bend and footwork, split into positions
   (stance → pushaway → steps → release). (Prototype: `prototype/form.html`.)

You never simulate the human — you enter your real rolls/observations or film a real shot.
Naming: **Journal** = the *subjective* read (what you thought); **Trace**/**Form** = the *objective*
measurement (what actually happened) — Trace measures the ball, Form measures the body.

**VirtualLanes is THE app going forward.** LaneRead (laneread.com) was an initial proof of
concept; its journaling lives on as the Journal mode here. The standalone LaneRead app/site is to
be **deprecated and retired ~mid-2027** (about a year from 2026-06). laneread.com can funnel to
VirtualLanes until then.

## Mode 3 — Trace (camera ball tracking)

- **No photogrammetry needed:** the lane is a known flat plane → a **homography** maps the camera
  view to a true top-down. Reference points from lane edges + foul line + pin deck.
- **Lane geometry:** 39 boards wide (~41.5″), 60 ft foul-line→headpin, arrows at 15 ft.
- **Outputs:** laydown board, breakpoint, entry board/angle, pocket; top-down trace (early/mid/
  backend); **ball speed** from frame timing; **revs estimated** (hard on a solid-colour ball —
  needs a visible marking, else inferred from hook shape). Mark estimates honestly.
- **Relative > absolute:** compare a shot to the bowler's own averages from the same setup.
- **v1 flow = import a slow-mo clip** (filmed with the native camera), analyse frames in-browser
  (`<video>` + canvas + `requestVideoFrameCallback`, OpenCV.js/WASM). Web `getUserMedia` can't
  reach phone slow-mo (120/240fps) and caps ~30fps, so live point-and-overlay is deferred —
  that's the only part that really wants native (Capacitor camera bridge later).
- **Stays in the one PWA** (not standalone): shares the `Game` history; a Trace can sit beside the
  shot you journaled in Journal.

### Build strategy (de-risked, staged — prototype in `prototype/trace.html`)
Each stage is independently testable; **manual calibration first, auto-detect later**:
0. **Plumbing** — import a clip, step/scrub frames to a canvas (seek, or `requestVideoFrameCallback`).
1. **Manual calibration** — user taps 4 lane corners (foul-L, foul-R, pins-L, pins-R). This *is* the
   "is it a lane?" check — no separate classifier.
2. **Homography** — 4-point DLT (~40 lines, no library) maps image → top-down (39 boards × 60 ft).
3. **Ball track (classical, NOT ML)** — frame-difference → largest moving **connected blob** centroid
   per frame. The ball is the dominant motion on a static lane. Restrict to the calibrated lane region
   and ignore pre-release frames (the arm). Interpolate blur gaps.
4. **Derive** — map track through H → laydown / breakpoint / entry board+angle / pocket; speed from
   distance ÷ time. **Relative > absolute**; revs deferred (single-colour ball can't show rotation).
5. **Later** — auto lane-detect (Canny/Hough), live mode, OpenCV.js/WASM if robustness needs it, ML
   detector trained on accumulated user clips.
Tooling: hand-rolled canvas diff + homography keeps the bundle small; reach for OpenCV.js only for
auto-detect/MOG2. fps: import a **slow-mo clip** (web getUserMedia can't access 120/240fps). Camera
must be propped (static-background assumption).

### Data shapes (sketch)
```ts
interface TracePoint { t: number; img: [number, number]; lane: [number, number]; } // lane = [board, ft]
interface TraceCalibration { corners: [[number,number],[number,number],[number,number],[number,number]]; homography: number[]; }
interface TraceResult {
  id: string; date: string; clipName?: string;
  calibration: TraceCalibration;
  track: TracePoint[];
  metrics: { laydownBoard: number; breakpointBoard: number; breakpointFt: number; entryBoard: number; entryAngle: number; speedMph: number; revsEstimated?: number; };
  handedness: 'left' | 'right'; // flips breakpoint logic
  note?: string; gameId?: string; frame?: number; // optional link to a game/frame (shared model)
}
```

## Mode 4 — Form (camera body / pose tracking)

> Staged implementation plan (post-Trace, with occlusion policy + clip-quality coaching):
> **`form-implementation-plan.md`**.

The sibling of Trace: Trace measures the **ball**, Form measures the **body**. Same flow (import a
clip, process in-browser, save to the shared history), same philosophy (**relative to your own
baseline** beats absolute numbers; *consistency* is the signal).

- **Pose detection is the easy 20%; interpretation is the 80%.** 2D single-person pose in good light
  is mature and runs in-browser on a modern phone, especially on a *recorded* clip (no real-time
  pressure). Engine: **MediaPipe Pose Landmarker** (Tasks Vision, WASM + WebGPU/WebGL) — 33 landmarks
  incl. **feet** (needed for step detection) and a rough per-joint depth. (MoveNet/PoseNet are the
  lighter 17-keypoint alternatives; ml5.js wraps them but isn't for shipping.)
- **Killer feature = split the approach into positions.** Stance · pushaway · step 1–4 · release,
  auto-segmented from **foot-strike events** (ankle vertical velocity → plant), captured as still
  frames the user flicks between — like a golf-swing analyser (V1/Hudl Technique), which nobody does
  well for bowling.
- **Show the derived insight, not the noisy skeleton.** Toggleable skeleton overlay for "see my
  body"; clean abstracted overlays (swing-plane arc, spine line, step markers, angle read-outs) for
  "read my form."
- **Multi-angle earns its place** (it's not a nice-to-have): down-the-line reads swing plane + drift;
  side-on reads spine tilt + posture + knee bend. Different camera = different metric. Tag each clip
  with its angle; only compare like-with-like.
- **Honest limits:** 2D keypoints live in image space, so "hip open" / "spine rotation" (3D) are
  approximate from one view; **self-occlusion** at release (arm crosses torso, ball hides hand, legs
  cross) drops joints exactly when it's most interesting; raw keypoints jitter → smooth (One-Euro)
  before deriving angles. Mark estimates honestly, same as Trace's revs.
- **Stays in the one PWA**; on-device only (a body clip never leaves the phone — privacy matters more
  here than for a ball track).

### Build strategy (de-risked, staged — prototype in `prototype/form.html`)
1. **Plumbing** — import a clip, step/scrub frames (shared with Trace).
2. **Pose per frame** — run MediaPipe Pose over the clip, store 33 landmarks/frame; draw the skeleton.
3. **Derive timelines** — swing-arm angle (bowling-arm wrist↔shoulder), spine tilt (shoulder-mid↔
   hip-mid vs vertical), wrist path = the **swing-plane arc** drawn over the frame.
4. **Segment the approach** — detect foot-strikes (local maxima of the lower ankle's image-y) →
   stance/pushaway/steps/release positions; the genuinely uncertain bit the prototype must validate.
5. **Later** — relative-to-baseline comparison, multi-angle clips, smoothing/filtering, ML on
   accumulated clips, Capacitor camera for live mode.

### Data shapes (sketch)
```ts
interface PoseFrame { t: number; landmarks: { x: number; y: number; z: number; v: number }[]; } // 33 BlazePose pts, normalised
type ApproachPhase = 'stance' | 'pushaway' | 'step1' | 'step2' | 'step3' | 'step4' | 'release';
interface FormPosition { phase: ApproachPhase; t: number; frame: number; } // a captured still in the approach
interface FormResult {
  id: string; date: string; clipName?: string;
  angle: 'down-the-line' | 'side'; handedness: 'left' | 'right';
  frames: PoseFrame[];
  positions: FormPosition[];
  metrics: { swingPlaneDeg?: number; spineTiltDeg?: number; hipTurnDeg?: number; kneeBendDeg?: number; tempoMs?: number; };
  note?: string; gameId?: string; frameNo?: number; // optional link to a game/frame (shared model)
}
```

## Platform & architecture

- **One PWA, two modes** — not two apps. PWA storage is partitioned per origin, so one origin =
  shared offline history with **no backend, no account**. The "two apps" feel comes from a
  **launch mode-picker** ("Compete or Study?") + **bottom-tab** switching, not two installs.
- **Offline-first**, local storage (localStorage/IndexedDB). Bowling alleys = bad signal; no
  per-frame round-trips.
- **PWA now → Capacitor later** to reach App Store / Play Store with the *same* codebase. Don't
  ship two native apps (same sandboxing problem as two PWAs).
- **Backend/accounts deferred** to the future cloud-analytics / AI phase (what LaneRead's roadmap
  already teases). Only then does splitting into truly separate apps become viable.
- **Recommended stack:** SvelteKit + TypeScript (least boilerplate, great PWA story); Vite+React
  is the fallback if more examples/AI-help matter. Tabbed shell: `[Bowl-off] [Journal] [Trace] [Form] [History] [Settings]`.

## Unified data model

Both modes produce the **same `Game` record** (this is what makes them one app):

```
Game {
  id, date, alley, condition {length, volume, surface, patternType: house|sport},
  yourBall(s), frames: [your rolls], score,
  mode: 'bowloff' | 'practice',
  // bowl-off only:  opponents: [...], result
  // lane-read only: shots: [{ saw, decided, happened: V|X, emotion, adjustments }]
}
```

**History/analytics is the backbone and the long-term value** (score trends, performance by
pattern, misread patterns). One timeline of every game, simulated and real.

## Simulation model (validated in Node; ported from the Python repo)

- **Causal levers = rev rate + ball speed + accuracy + consistency.** "Style" (stroker / cranker /
  two-hander / straight / tweener) is just a **preset that fills those in**. Tier (rookie→elite)
  scales level. → enables "mimic a champion by their stats."
- **Lane conditions:** pattern length, oil volume, surface, and **house vs sport** (sport removes
  miss room → punishes low accuracy/consistency).
- **Oil breakdown:** lane friction rises per frame; rate = traffic × revs (aggression) × coverstock.
  More bowlers on the lane → faster burn. Lane-traffic config: ignore / by-match / manual count.
- **Mid-game ball change:** a power player switches to urethane when the lane burns past comfort.
- **Ball recommender:** generic covers/cores (plastic/urethane/solid/pearl × sym/asym). No brands.

## Gender — resolved (and deliberately neutral)

- Gender is **NOT a simulation input.** The real average difference lives in **rev rate + ball
  speed** (power/leverage; the fixed 16 lb ball cap compounds it) plus participation depth — not a
  bowling-specific rule. So we model revs/speed and **don't encode gender at all**.
- **Division** (Open / PBA / PWBA) is a **cosmetic label** with zero gameplay effect.
- **Handicap** is a plain per-bowler number (the human can enter their league handicap). Modes:
  scratch / per-bowler / % of difference. The Asia "flat-8 for females" = just give a bowler a
  handicap of 8. No gender mechanic, no debate.

## IP / identity

Ship only **fictional** bowlers and **generic** ball families. No real names, likenesses, or ball
brands (right-of-publicity / trademark). Users may **privately** create profiles that mimic a
champion's known stats for personal use. Don't let a future sharing feature publish real
names/likenesses.

## Personas

- Style archetypes (cranker/stroker/two-hander/etc.) across tiers.
- **League profiles:** League Larry (~160, house basher, lost on sport), Scratch Sam (~205,
  exposed on sport), Sport Stacy (~230, holds up on sport).
- **Create-your-own** bowlers (rev/speed/acc/cons sliders) and balls (cover/core).

## Decision: bowl-off layout = B (VS duel)

Chosen partly for analysis value: B's **tap-the-pins entry can record *which* pins are
left/knocked**, not just a count — enabling spare conversion, leave frequency, and split-rate stats.

- **Upgrade required:** the prototype's pin deck is a count-picker. A **true positional pin deck**
  (per-ball standing-pin state) is needed to actually capture leaves.
- **Data-model implication:** store per-ball **pin masks** in the `Game` frames (10-bit standing/
  fallen per ball). Score still derives from the count (popcount); analytics derive from the masks
  (spare conversion by leave, split rate, most-common leaves). Overlaps directly with LaneRead's
  planned pin-deck feature — another reason the two modes share one `Game` record.

## Open questions

- Does the house↔sport swing and the ball-change moment feel real?

## Existing assets

- `prototype/bowl-off.html` — throwaway phone prototype; engine validated in Node. Fold the
  winning layout + the validated engine into the real PWA, then delete.
- **LaneRead** (separate repo `~/Projects/lane-read`, deployed laneread.com) — the original
  proof-of-concept; a mature vanilla single-file tracker. Its functionality is being rebuilt as the
  **Journal mode** inside VirtualLanes. The standalone app/site is **deprecated, to retire ~mid-2027**;
  laneread.com can funnel to VirtualLanes until then. Rebuild Journal on the shared `Game` model
  (don't merge the PoC codebase directly).
