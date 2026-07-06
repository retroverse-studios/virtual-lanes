<script lang="ts">
	import { ARROWS_FT, LANE_BOARDS, LANE_LENGTH_FT, POCKET_BOARD_LH, POCKET_BOARD_RH } from './cv/homography';
	import type { TracePoint } from './cv/metrics';
	import type { TraceMetrics } from './cv/metrics';

	let { track, metrics = null, hand = 'right' }: { track: TracePoint[]; metrics?: TraceMetrics | null; hand?: 'left' | 'right' } = $props();

	// SVG geometry (matches the old mock): lane rect at x 15..115, y 10..290, pins at top
	const LX = 15,
		LW = 100,
		LY = 10,
		LH = 280;
	// lane coords → svg: x measured from the RIGHT gutter, y in ft from the foul line
	const sx = (laneX: number) => LX + ((LANE_BOARDS - laneX) / LANE_BOARDS) * LW;
	const sy = (laneY: number) => LY + ((LANE_LENGTH_FT - laneY) / LANE_LENGTH_FT) * LH;

	let path = $derived(track.map((p, i) => `${i ? 'L' : 'M'}${sx(p.lane[0]).toFixed(1)} ${sy(p.lane[1]).toFixed(1)}`).join(' '));
	let pocketX = $derived(sx(hand === 'right' ? POCKET_BOARD_RH : POCKET_BOARD_LH));
	let first = $derived(track[0]);
	let last = $derived(track[track.length - 1]);
</script>

<svg viewBox="0 0 130 300" role="img" aria-label="Top-down lane with the tracked ball path">
	<rect x={LX} y={LY} width={LW} height={LH} rx="3" fill="#0d1326" stroke="var(--line)" />
	<!-- board lines every 5 boards -->
	{#each [5, 10, 15, 20, 25, 30, 35] as bd (bd)}
		<line x1={sx(bd)} y1={LY} x2={sx(bd)} y2={LY + LH} stroke="#1d2640" />
	{/each}
	<!-- arrows at 15 ft -->
	{#each [5.5, 10.5, 15.5, 20.5, 25.5, 30.5, 33.5] as bd (bd)}
		<path d={`M${sx(bd)} ${sy(ARROWS_FT) - 3} l3 6 l-6 0 z`} fill="#2b3556" />
	{/each}
	<!-- pocket marker -->
	<rect x={pocketX - 4} y={LY + 4} width="8" height="4" rx="1.5" fill="#ff7a59" />
	<text x={LX + 4} y={LY + 12} class="lbl">pins</text>
	<text x={LX + 4} y={LY + LH - 5} class="lbl">foul</text>

	{#if track.length}
		<path d={path} fill="none" stroke="var(--me)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
		{#if first}<circle cx={sx(first.lane[0])} cy={sy(first.lane[1])} r="3.6" fill="var(--gold)" />{/if}
		{#if metrics}
			<circle cx={sx(metrics.breakpointBoard - 0.5)} cy={sy(metrics.breakpointFt)} r="3.6" fill="var(--gold)" />
		{/if}
		{#if last}<circle cx={sx(last.lane[0])} cy={sy(last.lane[1])} r="3.6" fill="var(--gold)" />{/if}
	{/if}
</svg>

<style>
	svg {
		max-width: 220px;
		width: 100%;
		height: auto;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 8px;
		display: block;
	}
	.lbl {
		fill: var(--dim);
		font-size: 7px;
		font-family: inherit;
	}
</style>
