<script lang="ts">
	import { t } from './state.svelte';

	const STEP = 1 / 30; // fine step ≈ one 30fps frame (slow-mo clips just step finer in time)
</script>

{#if t.clip}
	<input
		type="range"
		min="0"
		max={t.clip.duration}
		step="0.01"
		value={t.time}
		oninput={(e) => t.seek(+e.currentTarget.value)}
		aria-label="Scrub clip"
	/>
	<div class="steprow">
		<button class="ghost" onclick={() => t.seek(t.time - 10 * STEP)}>« 10f</button>
		<button class="ghost" onclick={() => t.seek(t.time - STEP)}>‹ 1f</button>
		<span class="tc">t = {t.time.toFixed(2)}s</span>
		<button class="ghost" onclick={() => t.seek(t.time + STEP)}>1f ›</button>
		<button class="ghost" onclick={() => t.seek(t.time + 10 * STEP)}>10f »</button>
	</div>
{/if}

<style>
	input[type='range'] {
		width: 100%;
		margin: 10px 0 4px;
		accent-color: var(--accent, #6c8cff);
	}
	.steprow {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
	.steprow .tc {
		font-variant-numeric: tabular-nums;
		font-size: 12px;
		color: var(--dim);
		min-width: 76px;
		text-align: center;
	}
	.steprow .ghost {
		padding: 6px 10px;
		font-size: 12px;
	}
</style>
