<script lang="ts">
	import Scrub from './Scrub.svelte';
	import { CORNER_LABELS, CORNER_TAGS, t } from './state.svelte';
	import type { Pt } from './cv/homography';

	let canvas = $state<HTMLCanvasElement>();
	let wrap = $state<HTMLDivElement>();
	let dragging = $state<number | null>(null);
	// loupe: magnified patch of raw video around the active corner, above the finger
	let loupe = $state<HTMLCanvasElement>();
	let loupeAt = $state<{ x: number; y: number; cx: number; cy: number } | null>(null);

	const LOUPE = 132; // css px, also its canvas resolution
	const ZOOM = 3;

	/** Pointer event → video-pixel coords. */
	function toVideo(e: PointerEvent): Pt {
		const r = canvas!.getBoundingClientRect();
		return [((e.clientX - r.left) / r.width) * canvas!.width, ((e.clientY - r.top) / r.height) * canvas!.height];
	}
	/** Grab radius that feels the same regardless of clip resolution (~24 css px). */
	function grabRadius(): number {
		const r = canvas!.getBoundingClientRect();
		return (24 / r.width) * canvas!.width;
	}

	function onDown(e: PointerEvent) {
		if (!canvas || !t.hasClip) return;
		const p = toVideo(e);
		const near = t.cornerNear(p, grabRadius());
		if (near >= 0) {
			dragging = near;
			t.updateCorner(near, p);
		} else if (t.corners.length < 4) {
			t.addCorner(p);
			dragging = t.corners.length - 1;
		} else return;
		canvas.setPointerCapture(e.pointerId);
		updateLoupe(e, p);
	}
	function onMove(e: PointerEvent) {
		if (dragging === null) return;
		const p = toVideo(e);
		t.updateCorner(dragging, p);
		updateLoupe(e, p);
	}
	function onUp() {
		dragging = null;
		loupeAt = null;
	}

	function updateLoupe(e: PointerEvent, p: Pt) {
		if (!wrap || !canvas) return;
		const wr = wrap.getBoundingClientRect();
		// hover the loupe above the finger, clamped inside the wrapper
		const x = Math.min(Math.max(e.clientX - wr.left - LOUPE / 2, 4), wr.width - LOUPE - 4);
		const y = Math.max(e.clientY - wr.top - LOUPE - 28, 4);
		loupeAt = { x, y, cx: p[0], cy: p[1] };
	}

	// Redraw on new frame / corner changes — draw() reads t.corners and `dragging`
	// deeply inside the effect, so those are tracked automatically.
	$effect(() => {
		void t.frameTick;
		draw();
	});
	function draw() {
		const ctx = canvas?.getContext('2d');
		if (!ctx || !t.video || !t.hasClip) return;
		if (canvas!.width !== t.clip!.width) {
			canvas!.width = t.clip!.width;
			canvas!.height = t.clip!.height;
		}
		ctx.drawImage(t.video, 0, 0, canvas!.width, canvas!.height);
		const w = canvas!.width;
		ctx.lineWidth = Math.max(2, w / 300);
		// quad outline once all 4 are down (draw order FL→FR→PR→PL)
		if (t.corners.length === 4) {
			ctx.strokeStyle = '#46d39a';
			ctx.beginPath();
			[0, 1, 3, 2].forEach((idx, k) => {
				const p = t.corners[idx];
				k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
			});
			ctx.closePath();
			ctx.stroke();
		}
		t.corners.forEach((p, i) => {
			ctx.fillStyle = i === dragging ? '#fff' : '#ffce4d';
			ctx.beginPath();
			ctx.arc(p[0], p[1], w / 90, 0, 7);
			ctx.fill();
			ctx.fillStyle = '#fff';
			ctx.font = `700 ${w / 42}px system-ui`;
			ctx.fillText(CORNER_TAGS[i], p[0] + w / 70, p[1] - w / 120);
		});
	}

	// loupe: zoomed raw video (no overlay clutter) + crosshair
	$effect(() => {
		const la = loupeAt;
		const ctx = loupe?.getContext('2d');
		if (!ctx || !la || !t.video) return;
		const src = LOUPE / ZOOM;
		ctx.imageSmoothingEnabled = false;
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, LOUPE, LOUPE);
		ctx.drawImage(t.video, la.cx - src / 2, la.cy - src / 2, src, src, 0, 0, LOUPE, LOUPE);
		ctx.strokeStyle = '#ffce4d';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(LOUPE / 2, 0);
		ctx.lineTo(LOUPE / 2, LOUPE);
		ctx.moveTo(0, LOUPE / 2);
		ctx.lineTo(LOUPE, LOUPE / 2);
		ctx.stroke();
	});
</script>

<div class="cal">
	<p class="hintline">
		{#if t.corners.length < 4}
			Tap {t.corners.length + 1} of 4: <b>{CORNER_LABELS[t.corners.length]}</b>
		{:else}
			Drag any corner to fine-tune — precision matters most at the pins.
		{/if}
	</p>

	<div class="wrap" bind:this={wrap}>
		<canvas bind:this={canvas} onpointerdown={onDown} onpointermove={onMove} onpointerup={onUp} onpointercancel={onUp}></canvas>
		{#if loupeAt}
			<canvas bind:this={loupe} class="loupe" width={LOUPE} height={LOUPE} style="left:{loupeAt.x}px;top:{loupeAt.y}px"></canvas>
		{/if}
	</div>

	<Scrub />

	{#if t.calibError}<p class="err">{t.calibError}</p>{/if}

	<div class="controls">
		<button class="ghost" onclick={() => t.backToLoad()}>← Clip</button>
		<button class="ghost" onclick={() => t.resetCorners()}>↺ Reset corners</button>
		<button class="cta" disabled={t.corners.length !== 4} onclick={() => t.computeCalibration()}>Use calibration →</button>
	</div>
</div>

<style>
	.cal {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 12px;
	}
	.hintline {
		margin: 0 0 8px;
		font-size: 13px;
		color: var(--dim);
	}
	.hintline b {
		color: var(--gold);
	}
	.wrap {
		position: relative;
		border-radius: 10px;
		overflow: hidden;
		background: #000;
	}
	.wrap canvas:first-child {
		display: block;
		width: 100%;
		height: auto;
		touch-action: none; /* corner drags must not scroll the page */
	}
	.loupe {
		position: absolute;
		border: 2px solid var(--gold);
		border-radius: 50%;
		pointer-events: none;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
	}
	.err {
		color: var(--opp, #ff7a59);
		font-size: 13px;
		margin: 8px 0 0;
	}
	.controls {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}
	.controls .cta {
		flex: 1;
	}
	.controls .cta:disabled {
		opacity: 0.45;
	}
</style>
