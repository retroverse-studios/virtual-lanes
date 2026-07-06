---
name: verify
description: Build, serve, and drive VirtualLanes (SvelteKit PWA) headlessly to verify changes at the UI surface, including service-worker/offline behavior.
---

# Verifying VirtualLanes

Phone-first SvelteKit + adapter-static PWA. No project test server — build and drive it headlessly.

## Build + serve

```bash
pnpm build                                   # → ./build
pnpm preview --port 4199 --strictPort        # app flows (SPA fallback works)
pnpm dlx sirv-cli build --single 200.html --port 4200   # SW/offline tests (see gotcha)
```

**Gotchas**
- Ports 4173/4174 are often taken by OTHER apps on this machine (vite silently
  hops ports unless `--strictPort`; one squatter is a karaoke app). Always
  `--strictPort` and curl the `<title>` before trusting a port.
- `vite preview` **404s `/200.html`** (SvelteKit preview doesn't expose the
  adapter fallback file), so SW precache of the offline shell silently fails
  there. Use the sirv command above — it matches Cloudflare Pages semantics
  (static files + 200.html fallback). Live check: `virtual-lanes.pages.dev/200.html` → 200.
- Rebuilding while `vite preview` is running kills the preview process.

## Drive (playwright-core + installed Chrome)

`npm i playwright-core` in the scratchpad; `chromium.launch({ channel: 'chrome', headless: true })`,
viewport ~390×844 (phone-first layout). claude-in-chrome extension is usually NOT connected.

Flows worth driving:
- **Bowl-off**: `/bowloff` → click accordion summaries ("Lane & conditions" etc.) →
  segment buttons (check `aria-pressed`) → button `/Start/` → play screen has
  `button.bowl`, "Strike (all)" / "Spare (all)" / "Clear", pins are
  `getByRole('button', {name: 'Pin 7'})`. 12× Strike+Bowl completes a game → Done screen.
- **Live checkpoint**: localStorage `vl.bowloff.live.v1` written after each bowl,
  removed on game end/Discard; `page.reload()` mid-game must land back on play screen.
- **History**: `/history`, cards are `.gcard`.
- **Import**: `/settings`, `setInputFiles` on `input[type=file]` with an in-memory
  JSON buffer; result message matches `/Imported|failed/`.
- **Service worker**: `await page.evaluate(() => navigator.serviceWorker.ready)` +
  ~1s settle; inspect `caches` in `page.evaluate`. Offline: `context.setOffline(true)`
  then `page.goto` a client-only route (e.g. `/rivals`).
- Page titles are often NOT `<h1>` (topbar `<b>`) — assert on visible text or
  screenshots, not heading roles.

Storage keys: `vl.games.v1` (history), `vl.bowloff.setup.v1`, `vl.bowloff.live.v1`,
`vl.arsenal.v1`, `vl.roster.v1`, `vl.centres.v1`.
