<script lang="ts">
	import Calibrate from '$lib/trace/Calibrate.svelte';
	import ClipLoader from '$lib/trace/ClipLoader.svelte';
	import { t } from '$lib/trace/state.svelte';

	let videoEl = $state<HTMLVideoElement>();
	$effect(() => {
		t.video = videoEl ?? null;
	});
</script>

<!-- the one decoder element every step draws from; owned here so steps can swap freely -->
<video bind:this={videoEl} playsinline muted preload="metadata" onseeked={() => t.frameSeeked()} style="display:none"></video>

<div class="page">
	<h1>🎥 Trace <span class="badge">beta</span></h1>

	{#if t.step === 'load'}
		<p class="lede">Film a shot and let the app track the ball — see what actually happened, not just what you read.</p>
		<ClipLoader />
		{#if t.hasClip}
			<button class="cta wide" onclick={() => t.startCalibrate()}>Calibrate lane corners →</button>
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
	{:else if t.step === 'calibrate'}
		<p class="lede">Scrub to a frame where all four lane corners are visible, then tap them in order.</p>
		<Calibrate />
	{:else if t.step === 'scan'}
		<div class="soon">
			<strong>✓ Lane calibrated</strong>
			<p style="margin:8px 0 0">
				The camera view is now mapped to the real lane (39 boards × 60 ft).
				Next build: scan the clip for the ball and draw the top-down track.
			</p>
		</div>
		<button class="cta wide" disabled>Scan for the ball →</button>
		<p class="dimnote">Ball scan lands in the next build.</p>
		<div class="controls">
			<button class="ghost" onclick={() => t.recalibrate()}>↺ Adjust calibration</button>
			<button class="ghost" onclick={() => t.backToLoad()}>← Different clip</button>
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
	.cta.wide {
		display: block;
		width: 100%;
		margin-top: 12px;
	}
	.cta.wide:disabled {
		opacity: 0.45;
	}
	.dimnote {
		color: var(--dim);
		font-size: 12px;
		text-align: center;
		margin-top: 8px;
	}
	.controls {
		display: flex;
		gap: 8px;
		margin-top: 10px;
		justify-content: center;
	}
</style>
