# VirtualLanes

A phone-first bowling companion (PWA). Four modes over one shared history:

- **Bowl-off** — bowl your real frames and compete against a chosen, simulated rival, frame by frame.
- **Journal** — record your real shots (what you saw → decided → happened) to sharpen your lane read.
- **Trace** *(coming soon)* — film a shot; auto-track the ball for laydown, breakpoint, pocket and speed.
- **Form** *(coming soon)* — film your approach; on-device pose tracking reads swing plane, posture and footwork, step by step.

See **[docs/product-direction.md](docs/product-direction.md)** for the full vision, architecture, and the
simulation model (rev rate + ball speed are the causal levers; conditions, oil breakdown, ball changes).

## Stack

SvelteKit + TypeScript, `adapter-static` (offline-first SPA), deployable to any static host
(Cloudflare Pages / Netlify / a VPS). No backend in v1 — everything is local (localStorage).

## Develop

```bash
pnpm install
pnpm dev            # http://localhost:5173  (add --host to test on your phone)
pnpm build          # static build → ./build
pnpm preview        # serve the production build
pnpm check          # type-check
```

## Layout

- `src/lib/engine/` — the simulation + scoring engine (typed; ported from the original Python lib)
- `src/routes/` — `+page` launch mode-picker, and `bowloff` / `journal` / `trace` / `form` / `history` / `settings` tabs
- `prototype/` — throwaway HTML prototypes (bowl-off UX + engine, `trace.html` ball-track, `form.html` pose-track)
- `reference/` — the original Python `virtual_lanes` library + tests, kept as the canonical scoring reference

## License

MIT — see [LICENSE](LICENSE).
