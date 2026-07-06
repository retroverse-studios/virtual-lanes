<script lang="ts">
	import { roster, RosterStore } from '$lib/roster.svelte';
	import { STYLE_PRESETS, TIERS, styleShort } from '$lib/engine/personas';
	import { clamp, derive, projectAverage } from '$lib/engine/bowling';
	import type { Bowler, StyleKey, TierKey } from '$lib/engine/types';

	type Draft = {
		name: string;
		tier: TierKey;
		division: 'open' | 'pba' | 'pwba';
		handicap: number;
		styleKey: StyleKey;
		attr: { rev: number; speed: number; acc: number; cons: number };
		scout: string;
	};
	const newDraft = (): Draft => ({ name: '', tier: 'pro', division: 'open', handicap: 0, styleKey: 'cranker', attr: { ...STYLE_PRESETS.cranker }, scout: '' });

	let formOpen = $state(false);
	let editingId = $state<string | null>(null);
	let d = $state<Draft>(newDraft());

	function openNew() {
		d = newDraft();
		editingId = null;
		formOpen = true;
	}
	function openEdit(b: Bowler) {
		d = { name: b.name, tier: b.tier, division: b.division, handicap: b.handicap, styleKey: b.styleKey, attr: { ...b.attr }, scout: b.scout ?? '' };
		editingId = b.id;
		formOpen = true;
	}
	function applyPreset(k: Exclude<StyleKey, 'custom'>) {
		d.styleKey = k;
		d.attr = { ...STYLE_PRESETS[k] };
	}
	function save() {
		const b: Bowler = {
			id: editingId ?? RosterStore.newId(),
			name: d.name.trim() || 'My rival',
			styleKey: d.styleKey,
			tier: d.tier,
			division: d.division,
			handicap: d.handicap,
			attr: { ...d.attr },
			scout: d.scout.trim(),
			custom: true
		};
		if (editingId) roster.update(editingId, b);
		else roster.add(b);
		formOpen = false;
	}

	let proj = $derived(projectAverage(d.attr, d.tier));
	let p = $derived(derive(d.attr, TIERS[d.tier].mult));
	let presetOpts = $derived(Object.entries(STYLE_PRESETS).map(([k, v]) => ({ k: k as Exclude<StyleKey, 'custom'>, label: v.label })));
</script>

<div class="topbar">
	<a class="back" href="/bowloff">←</a>
	<span class="tag">RIVALS</span>
	<span style="flex:1"></span>
	{#if !formOpen}<button class="ghost" onclick={openNew}>＋ New rival</button>{/if}
</div>

<div class="page">
	{#if formOpen}
		<div class="form">
			<div class="ftitle">{editingId ? 'Edit rival' : 'Create a rival'}</div>
			<p class="note">No gender — revs &amp; speed determine ball motion. Division is just a label. For personal use you can mimic a champion's known stats; we don't ship real names/likenesses.</p>
			<div class="field"><label for="rn">Name</label><input id="rn" bind:value={d.name} placeholder="e.g. The Belmo-style two-hander" /></div>
			<div class="row2">
				<div class="field"><span class="fl">Tier</span>
					<div class="seg" role="group" aria-label="Tier">
						{#each [['rookie', 'Rk'], ['club', 'Cl'], ['pro', 'Pro'], ['elite', 'El']] as [v, l] (v)}
						<button class:on={d.tier === v} aria-pressed={d.tier === v} onclick={() => (d.tier = v as TierKey)}>{l}</button>
						{/each}
					</div>
				</div>
				<div class="field"><label for="rh">Handicap</label><input id="rh" type="number" inputmode="numeric" bind:value={d.handicap} /></div>
			</div>
			<div class="field"><span class="fl">Division (label only)</span>
				<div class="seg" role="group" aria-label="Division (label only)">
					{#each [['open', 'Open'], ['pba', 'PBA'], ['pwba', 'PWBA']] as [v, l] (v)}
					<button class:on={d.division === v} aria-pressed={d.division === v} onclick={() => (d.division = v as typeof d.division)}>{l}</button>
					{/each}
				</div>
			</div>
			<div class="field"><span class="fl">Quick-fill from a style</span>
				<div class="seg" role="group" aria-label="Quick-fill from a style">
					{#each presetOpts as o (o.k)}
					<button class:on={d.styleKey === o.k} aria-pressed={d.styleKey === o.k} onclick={() => applyPreset(o.k)}>{styleShort(o.k)}</button>
					{/each}
				</div>
			</div>
			<div class="slider"><span class="fl">Rev rate <b>{d.attr.rev} rpm</b></span>
				<input type="range" min="150" max="600" step="10" bind:value={d.attr.rev} oninput={() => (d.styleKey = 'custom')} /></div>
			<div class="slider"><span class="fl">Ball speed <b>{d.attr.speed} mph</b></span>
				<input type="range" min="13" max="22" step="0.5" bind:value={d.attr.speed} oninput={() => (d.styleKey = 'custom')} /></div>
			<div class="slider"><span class="fl">Accuracy <b>{Math.round(d.attr.acc * 100)}%</b></span>
				<input type="range" min="60" max="98" step="1" value={Math.round(d.attr.acc * 100)} oninput={(e) => { d.attr.acc = +e.currentTarget.value / 100; d.styleKey = 'custom'; }} /></div>
			<div class="slider"><span class="fl">Consistency <b>{Math.round(d.attr.cons * 100)}%</b></span>
				<input type="range" min="50" max="95" step="1" value={Math.round(d.attr.cons * 100)} oninput={(e) => { d.attr.cons = +e.currentTarget.value / 100; d.styleKey = 'custom'; }} /></div>
			<div class="ball">Projected house average: <b>{proj}</b> · strike {Math.round(p.baseStrike * 100)}% · spare {Math.round(p.baseSpare * 100)}% · {p.variance > 1.1 ? 'high' : p.variance > 0.7 ? 'med' : 'low'} variance</div>
			<div class="field"><label for="rs">Scouting note</label><input id="rs" bind:value={d.scout} placeholder="optional" /></div>
			<div class="frow">
				<button class="ghost" onclick={() => (formOpen = false)}>Cancel</button>
				<button class="cta" onclick={save}>{editingId ? 'Save rival' : 'Add rival'}</button>
			</div>
		</div>
	{:else}
		<div class="sec">Your rivals</div>
		{#if roster.custom.length === 0}
			<div class="soon">None yet — tap “＋ New rival” to build one (or mimic a champion by their stats).</div>
		{:else}
			{#each roster.custom as b (b.id)}
				<div class="rcard">
					<div class="rinfo">
						<div class="nm">{b.name}</div>
						<div class="st">{styleShort(b.styleKey)} · {TIERS[b.tier].label} · {b.division.toUpperCase()}{b.handicap ? ` · +${b.handicap}` : ''} · {b.attr.rev}rpm/{b.attr.speed}mph</div>
					</div>
					<button class="ghost sm" onclick={() => openEdit(b)}>Edit</button>
				<button class="ghost sm danger" onclick={() => confirm(`Delete ${b.name}?`) && roster.remove(b.id)}>✕</button>
				</div>
			{/each}
		{/if}

		<div class="sec">Built-in rivals</div>
		{#each roster.builtins as { bowler: b, hidden } (b.id)}
			<div class="rcard" class:dim={hidden}>
				<div class="rinfo">
					<div class="nm">{b.name}</div>
					<div class="st">{styleShort(b.styleKey)} · {TIERS[b.tier].label} · {b.attr.rev}rpm/{b.attr.speed}mph</div>
				</div>
				{#if hidden}
					<button class="ghost sm" onclick={() => roster.unhide(b.id)}>Show</button>
				{:else}
					<button class="ghost sm" onclick={() => roster.hide(b.id)}>Hide</button>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<style>
	.topbar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-bottom: 1px solid var(--line);
		position: sticky;
		top: 0;
		background: var(--bg);
		z-index: 5;
	}
	.back {
		font-size: 18px;
		color: var(--ink);
		padding: 0 4px;
	}
	.tag {
		font-weight: 700;
		letter-spacing: 0.5px;
	}
	.rcard {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 10px 12px;
		margin-bottom: 8px;
	}
	.rcard.dim {
		opacity: 0.5;
	}
	.rinfo {
		flex: 1;
		min-width: 0;
	}
	.rinfo .nm {
		font-weight: 700;
		font-size: 14px;
	}
	.rinfo .st {
		font-size: 11px;
		color: var(--dim);
	}
	.ghost.sm {
		padding: 6px 10px;
		font-size: 12px;
	}
	.ghost.danger {
		color: var(--opp);
		border-color: var(--opp);
	}
	.form {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 14px;
	}
	.ftitle {
		font-weight: 700;
		font-size: 16px;
		margin-bottom: 8px;
	}
	.note {
		font-size: 11px;
		color: var(--dim);
		line-height: 1.4;
		margin: 0 0 12px;
	}
	.slider {
		margin-bottom: 12px;
	}
	.slider .fl {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		color: var(--dim);
		margin-bottom: 4px;
	}
	.slider .fl b {
		color: var(--gold);
	}
	.slider input[type='range'] {
		width: 100%;
		accent-color: var(--accent);
	}
	.frow {
		display: flex;
		gap: 8px;
		margin-top: 6px;
	}
	.frow .cta {
		flex: 1;
	}
</style>
