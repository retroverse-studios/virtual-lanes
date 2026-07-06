<script lang="ts">
	import { j, ADJUSTMENTS, EMOJI } from '$lib/journal/state.svelte';
	import { g } from '$lib/bowloff/state.svelte';
	import PostIt from '$lib/bowloff/PostIt.svelte';
	import { glyphs } from '$lib/engine/bowling';

	const REACTIONS: [string, string][] = [['early', 'Early'], ['mid', 'Mid'], ['late', 'Late']];
	const READS: [string, string][] = [['match', '✓ Matched'], ['miss', '✗ Misread']];
	const EMOTIONS: [string, string][] = [['good', '😊'], ['ok', '😐'], ['bad', '😤']];
	let mr = $derived(j.matchRate);
	let gameActive = $derived(g.screen === 'play' || g.screen === 'done');
	let frameIdx = $derived(Array.from({ length: Math.min(g.curIdx, 9) + 1 }, (_, i) => i));
</script>

{#if gameActive}
	<div class="page">
		<h1>📖 Journal</h1>
		<p class="lede">Notes attach to your active game — tap a frame to add a post-it. Most frames stay blank.</p>
		{#each frameIdx as i (i)}
			<button class="jframe" onclick={() => g.openNote(i)}>
				<div class="jf-h"><span class="fn">Frame {i + 1}</span><span class="g">{glyphs(g.humanFrames[i], i === 9).join(' ') || '—'}</span>{#if g.notes[i]}<span class="dot">📝</span>{/if}</div>
				{#if g.notes[i]}<div class="jf-note">{g.notes[i].saw || g.notes[i].note || g.notes[i].adjustments.join(', ') || 'note'}</div>{/if}
			</button>
		{/each}
		<p class="hint">These save with your game. Switch to Bowl-off to keep bowling.</p>
	</div>
	<PostIt />
{:else if !j.active}
	<div class="page">
		<h1>📖 Journal</h1>
		<p class="lede">No active game — journal standalone, or start a Bowl-off to journal frame-by-frame.</p>
		<div class="field"><label for="al">Alley</label><input id="al" bind:value={j.alley} /></div>
		<div class="row2">
			<div class="field"><label for="pat">Pattern</label><input id="pat" bind:value={j.pattern} placeholder="e.g. House, 41ft sport" /></div>
			<div class="field"><label for="bl">Ball</label><input id="bl" bind:value={j.ball} placeholder="optional" /></div>
		</div>
		<button class="cta" onclick={() => j.start()}>Start journaling →</button>
	</div>
{:else}
	<div class="topbar">
		<span class="tag">📖 JOURNAL</span>
		<span class="sub">· {j.shots.length} shot{j.shots.length === 1 ? '' : 's'}{mr.judged ? ` · read ${mr.matched}/${mr.judged}` : ''}</span>
		<span style="flex:1"></span>
		<button class="ghost" onclick={() => j.discard()}>Discard</button>
		<button class="ghost" style="border-color:var(--me);color:var(--me)" onclick={() => j.finish()}>Finish</button>
	</div>

	<div class="page">
		<div class="meta">{j.alley} · {j.pattern}{j.ball ? ` · ${j.ball}` : ''}</div>

		{#each j.shots as shot, i (i)}
			<div class="shot" class:editing={j.editing === i}>
				<button class="shotbody" onclick={() => j.editShot(i)}>
					<div class="sh">
						<span class="n">#{i + 1}</span>
						{#if shot.emotion}<span>{EMOJI[shot.emotion]}</span>{/if}
						{#if shot.read}<span class="read {shot.read}">{shot.read === 'match' ? '✓' : '✗'}</span>{/if}
					</div>
					{#if shot.saw}<div class="ln"><b>saw</b> {shot.saw}{shot.reaction ? ` (${shot.reaction})` : ''}</div>{/if}
					{#if shot.result}<div class="ln"><b>got</b> {shot.result}</div>{/if}
					{#if shot.adjustments.length}<div class="ln"><b>moved</b> {shot.adjustments.join(', ')}</div>{/if}
					{#if shot.note}<div class="ln note">{shot.note}</div>{/if}
				</button>
				<button class="del" aria-label="Delete shot" onclick={() => j.removeShot(i)}>✕</button>
			</div>
		{/each}

		<div class="form">
			<div class="ftitle">{j.editing === null ? `New shot #${j.shots.length + 1}` : `Editing shot #${j.editing + 1}`}</div>
			<div class="field"><label for="saw">What you saw</label><input id="saw" bind:value={j.draft.saw} placeholder="e.g. light hit, ball never recovered" /></div>
			<div class="field">
				<span class="fl">Reaction / hook timing</span>
				<div class="seg" role="group" aria-label="Reaction / hook timing">
					{#each REACTIONS as [v, l] (v)}
						<button class:on={j.draft.reaction === v} aria-pressed={j.draft.reaction === v} onclick={() => (j.draft.reaction = j.draft.reaction === v ? '' : (v as typeof j.draft.reaction))}>{l}</button>
					{/each}
				</div>
			</div>
			<div class="field"><label for="res">What happened</label><input id="res" bind:value={j.draft.result} placeholder="e.g. strike, 10-pin, 3-6-10 split" /></div>
			<div class="field">
				<span class="fl">Adjusted</span>
				<div class="chips" role="group" aria-label="Adjusted">
					{#each ADJUSTMENTS as a (a)}
					<button class="chip" class:on={j.draft.adjustments.includes(a)} aria-pressed={j.draft.adjustments.includes(a)} onclick={() => j.toggleAdj(a)}>{a}</button>
					{/each}
				</div>
			</div>
			<div class="row2">
				<div class="field">
					<span class="fl">Your read</span>
					<div class="seg" role="group" aria-label="Your read">
						{#each READS as [v, l] (v)}
							<button class:on={j.draft.read === v} aria-pressed={j.draft.read === v} onclick={() => (j.draft.read = j.draft.read === v ? '' : (v as typeof j.draft.read))}>{l}</button>
						{/each}
					</div>
				</div>
				<div class="field">
					<span class="fl">Felt</span>
					<div class="seg" role="group" aria-label="Felt">
						{#each EMOTIONS as [v, e] (v)}
							<button class:on={j.draft.emotion === v} aria-pressed={j.draft.emotion === v} onclick={() => (j.draft.emotion = j.draft.emotion === v ? '' : (v as typeof j.draft.emotion))}>{e}</button>
						{/each}
					</div>
				</div>
			</div>
			<div class="field"><label for="note">Note</label><input id="note" bind:value={j.draft.note} placeholder="optional" /></div>
			<div class="frow">
				{#if j.editing !== null}<button class="ghost" onclick={() => j.cancelEdit()}>Cancel</button>{/if}
				<button class="cta" disabled={!j.canSaveShot} onclick={() => j.saveShot()}>{j.editing === null ? 'Log shot' : 'Update shot'}</button>
			</div>
		</div>
	</div>
{/if}

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
	.tag {
		font-weight: 700;
		letter-spacing: 0.5px;
	}
	.sub {
		color: var(--dim);
		font-size: 12px;
	}
	.meta {
		color: var(--dim);
		font-size: 12px;
		margin-bottom: 10px;
	}
	.shot {
		position: relative;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 14px;
		margin-bottom: 8px;
	}
	.shot.editing {
		border-color: var(--accent);
	}
	.shotbody {
		display: block;
		width: 100%;
		text-align: left;
		padding: 10px 12px;
	}
	.sh {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		padding-right: 22px;
	}
	.sh .n {
		font-weight: 800;
	}
	.del {
		position: absolute;
		top: 8px;
		right: 10px;
		color: var(--dim);
		font-size: 13px;
		padding: 2px 4px;
	}
	.read.match {
		color: var(--me);
		font-weight: 800;
	}
	.read.miss {
		color: var(--opp);
		font-weight: 800;
	}
	.ln {
		font-size: 13px;
		color: var(--ink);
		margin-top: 3px;
	}
	.ln b {
		color: var(--dim);
		font-weight: 600;
		font-size: 11px;
		text-transform: uppercase;
		margin-right: 4px;
	}
	.ln.note {
		color: var(--dim);
		font-style: italic;
	}
	.form {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 12px;
		margin-top: 6px;
	}
	.ftitle {
		font-weight: 700;
		margin-bottom: 10px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
	}
	.chip {
		background: var(--panel2);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 7px 13px;
		font-size: 13px;
		color: var(--dim);
	}
	.chip.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
		font-weight: 700;
	}
	.frow {
		display: flex;
		gap: 8px;
		align-items: center;
		margin-top: 6px;
	}
	.frow .cta {
		flex: 1;
	}
	.jframe {
		display: block;
		width: 100%;
		text-align: left;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 10px 12px;
		margin-bottom: 8px;
	}
	.jf-h {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
	}
	.jf-h .fn {
		font-weight: 700;
	}
	.jf-h .g {
		flex: 1;
		color: var(--dim);
		letter-spacing: 2px;
	}
	.jf-note {
		font-size: 12px;
		color: var(--dim);
		font-style: italic;
		margin-top: 4px;
	}
	.hint {
		font-size: 12px;
		color: var(--dim);
		text-align: center;
		margin-top: 10px;
	}
</style>
