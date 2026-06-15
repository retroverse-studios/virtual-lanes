# Prototype: bowl-off frame-by-frame UX

**Question:** What should the phone frame-by-frame head-to-head loop feel like?

**Artifact:** `bowl-off.html` — one self-contained page, 3 structurally different layouts
switchable via `?variant=` or the floating bottom bar (also ← / → keys).

- **A — Alley scoreboard:** both full 10-frame scoresheets always visible (like an overhead
  alley monitor), pin entry via a numeric keypad at the bottom. Data-dense.
- **B — VS duel cards:** big hero totals + current-frame cards side by side, past frames as a
  thin filmstrip, entry via a tappable pin-deck. Game-like, suspense on opponent reveal.
- **C — One-thumb feed:** vertical chat-style timeline (one frame/row, you vs rival + delta),
  sticky score header, entry via a big +/- stepper. One-handed.

**Run:** `python3 -m http.server 8000 -d prototype` then on phone (same wifi):
`http://<laptop-ip>:8000/bowl-off.html`

**Engine (extended, validated in Node):**
- Scoring ported from Python (perfect=300, normal=156).
- **Style-driven personas** — style = behaviour SHAPE (strike/spare/variance + friction-response
  curve), tier = level. Stroker flat across lanes; cranker/two-hander boom-bust on dry; straight =
  low steady ceiling.
- **Lane conditions** — pattern length, oil volume, surface → initial lane friction → per-bowler
  effective strike%.
- **Oil breakdown** — friction rises per frame; rate = traffic × avg aggression(revs) × coverstock.
  More bowlers on lane => faster burn => lower power-player scores.
- **Ball recommender** — generic covers/cores (plastic/urethane/solid/pearl × sym/asym), no brand IP.
- **Handicap** — scoring overlay decoupled from sim: scratch (default) / % of diff / flat-pins-for-F.
- **Lane occupancy config** — ignore / by-match (default) / manual count. Drives breakdown.
- Multi-opponent (1-3 rivals); shared live leaderboard + lane-state meter.

**Causal model (rev/speed are first-class — validated in Node):**
- `derive(attr,tierMult)` turns rev rate + ball speed + accuracy + consistency into the sim params.
  Style presets just FILL IN those attributes. Champion-mimic works: 540rpm/18.5mph elite → ~243;
  same revs at 14mph (mismatch, early burn) → ~214. Straight 180rpm caps ~182 even at elite.
- Gender = label + handicap key only; never a per-shot penalty. It would act as a *prior* over
  rev/speed only when auto-generating an unknown bowler (not yet exposed).

**Create-your-own:** Create Bowler screen (preset quick-fill → rev/speed/acc/cons sliders + live
projected-average preview) and inline Create Ball (cover/core, feeds breakdown + your ball choice).
Custom bowlers/balls are in-memory (prototype; no persistence). IP note shown on the create screen:
no real names/likenesses/brands shipped; users may mimic a champion's stats for personal use.

**Newer additions:**
- **Mid-game ball change** — a power player switches to urethane when the lane burns past their comfort
  (ball coverstock shifts their friction comfort via BALL_BIAS); shown as "🔄 ball down F7" in the
  leaderboard. Recovers a few pins vs riding the burn.
- **House vs Sport pattern** — sport amplifies friction sensitivity and punishes low accuracy/
  consistency (no miss room). League archetypes (League Larry ~160, Scratch Sam ~205, Sport Stacy
  ~230) show the divide: house bashers drop on sport, Stacy holds up.
- **Gender removed as a mechanic.** Division (Open/PBA/PWBA) is a cosmetic label only; handicap is a
  plain per-bowler number (human can enter their league handicap). Handicap modes: scratch / per-bowler
  / % of diff. The Asia flat-8 = just give a bowler a handicap of 8.

**Design rulings captured:** the real gender difference lives in rev/speed (power) + participation,
not a bowling-specific rule — so we model revs/speed and don't encode gender at all (avoids the debate
and is fairer). Sane defaults untouched; Advanced drawer for pattern/handicap/breakdown/traffic.

**VERDICT:** Layout **B (VS duel)** chosen — its tap-the-pins entry can capture *which* pins
are left/knocked, enabling spare/leave/split analysis. Next: upgrade the pin deck to a true
**positional** deck (per-ball standing-pin masks) and carry B into the real PWA.
