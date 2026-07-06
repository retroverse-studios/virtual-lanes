// Derive shot metrics from a lane-space ball track.
// Works on the coordinate system defined in homography.ts:
//   x = boards from the RIGHT gutter (0..39), y = feet from the foul line (0..60).
import { BOARD_WIDTH_IN, boardAt, LANE_BOARDS, POCKET_BOARD_LH, POCKET_BOARD_RH } from './homography';

export type Handedness = 'left' | 'right';

/** One tracked ball position: clip time (s) and lane coords. */
export interface TracePoint {
	t: number;
	lane: [number, number]; // [x boards-from-right, y feet-from-foul]
}

export interface TraceMetrics {
	laydownBoard: number;
	breakpointBoard: number;
	breakpointFt: number;
	entryBoard: number;
	/** Degrees off the lane's long axis at the pins; bigger = steeper into the pocket. */
	entryAngleDeg: number;
	/** Straight-line average over the whole track. Relative > absolute. */
	speedMph: number;
	/** Distance of the entry point from the handedness pocket, in boards (signed: + = high/inside). */
	pocketOffsetBoards: number;
}

const FT_PER_BOARD = BOARD_WIDTH_IN / 12;

/**
 * Centered moving average over the board (x) axis. The extremum-based metrics
 * (breakpoint) and the final-segment slope (entry angle) are the noise-sensitive
 * ones — smoothing x keeps them CONSISTENT between near-identical shots, which is
 * the product ("relative > absolute"). The raw track is still what gets drawn/stored.
 */
export function smoothTrack(track: readonly TracePoint[], window = 3): TracePoint[] {
	if (track.length < 3 || window < 3) return [...track];
	const half = Math.floor(window / 2);
	return track.map((p, i) => {
		// endpoints stay raw: laydown/entry/pocket-offset must not be dragged inward
		if (i === 0 || i === track.length - 1) return { t: p.t, lane: [p.lane[0], p.lane[1]] as [number, number] };
		let sum = 0;
		let n = 0;
		for (let j = Math.max(0, i - half); j <= Math.min(track.length - 1, i + half); j++) {
			sum += track[j].lane[0];
			n++;
		}
		return { t: p.t, lane: [sum / n, p.lane[1]] as [number, number] };
	});
}

/**
 * Compute shot metrics from a time-sorted track. Returns null when the track is too
 * thin to say anything honest (fewer than 3 points or <10 ft of travel).
 * Breakpoint and entry angle are derived from a smoothed copy of the track so a
 * single jittery point can't move them between otherwise identical shots.
 */
export function computeMetrics(track: readonly TracePoint[], hand: Handedness = 'right'): TraceMetrics | null {
	if (track.length < 3) return null;
	const pts = smoothTrack([...track].sort((a, b) => a.t - b.t));

	// nearest the foul line / nearest the pins, by lane distance not by time —
	// stray points survive upstream filtering occasionally.
	const near = pts.reduce((a, b) => (b.lane[1] < a.lane[1] ? b : a));
	const far = pts.reduce((a, b) => (b.lane[1] > a.lane[1] ? b : a));
	if (far.lane[1] - near.lane[1] < 10) return null;

	// Breakpoint = widest excursion toward the hand's gutter (min x for RH, max x for LH).
	const bp = pts.reduce((a, b) => {
		const wider = hand === 'right' ? b.lane[0] < a.lane[0] : b.lane[0] > a.lane[0];
		return wider ? b : a;
	});

	// Entry angle from the final segment (last two distinct points), converted to real units.
	const lastTwo = [pts[pts.length - 2], pts[pts.length - 1]];
	const dxFt = (lastTwo[1].lane[0] - lastTwo[0].lane[0]) * FT_PER_BOARD;
	const dyFt = lastTwo[1].lane[1] - lastTwo[0].lane[1];
	const entryAngleDeg = dyFt > 0 ? Math.abs((Math.atan2(dxFt, dyFt) * 180) / Math.PI) : 0;

	// Speed: straight-line lane distance near→far over elapsed time.
	const distFt = Math.hypot((far.lane[0] - near.lane[0]) * FT_PER_BOARD, far.lane[1] - near.lane[1]);
	const dt = Math.abs(far.t - near.t) || 1;
	const speedMph = (distFt / dt) * 0.681818;

	const pocket = hand === 'right' ? POCKET_BOARD_RH : POCKET_BOARD_LH;
	const entryX = far.lane[0];
	// signed offset: + means inside/high of the pocket (toward the head pin), − means light
	const pocketOffsetBoards = hand === 'right' ? entryX - pocket : pocket - entryX;

	return {
		laydownBoard: boardAt(near.lane[0]),
		breakpointBoard: boardAt(bp.lane[0]),
		breakpointFt: Math.round(bp.lane[1]),
		entryBoard: boardAt(entryX),
		entryAngleDeg: Math.round(entryAngleDeg * 10) / 10,
		speedMph: Math.round(speedMph * 10) / 10,
		pocketOffsetBoards: Math.round(pocketOffsetBoards * 10) / 10
	};
}

/**
 * Downsample a track for persistence (never store video; ≤ maxPoints of track is
 * plenty for redraw + re-derive). Keeps first/last points exactly.
 */
export function downsampleTrack(track: readonly TracePoint[], maxPoints = 200): TracePoint[] {
	if (track.length <= maxPoints) return [...track];
	const out: TracePoint[] = [];
	const step = (track.length - 1) / (maxPoints - 1);
	for (let i = 0; i < maxPoints; i++) out.push(track[Math.round(i * step)]);
	return out;
}

export { LANE_BOARDS };
