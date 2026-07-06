<script lang="ts">
	import Scrub from './Scrub.svelte';
	import { t } from './state.svelte';

	let canvas = $state<HTMLCanvasElement>();
	let url: string | null = null;

	function onFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0];
		const v = t.video;
		if (!f || !v) return;
		if (url) URL.revokeObjectURL(url);
		url = URL.createObjectURL(f);
		v.src = url;
		v.onloadedmetadata = () => {
			t.loadClip({ name: f.name, duration: v.duration, width: v.videoWidth, height: v.videoHeight });
			if (canvas) {
				canvas.width = v.videoWidth;
				canvas.height = v.videoHeight;
			}
			t.seek(Math.min(0.1, v.duration)); // first frames are often black
		};
		input.value = ''; // same file can be re-picked
	}

	// redraw the preview whenever the video lands on a new frame
	$effect(() => {
		void t.frameTick;
		const ctx = canvas?.getContext('2d');
		if (ctx && t.video && t.hasClip) ctx.drawImage(t.video, 0, 0, canvas!.width, canvas!.height);
	});
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

	<div class="preview" class:empty={!t.hasClip}>
		<canvas bind:this={canvas}></canvas>
		{#if !t.hasClip}<span class="hint">Prop your phone down the lane, film one shot, load it here.</span>{/if}
	</div>

	<Scrub />
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
</style>
