<script lang="ts">
	import Calibrate from '$lib/trace/Calibrate.svelte';
	import ClipLoader from '$lib/trace/ClipLoader.svelte';
	import TopDown from '$lib/trace/TopDown.svelte';
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
				The camera view is mapped to the real lane (39 boards × 60 ft). The scan
				frame-diffs the clip inside that quad and tracks the biggest moving thing — the ball.
			</p>
		</div>
		{#if t.scanning}
			<div class="progress"><div class="bar" style="width:{Math.round(t.scanProgress * 100)}%"></div></div>
			<p class="dimnote">Scanning… {Math.round(t.scanProgress * 100)}%</p>
		{:else}
			<button class="cta wide" onclick={() => t.scan()}>▶ Scan for the ball</button>
			{#if t.scanError}<p class="err">{t.scanError}</p>{/if}
			<div class="controls">
				<button class="ghost" onclick={() => t.recalibrate()}>↺ Adjust calibration</button>
				<button class="ghost" onclick={() => t.backToLoad()}>← Different clip</button>
			</div>
		{/if}
	{:else if t.step === 'results'}
		<div class="results">
			<TopDown track={t.track} metrics={t.metrics} hand={t.handedness()} />
			<div class="side">
				{#if t.metrics}
					{@const m = t.metrics}
					<span class="metric">laydown <b>{m.laydownBoard}</b></span>
					<span class="metric">breakpoint <b>{m.breakpointBoard}</b> @ {m.breakpointFt}ft</span>
					<span class="metric">entry <b>{m.entryBoard}</b> · {m.entryAngleDeg}°</span>
					<span class="metric">speed <b>{m.speedMph}</b> mph</span>
				{:else}
					<p class="dimnote" style="text-align:left">Track found, but too thin for honest numbers — the path is drawn as-is.</p>
				{/if}
				<p class="fine">{t.track.length} track points · boards from the right gutter · revs not measured.
					Rough &amp; relative — compare against your own shots, not absolutes.</p>
			</div>
		</div>
		<div class="controls">
			<button class="ghost" onclick={() => { t.step = 'scan'; }}>↺ Rescan</button>
			<button class="ghost" onclick={() => t.recalibrate()}>Calibration</button>
			<button class="ghost" onclick={() => t.backToLoad()}>← New clip</button>
		</div>
		<p class="dimnote">Saving to History lands in the next build.</p>
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
	.progress {
		height: 10px;
		border-radius: 999px;
		background: var(--panel);
		border: 1px solid var(--line);
		overflow: hidden;
		margin-top: 14px;
	}
	.progress .bar {
		height: 100%;
		background: var(--accent, #6c8cff);
		transition: width 0.15s linear;
	}
	.err {
		color: var(--opp, #ff7a59);
		font-size: 13px;
		margin: 8px 0 0;
		text-align: center;
	}
	.results {
		display: flex;
		gap: 14px;
		align-items: flex-start;
		flex-wrap: wrap;
	}
	.results .side {
		flex: 1;
		min-width: 130px;
	}
	.metric {
		display: inline-block;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 7px 11px;
		margin: 0 6px 6px 0;
		font-size: 13px;
	}
	.metric b {
		color: var(--gold);
		font-size: 17px;
	}
	.fine {
		color: var(--dim);
		font-size: 11px;
		line-height: 1.45;
		margin: 6px 0 0;
	}
</style>
