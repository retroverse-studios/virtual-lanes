<script lang="ts">
	import { g } from './state.svelte';
	import { ADJUSTMENTS } from '$lib/journal/state.svelte';

	const REACTIONS: [string, string][] = [['early', 'Early'], ['mid', 'Mid'], ['late', 'Late']];
	const READS: [string, string][] = [['match', '✓ Matched'], ['miss', '✗ Misread']];
	const EMOTIONS: [string, string][] = [['good', '😊'], ['ok', '😐'], ['bad', '😤']];
</script>

{#if g.noteFrame !== null}
	<button class="backdrop" aria-label="Close note" onclick={() => g.closeNote()}></button>
	<div class="sheet">
		<div class="sht">📝 Frame {g.noteFrame + 1} note</div>
		<div class="field"><label for="pi-saw">What you saw</label><input id="pi-saw" bind:value={g.noteDraft.saw} placeholder="e.g. light hit, never recovered" /></div>
		<div class="field"><span class="fl">Reaction</span>
			<div class="seg" role="group" aria-label="Reaction">{#each REACTIONS as [v, l] (v)}<button class:on={g.noteDraft.reaction === v} aria-pressed={g.noteDraft.reaction === v} onclick={() => (g.noteDraft.reaction = g.noteDraft.reaction === v ? '' : (v as typeof g.noteDraft.reaction))}>{l}</button>{/each}</div>
		</div>
		<div class="field"><span class="fl">Adjusted</span>
			<div class="chips" role="group" aria-label="Adjusted">{#each ADJUSTMENTS as a (a)}<button class="chip" class:on={g.noteDraft.adjustments.includes(a)} aria-pressed={g.noteDraft.adjustments.includes(a)} onclick={() => g.toggleNoteAdj(a)}>{a}</button>{/each}</div>
		</div>
		<div class="row2">
			<div class="field"><span class="fl">Your read</span>
				<div class="seg" role="group" aria-label="Your read">{#each READS as [v, l] (v)}<button class:on={g.noteDraft.read === v} aria-pressed={g.noteDraft.read === v} onclick={() => (g.noteDraft.read = g.noteDraft.read === v ? '' : (v as typeof g.noteDraft.read))}>{l}</button>{/each}</div>
			</div>
			<div class="field"><span class="fl">Felt</span>
				<div class="seg" role="group" aria-label="Felt">{#each EMOTIONS as [v, e] (v)}<button class:on={g.noteDraft.emotion === v} aria-pressed={g.noteDraft.emotion === v} onclick={() => (g.noteDraft.emotion = g.noteDraft.emotion === v ? '' : (v as typeof g.noteDraft.emotion))}>{e}</button>{/each}</div>
			</div>
		</div>
		<div class="field"><label for="pi-note">Note</label><input id="pi-note" bind:value={g.noteDraft.note} placeholder="optional" /></div>
		<div class="frow">
			<button class="ghost" onclick={() => g.closeNote()}>Cancel</button>
			<button class="cta" onclick={() => g.saveNote()}>Save note</button>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		border: 0;
		z-index: 40;
	}
	.sheet {
		position: fixed;
		left: 50%;
		bottom: 0;
		transform: translateX(-50%);
		width: 100%;
		max-width: 540px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 18px 18px 0 0;
		padding: 16px 14px calc(18px + env(safe-area-inset-bottom));
		z-index: 41;
		max-height: 88vh;
		overflow-y: auto;
	}
	.sht {
		font-weight: 700;
		font-size: 16px;
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
		margin-top: 6px;
	}
	.frow .cta {
		flex: 1;
	}
</style>
