<script lang="ts">
	import { t } from './state.svelte';

	let video = $state<HTMLVideoElement>();
	let canvas = $state<HTMLCanvasElement>();
	let url: string | null = null;

	function onFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0];
		if (!f || !video) return;
		if (url) URL.revokeObjectURL(url);
		url = URL.createObjectURL(f);
		const v = video;
		v.src = url;
		v.onloadedmetadata = () => {
			t.loadClip({ name: f.name, duration: v.duration, width: v.videoWidth, height: v.videoHeight });
			t.video = v;
			if (canvas) {
				canvas.width = v.videoWidth;
				canvas.height = v.videoHeight;
			}
			seek(Math.min(0.1, v.duration)); // first frames are often black
		};
		input.value = ''; // same file can be re-picked
	}

	function seek(time: number) {
		if (!video || !t.hasClip) return;
		t.time = Math.min(Math.max(0, time), t.clip!.duration);
		video.currentTime = t.time;
	}

	function draw() {
		const ctx = canvas?.getContext('2d');
		if (ctx && video) ctx.drawImage(video, 0, 0, canvas!.width, canvas!.height);
	}

	const STEP = 1 / 30; // fine step ≈ one 30fps frame (slow-mo clips just step finer in time)
</script>

<div class="loader">
	<div class="pickrow">
		<label class="file">
			📁 {t.hasClip ? 'Change clip' : 'Choose a clip'}
			<input type="file" accept="video/*" onchange={onFile} hidden />
		</label>
		{#if t.clip}
			<span class="info">{t.clip.width}×{t.clip.height} · {t.clip.duration.toFixed(1)}s</span>
		{:else}
			<span class="info dim">slow-mo works best</span>
		{/if}
	</div>

	<!-- hidden decoder; the canvas is the visible preview -->
	<video bind:this={video} playsinline muted preload="metadata" onseeked={draw} style="display:none"></video>

	<div class="preview" class:empty={!t.hasClip}>
		<canvas bind:this={canvas}></canvas>
		{#if !t.hasClip}<span class="hint">Prop your phone down the lane, film one shot, load it here.</span>{/if}
	</div>

	{#if t.clip}
		<input
			type="range"
			min="0"
			max={t.clip.duration}
			step="0.01"
			value={t.time}
			oninput={(e) => seek(+e.currentTarget.value)}
			aria-label="Scrub clip"
		/>
		<div class="steprow">
			<button class="ghost" onclick={() => seek(t.time - 10 * STEP)}>« 10f</button>
			<button class="ghost" onclick={() => seek(t.time - STEP)}>‹ 1f</button>
			<span class="tc">t = {t.time.toFixed(2)}s</span>
			<button class="ghost" onclick={() => seek(t.time + STEP)}>1f ›</button>
			<button class="ghost" onclick={() => seek(t.time + 10 * STEP)}>10f »</button>
		</div>
	{/if}
</div>

<style>
	.loader {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 12px;
	}
	.pickrow {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}
	.file {
		background: #1d2640;
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 9px 13px;
		cursor: pointer;
		font-weight: 600;
	}
	.info {
		font-size: 12px;
	}
	.dim {
		color: var(--dim);
	}
	.preview {
		position: relative;
		border-radius: 10px;
		overflow: hidden;
		background: #000;
	}
	.preview.empty {
		min-height: 140px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.preview canvas {
		display: block;
		width: 100%;
		height: auto;
	}
	.hint {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 0 24px;
		color: var(--dim);
		font-size: 13px;
	}
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
