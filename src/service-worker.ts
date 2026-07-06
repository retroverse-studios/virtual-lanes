/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `vl-cache-${version}`;
const ASSETS = [...build, ...files, '/']; // app bundles + static files + the SPA entry
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
				if (res.ok && res.type === 'basic') cache.put(req, res.clone());
				return res;
			} catch {
				const cached = await cache.match(req);
				if (cached) return cached;
				// offline navigation → serve the cached SPA entry
				if (req.mode === 'navigate') {
					const entry = (await cache.match('/')) ?? (await cache.match('/index.html'));
					if (entry) return entry;
				}
				throw new Error('offline and not cached');
			}
		})()
	);
});
