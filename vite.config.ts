import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Offline-first SPA: prerender the static pages, fall back to a client-side shell for the
			// rest. '200.html' is the Cloudflare Pages SPA convention (and avoids colliding with a
			// prerendered home page at index.html); both CF Pages and Netlify serve it via _redirects.
			adapter: adapter({ fallback: '200.html' })
		})
	]
});
