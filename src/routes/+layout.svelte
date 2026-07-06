<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { g } from '$lib/bowloff/state.svelte';
	import { j } from '$lib/journal/state.svelte';

	let { children } = $props();

	// Apply app updates the moment a new service worker takes over — but never mid-session:
	// a live bowl-off (in-memory until Finish) or an active journal would lose unsaved progress.
	onMount(() => {
		if (!('serviceWorker' in navigator)) return;
		// Skip the very first activation (no prior controller) so a brand-new install doesn't
		// reload the page it just loaded.
		const hadController = !!navigator.serviceWorker.controller;
		let refreshing = false;
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			if (refreshing || !hadController) return;
			if (g.screen === 'play' || j.active) return; // defer until a safe moment
			refreshing = true;
			location.reload();
		});
	});

	// The bottom bar = things you DO (the modes). Meta destinations live in "More".
	const MODES = [
		{ href: '/bowloff', ic: '🎳', label: 'Bowl-off' },
		{ href: '/journal', ic: '📖', label: 'Journal' },
		{ href: '/trace', ic: '🎥', label: 'Trace' },
		{ href: '/form', ic: '🏃', label: 'Form' }
	];
	const MENU = [
		{ href: '/', ic: '🏠', label: 'Home', exact: true },
		{ href: '/history', ic: '📊', label: 'History' },
		{ href: '/settings', ic: '⚙️', label: 'Settings' },
		{ href: '/help', ic: 'ℹ️', label: 'Help & About' }
	];

	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false)); // close after any navigation

	let path = $derived(page.url.pathname);
	// Hide the whole tab bar on the launch mode-picker.
	let showTabs = $derived(path !== '/');
	const isActive = (href: string, exact = false) => (exact ? path === href : path.startsWith(href));
	// "More" lights up when you're on one of its (non-home) utility pages.
	let moreActive = $derived(
		path.startsWith('/history') || path.startsWith('/settings') || path.startsWith('/help')
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)} />

<div class="app">
	{@render children()}

	{#if showTabs}
		{#if menuOpen}
			<button class="backdrop" aria-label="Close menu" onclick={() => (menuOpen = false)}></button>
			<div class="moresheet">
				<div class="moremenu" role="menu">
					{#each MENU as m (m.href)}
						<a href={m.href} role="menuitem" class:active={isActive(m.href, m.exact)}>
							<span class="ic">{m.ic}</span><span>{m.label}</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<nav class="tabbar">
			{#each MODES as t (t.href)}
				<a href={t.href} class:active={isActive(t.href)}>
					<span class="ic">{t.ic}</span>
					<span>{t.label}</span>
				</a>
			{/each}
			<button
				type="button"
				class="moretab"
				class:active={moreActive || menuOpen}
				aria-haspopup="true"
				aria-expanded={menuOpen}
				onclick={() => (menuOpen = !menuOpen)}
			>
				<span class="ic">☰</span>
				<span>More</span>
			</button>
		</nav>
	{/if}
</div>
