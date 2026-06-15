<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children } = $props();

	const TABS = [
		{ href: '/bowloff', ic: '🎳', label: 'Bowl-off' },
		{ href: '/lane-read', ic: '📖', label: 'Lane Read' },
		{ href: '/trace', ic: '🎥', label: 'Trace' },
		{ href: '/history', ic: '📊', label: 'History' },
		{ href: '/settings', ic: '⚙️', label: 'Settings' }
	];
	// Hide the tab bar on the launch mode-picker.
	let showTabs = $derived(page.url.pathname !== '/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	{@render children()}

	{#if showTabs}
		<nav class="tabbar">
			{#each TABS as t (t.href)}
				<a href={t.href} class:active={page.url.pathname.startsWith(t.href)}>
					<span class="ic">{t.ic}</span>
					<span>{t.label}</span>
				</a>
			{/each}
		</nav>
	{/if}
</div>
