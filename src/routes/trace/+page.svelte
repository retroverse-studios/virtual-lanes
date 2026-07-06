<script lang="ts">
	import ClipLoader from '$lib/trace/ClipLoader.svelte';
	import { t } from '$lib/trace/state.svelte';
</script>

<div class="page">
	<h1>🎥 Trace <span class="badge">beta</span></h1>
	<p class="lede">Film a shot and let the app track the ball — see what actually happened, not just what you read.</p>

	<ClipLoader />

	{#if t.hasClip}
		<button class="cta" disabled style="margin-top:12px">Calibrate lane corners →</button>
		<p class="dimnote">✓ Clip loaded. Calibration (tap the 4 lane corners) lands in the next build.</p>
	{:else}
		<div class="soon" style="margin-top:14px">
			<strong>How to film</strong>
			<ul>
				<li>Prop the phone behind the approach, looking straight down the lane — it must not move.</li>
				<li>Slow-mo (120/240 fps) gives the cleanest track; normal video works too.</li>
				<li>One shot per clip: start just before the release, stop when the ball hits the pins.</li>
			</ul>
			<p style="margin:8px 0 0">
				Then: tap the 4 lane corners to calibrate → the app tracks the ball →
				<strong>laydown · breakpoint · entry angle · speed</strong> on a top-down lane map.
				Traces save to the same history as Bowl-off and Journal.
			</p>
		</div>
	{/if}
</div>

<style>
	.badge {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--gold);
		border: 1px solid var(--gold);
		border-radius: 999px;
		padding: 2px 8px;
		vertical-align: middle;
		margin-left: 6px;
	}
	.soon ul {
		margin: 10px 0 0;
		padding-left: 18px;
		line-height: 1.5;
	}
	.soon li {
		margin-bottom: 6px;
	}
	.cta {
		display: block;
		width: 100%;
	}
	.cta:disabled {
		opacity: 0.45;
	}
	.dimnote {
		color: var(--dim);
		font-size: 12px;
		text-align: center;
		margin-top: 8px;
	}
</style>
