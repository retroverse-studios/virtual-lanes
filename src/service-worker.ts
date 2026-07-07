/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `vl-cache-${version}`;
// The adapter-static fallback page: a neutral SPA shell safe to serve at ANY offline URL
// (the prerendered '/' embeds home-route hydration data, so it's wrong for deep links).
// Named 404.html because that's what Cloudflare Pages serves natively for unmatched routes.
const FALLBACK = '/404.html';
const ASSETS = [...build, ...files, ...prerendered, FALLBACK]; // bundles + static + prerendered pages + shell
// O(1) membership test in the hot fetch path (ASSETS changes every build, so a Set is right).
const KNOWN = new Set(ASSETS);

sw.addEventListener('install', (event) => {
	// Cache each asset independently so one failed fetch can't abort the whole precache —
	// a transient network blip during the first install used to leave nothing cached at all.
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await Promise.allSettled(ASSETS.map((url) => cache.add(url)));
			await sw.skipWaiting();
		})()
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			// cache-first for known build/static assets
			if (KNOWN.has(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}
			try {
				const res = await fetch(req);
				// Only cache complete responses: a 206 (Range request, e.g. video seek) stored
				// here would later be served for full requests and permanently break playback.
				if (res.status === 200 && res.type === 'basic' && !req.headers.has('range')) cache.put(req, res.clone());
				return res;
			} catch {
				const cached = await cache.match(req);
				if (cached) return cached;
				// offline navigation → serve the neutral SPA shell
				if (req.mode === 'navigate') {
					const entry = (await cache.match(FALLBACK)) ?? (await cache.match('/'));
					if (entry) return entry;
				}
				throw new Error('offline and not cached');
			}
		})()
	);
});
