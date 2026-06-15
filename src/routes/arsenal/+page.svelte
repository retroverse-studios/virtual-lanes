<script lang="ts">
	import { arsenal, Arsenal } from '$lib/arsenal.svelte';
	import type { ArsenalBall, Cover, Core } from '$lib/engine/types';

	type Draft = Omit<ArsenalBall, 'id'>;
	const newDraft = (): Draft => ({ name: '', cover: 'pearl', core: 'symmetric', weight: 15, surface: 'box finish', layout: '', note: '' });

	let formOpen = $state(false);
	let editingId = $state<string | null>(null);
	let d = $state<Draft>(newDraft());

	const COVERS: Cover[] = ['plastic', 'urethane', 'solid', 'hybrid', 'pearl'];
	const CORES: Core[] = ['symmetric', 'asymmetric'];

	function openNew() {
		d = newDraft();
		editingId = null;
		formOpen = true;
	}
	function openEdit(b: ArsenalBall) {
		d = { name: b.name, cover: b.cover, core: b.core, weight: b.weight, surface: b.surface, layout: b.layout ?? '', note: b.note ?? '' };
		editingId = b.id;
		formOpen = true;
	}
	function save() {
		const b: ArsenalBall = { id: editingId ?? Arsenal.newId(), ...d, name: d.name.trim() || 'My ball' };
		if (editingId) arsenal.update(editingId, b);
		else arsenal.add(b);
		formOpen = false;
	}
</script>

<div class="topbar">
	<a class="back" href="/settings">←</a>
	<span class="tag">ARSENAL</span>
	<span style="flex:1"></span>
	{#if !formOpen}<button class="ghost" onclick={openNew}>＋ New ball</button>{/if}
</div>

<div class="page">
	{#if formOpen}
		<div class="form">
			<div class="ftitle">{editingId ? 'Edit ball' : 'Add a ball'}</div>
			<p class="note">Name it whatever you like — mimic a real ball if you know its specs (we don't ship real brands). The simulation reads the <b>coverstock</b> (and surface); weight, core/CG and layout are recorded for your own tracking and future analysis.</p>
			<div class="field"><label for="bn">Name</label><input id="bn" bind:value={d.name} placeholder="e.g. My benchmark solid" /></div>
			<div class="field"><span class="fl">Coverstock</span>
				<div class="seg">{#each COVERS as c (c)}<button class:on={d.cover === c} onclick={() => (d.cover = c)}>{c}</button>{/each}</div>
			</div>
			<div class="row2">
				<div class="field"><span class="fl">Core</span>
					<div class="seg">{#each CORES as c (c)}<button class:on={d.core === c} onclick={() => (d.core = c)}>{c === 'symmetric' ? 'Sym' : 'Asym'}</button>{/each}</div>
				</div>
				<div class="field"><label for="bw">Weight (lb)</label><input id="bw" type="number" inputmode="numeric" min="6" max="16" bind:value={d.weight} /></div>
			</div>
			<div class="field"><label for="bs">Surface</label><input id="bs" bind:value={d.surface} placeholder="e.g. 2000 grit, polished" /></div>
			<div class="field"><label for="bl">Layout / pin / CG</label><input id="bl" bind:value={d.layout} placeholder="e.g. 4 x 4 x 2, pin under ring" /></div>
			<div class="field"><label for="bnote">Note</label><input id="bnote" bind:value={d.note} placeholder="optional" /></div>
			<div class="frow">
				<button class="ghost" onclick={() => (formOpen = false)}>Cancel</button>
				<button class="cta" onclick={save}>{editingId ? 'Save ball' : 'Add ball'}</button>
			</div>
		</div>
	{:else}
		<div class="sec">Your balls</div>
		{#if arsenal.custom.length === 0}
			<div class="soon">None yet — tap “＋ New ball”. Name it whatever you like (mimic a real ball if you know its specs).</div>
		{:else}
			{#each arsenal.custom as b (b.id)}
				<div class="rcard">
					<div class="rinfo">
						<div class="nm">{b.name}</div>
						<div class="st">{b.cover} · {b.core === 'symmetric' ? 'sym' : 'asym'} · {b.weight}lb · {b.surface}{b.layout ? ` · ${b.layout}` : ''}</div>
					</div>
					<button class="ghost sm" onclick={() => openEdit(b)}>Edit</button>
					<button class="ghost sm danger" onclick={() => confirm(`Delete ${b.name}?`) && arsenal.remove(b.id)}>✕</button>
				</div>
			{/each}
		{/if}

		<div class="sec">Stock balls</div>
		{#each arsenal.stockList as { ball: b, hidden } (b.id)}
			<div class="rcard" class:dim={hidden}>
				<div class="rinfo">
					<div class="nm">{b.name}</div>
					<div class="st">{b.cover} · {b.core === 'symmetric' ? 'sym' : 'asym'} · {b.weight}lb</div>
				</div>
				{#if hidden}
					<button class="ghost sm" onclick={() => arsenal.unhide(b.id)}>Show</button>
				{:else}
					<button class="ghost sm" onclick={() => arsenal.hide(b.id)}>Hide</button>
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
		text-transform: capitalize;
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
	.frow {
		display: flex;
		gap: 8px;
		margin-top: 6px;
	}
	.frow .cta {
		flex: 1;
	}
	.seg button {
		text-transform: capitalize;
	}
</style>
