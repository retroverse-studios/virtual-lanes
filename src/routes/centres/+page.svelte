<script lang="ts">
	import { centres, Centres } from '$lib/centres.svelte';
	import type { Centre } from '$lib/engine/types';

	type Draft = Omit<Centre, 'id'>;
	const newDraft = (): Draft => ({ name: '', location: '', lanes: 24, pinsetter: 'freefall', approach: 'standard', approachFeel: 'normal', ballReturn: 'standard', note: '' });

	let formOpen = $state(false);
	let editingId = $state<string | null>(null);
	let d = $state<Draft>(newDraft());

	function openNew() {
		d = newDraft();
		editingId = null;
		formOpen = true;
	}
	function openEdit(c: Centre) {
		d = { name: c.name, location: c.location ?? '', lanes: c.lanes ?? 24, pinsetter: c.pinsetter, approach: c.approach, approachFeel: c.approachFeel, ballReturn: c.ballReturn, note: c.note ?? '' };
		editingId = c.id;
		formOpen = true;
	}
	function save() {
		const c: Centre = { id: editingId ?? Centres.newId(), ...d, name: d.name.trim() || 'My centre' };
		if (editingId) centres.update(editingId, c);
		else centres.add(c);
		formOpen = false;
	}
	const desc = (c: Centre) => `${c.lanes ?? '?'} lanes · ${c.pinsetter === 'string' ? 'string pins' : 'free-fall'} · ${c.approach}/${c.approachFeel} approach · ${c.ballReturn} return`;
</script>

<div class="topbar">
	<a class="back" href="/settings">←</a>
	<span class="tag">CENTRES</span>
	<span style="flex:1"></span>
	{#if !formOpen}<button class="ghost" onclick={openNew}>＋ New centre</button>{/if}
</div>

<div class="page">
	{#if formOpen}
		<div class="form">
			<div class="ftitle">{editingId ? 'Edit centre' : 'Add a centre'}</div>
			<p class="note">Name it whatever you like — your home centre, or a classic you've bowled (we don't ship real names). This doesn't change scoring; it's context for your history and future pattern analysis.</p>
			<div class="field"><label for="cn">Name</label><input id="cn" bind:value={d.name} placeholder="e.g. My home centre" /></div>
			<div class="row2">
				<div class="field"><label for="cl">Location</label><input id="cl" bind:value={d.location} placeholder="optional" /></div>
				<div class="field"><label for="clanes">Lanes</label><input id="clanes" type="number" inputmode="numeric" bind:value={d.lanes} /></div>
			</div>
			<div class="field"><span class="fl">Pinsetter</span>
			<div class="seg" role="group" aria-label="Pinsetter">{#each [['freefall', 'Free-fall'], ['string', 'String']] as [v, l] (v)}<button class:on={d.pinsetter === v} aria-pressed={d.pinsetter === v} onclick={() => (d.pinsetter = v as typeof d.pinsetter)}>{l}</button>{/each}</div>
			</div>
			<div class="field"><span class="fl">Approach length</span>
			<div class="seg" role="group" aria-label="Approach length">{#each [['short', 'Short'], ['standard', 'Standard'], ['long', 'Long']] as [v, l] (v)}<button class:on={d.approach === v} aria-pressed={d.approach === v} onclick={() => (d.approach = v as typeof d.approach)}>{l}</button>{/each}</div>
			</div>
			<div class="field"><span class="fl">Approach feel</span>
			<div class="seg" role="group" aria-label="Approach feel">{#each [['sticky', 'Sticky'], ['normal', 'Normal'], ['slippery', 'Slippery']] as [v, l] (v)}<button class:on={d.approachFeel === v} aria-pressed={d.approachFeel === v} onclick={() => (d.approachFeel = v as typeof d.approachFeel)}>{l}</button>{/each}</div>
			</div>
			<div class="field"><span class="fl">Ball return</span>
			<div class="seg" role="group" aria-label="Ball return">{#each [['close', 'Close'], ['standard', 'Standard'], ['far', 'Far']] as [v, l] (v)}<button class:on={d.ballReturn === v} aria-pressed={d.ballReturn === v} onclick={() => (d.ballReturn = v as typeof d.ballReturn)}>{l}</button>{/each}</div>
			</div>
			<div class="field"><label for="cnote">Note</label><input id="cnote" bind:value={d.note} placeholder="optional" /></div>
			<div class="frow">
				<button class="ghost" onclick={() => (formOpen = false)}>Cancel</button>
				<button class="cta" onclick={save}>{editingId ? 'Save centre' : 'Add centre'}</button>
			</div>
		</div>
	{:else}
		<div class="sec">Your centres</div>
		{#if centres.custom.length === 0}
			<div class="soon">None yet — tap “＋ New centre” to add your home centre or a classic you've bowled.</div>
		{:else}
			{#each centres.custom as c (c.id)}
				<div class="rcard">
					<div class="rinfo"><div class="nm">{c.name}{c.location ? ` · ${c.location}` : ''}</div><div class="st">{desc(c)}</div></div>
					<button class="ghost sm" onclick={() => openEdit(c)}>Edit</button>
					<button class="ghost sm danger" onclick={() => confirm(`Delete ${c.name}?`) && centres.remove(c.id)}>✕</button>
				</div>
			{/each}
		{/if}

		<div class="sec">Stock centres</div>
		{#each centres.stockList as { centre: c, hidden } (c.id)}
			<div class="rcard" class:dim={hidden}>
				<div class="rinfo"><div class="nm">{c.name}</div><div class="st">{desc(c)}</div></div>
				{#if hidden}<button class="ghost sm" onclick={() => centres.unhide(c.id)}>Show</button>{:else}<button class="ghost sm" onclick={() => centres.hide(c.id)}>Hide</button>{/if}
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
	.frow {
		display: flex;
		gap: 8px;
		margin-top: 6px;
	}
	.frow .cta {
		flex: 1;
	}
</style>
