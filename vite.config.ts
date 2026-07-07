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
			// rest. '404.html' is what Cloudflare Pages (and GitHub Pages) serve natively for
			// unmatched routes — no _redirects needed. On the new Pages runtime a
			// `/* /200.html 200` redirect rule shadows real assets and pretty-URL-redirects to /200.
			adapter: adapter({ fallback: '404.html' })
		})
	]
});
