import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		// The engine + stores are pure logic (no DOM); node is fastest and faithful.
		environment: 'node',
		include: ['src/**/*.test.ts'],
		// ExFAT/AppleDouble resource forks (._*) must not be picked up as test files.
		exclude: ['**/._*', '**/.DS_Store', 'node_modules/**', 'dist/**', 'build/**'],
		coverage: { include: ['src/lib/engine/**'] }
	}
});
