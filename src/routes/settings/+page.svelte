<script lang="ts">
	import { g } from '$lib/bowloff/state.svelte';
	import { history } from '$lib/history.svelte';
	import { STYLE_PRESETS } from '$lib/engine/personas';
	import { centres } from '$lib/centres.svelte';

	function pickCentre(id: string) {
		const c = centres.available.find((x) => x.id === id);
		g.cond.centreId = id;
		if (c) g.cond.alley = c.name;
		g.saveSetup();
	}

	const styleOpts = Object.entries(STYLE_PRESETS).map(([k, v]) => ({ k, label: v.label }));
	let importMsg = $state('');

	function exportData() {
		const payload = JSON.stringify(
			{ app: 'virtuallanes', version: 1, exportedAt: new Date().toISOString(), games: history.games },
			null,
			2
		);
		const blob = new Blob([payload], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `virtuallanes-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function onFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const parsed = JSON.parse(await file.text());
			const games = Array.isArray(parsed) ? parsed : parsed.games;
			if (!Array.isArray(games)) throw new Error('no games');
			const added = history.import(games, false);
			importMsg = `Imported ${added} new game${added === 1 ? '' : 's'}${games.length - added > 0 ? ` (${games.length - added} already present)` : ''}.`;
		} catch {
			importMsg = 'Import failed — not a valid VirtualLanes export file.';
		}
		input.value = '';
	}
</script>

<div class="page">
	<h1>⚙️ Settings</h1>

	<div class="sec">Profile</div>
	<p class="lede" style="margin-bottom:10px">Your defaults for Bowl-off. Saved automatically.</p>
	<div class="field"><label for="name">Name</label><input id="name" bind:value={g.human.name} oninput={() => g.saveSetup()} /></div>
	<div class="row2">
		<div class="field">
			<label for="style">Style</label>
			<select id="style" bind:value={g.human.styleKey} onchange={() => g.saveSetup()}>
				{#each styleOpts as o (o.k)}<option value={o.k}>{o.label}</option>{/each}
			</select>
		</div>
		<div class="field"><label for="avg">Average</label><input id="avg" type="number" inputmode="numeric" bind:value={g.human.avg} oninput={() => g.saveSetup()} /></div>
	</div>
	<div class="row2">
		<div class="field"><label for="hcp">Handicap</label><input id="hcp" type="number" inputmode="numeric" bind:value={g.human.handicap} oninput={() => g.saveSetup()} /></div>
		<div class="field">
			<span class="fl">Division</span>
		<div class="seg" role="group" aria-label="Division">
				{#each [['open', 'Open'], ['pba', 'PBA'], ['pwba', 'PWBA']] as [v, l] (v)}
				<button class:on={g.human.division === v} aria-pressed={g.human.division === v} onclick={() => { g.human.division = v as typeof g.human.division; g.saveSetup(); }}>{l}</button>
				{/each}
			</div>
		</div>
	</div>
	<div class="row2">
		<div class="field">
			<span class="fl">Handedness</span>
		<div class="seg" role="group" aria-label="Handedness">
				{#each [['right', 'Right'], ['left', 'Left']] as [v, l] (v)}
				<button class:on={g.human.handedness === v} aria-pressed={g.human.handedness === v} onclick={() => { g.human.handedness = v as typeof g.human.handedness; g.saveSetup(); }}>{l}</button>
				{/each}
			</div>
		</div>
		<div class="field">
			<span class="fl">Grip</span>
		<div class="seg" role="group" aria-label="Grip">
				{#each [['one', '1-handed'], ['two', '2-handed']] as [v, l] (v)}
				<button class:on={g.human.grip === v} aria-pressed={g.human.grip === v} onclick={() => { g.human.grip = v as typeof g.human.grip; g.saveSetup(); }}>{l}</button>
				{/each}
			</div>
		</div>
	</div>
	<div class="field"><label for="dcentre">Default centre</label>
		<select id="dcentre" value={g.cond.centreId} onchange={(e) => pickCentre(e.currentTarget.value)}>
			{#each centres.available as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
		</select>
	</div>

	<div class="sec">Data</div>
	<p class="lede" style="margin-bottom:10px">{history.games.length} game{history.games.length === 1 ? '' : 's'} saved on this device (local only — no account).</p>
	{#if history.writeFailed}
		<div class="msg warn">⚠ Storage full or unavailable — recent changes may not have saved. Use Export backup to keep your data.</div>
	{/if}
	<div class="btns">
		<button class="cta sub" onclick={exportData} disabled={!history.games.length}>⤓ Export backup</button>
		<label class="cta sub">
			⤒ Import backup
			<input type="file" accept="application/json,.json" onchange={onFile} hidden />
		</label>
	</div>
	{#if importMsg}<div class="msg">{importMsg}</div>{/if}
	<button class="cta danger" onclick={() => confirm('Delete ALL saved games on this device? This cannot be undone.') && history.clear()} disabled={!history.games.length}>Clear all data</button>

	<div class="sec">Equipment, rivals &amp; centres</div>
	<div class="btns">
		<a class="cta sub" href="/arsenal" style="text-decoration:none">🎳 Arsenal</a>
		<a class="cta sub" href="/rivals" style="text-decoration:none">👤 Rivals</a>
		<a class="cta sub" href="/centres" style="text-decoration:none">🏟 Centres</a>
	</div>

	<div class="sec">Help &amp; about</div>
	<a class="cta sub" href="/help" style="text-decoration:none;margin-bottom:10px">❓ Getting started / help →</a>
	<div class="soon">VirtualLanes v0.1 · offline-first PWA. Your data lives only on this device — use Export to back it up or move it to another phone.</div>
</div>

<style>
	.btns {
		display: flex;
		gap: 10px;
		margin-bottom: 10px;
	}
	.cta.sub {
		background: var(--panel2);
		color: var(--ink);
		border: 1px solid var(--line);
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.cta.danger {
		background: transparent;
		color: var(--opp);
		border: 1px solid var(--opp);
		margin-top: 4px;
	}
	.cta:disabled {
		opacity: 0.4;
	}
	.msg {
		font-size: 13px;
		color: var(--me);
		margin-bottom: 12px;
	}
	.msg.warn {
		color: var(--gold);
	}
</style>
