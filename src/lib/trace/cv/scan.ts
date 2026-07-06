// Track assembly for the ball scan: restrict motion detection to the calibrated
// lane, then turn noisy per-frame blob hits into a clean, honest track.
// Pure functions on plain data — no DOM — like the rest of cv/.
import { LANE_BOARDS, LANE_LENGTH_FT, type Pt } from './homography';
import type { TracePoint } from './metrics';

/** Is p inside the convex quad (corners in tap order FL, FR, PL, PR)? */
export function pointInQuad(p: Pt, corners: readonly Pt[]): boolean {
	// walk the perimeter FL → FR → PR → PL; inside = consistent cross-product sign
	const ring = [corners[0], corners[1], corners[3], corners[2]];
	let sign = 0;
	for (let i = 0; i < 4; i++) {
		const a = ring[i];
		const b = ring[(i + 1) % 4];
		const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
		if (cross === 0) continue; // on an edge counts as inside
		const s = Math.sign(cross);
		if (sign === 0) sign = s;
		else if (s !== sign) return false;
	}
	return true;
}

/**
 * Precomputed mask of which processing-resolution pixels lie on the lane.
 * `corners` are in video px; the mask is w×h at the downscaled processing size.
 * ANDing this into the frame-diff mask is what keeps the bowler's arm, the
 * neighbouring lane, and the ball-return out of the blob search.
 */
export function quadMask(corners: readonly Pt[], w: number, h: number, videoW: number, videoH: number): Uint8Array {
	const mask = new Uint8Array(w * h);
	const sx = videoW / w;
	const sy = videoH / h;
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++)
			if (pointInQuad([(x + 0.5) * sx, (y + 0.5) * sy], corners)) mask[y * w + x] = 1;
	return mask;
}

/** In-place AND of a diff mask with the lane mask. */
export function applyLaneMask(diff: Uint8Array, lane: Uint8Array): Uint8Array {
	for (let i = 0; i < diff.length; i++) if (!lane[i]) diff[i] = 0;
	return diff;
}

/** A raw per-frame hit: clip time + lane-space position (already through H). */
export interface RawHit {
	t: number;
	lane: Pt;
}

const EDGE_MARGIN = 1.5; // boards/ft of forgiveness at the lane edges
const BACKWARD_TOLERANCE_FT = 1; // jitter allowance against the pins-ward march

/**
 * Raw blob hits → clean track:
 * 1. drop hits outside the lane (small margin for calibration slack)
 * 2. monotonic-progress filter: the ball only travels toward the pins; hits that
 *    step backwards more than jitter are noise (the prototype only SORTED by time)
 * 3. fill blur gaps by linear interpolation so the drawn path doesn't jump
 */
export function buildTrack(raw: readonly RawHit[], opts: { fillGaps?: boolean } = {}): TracePoint[] {
	const { fillGaps = true } = opts;
	const inLane = raw
		.filter(
			(r) =>
				r.lane[0] >= -EDGE_MARGIN &&
				r.lane[0] <= LANE_BOARDS + EDGE_MARGIN &&
				r.lane[1] >= -EDGE_MARGIN &&
				r.lane[1] <= LANE_LENGTH_FT + EDGE_MARGIN
		)
		.slice()
		.sort((a, b) => a.t - b.t);

	// monotonic march toward the pins
	const kept: RawHit[] = [];
	for (const r of inLane) {
		const last = kept[kept.length - 1];
		if (!last || r.lane[1] >= last.lane[1] - BACKWARD_TOLERANCE_FT) kept.push(r);
	}

	const track: TracePoint[] = kept.map((r) => ({ t: r.t, lane: [r.lane[0], r.lane[1]] }));
	if (!fillGaps || track.length < 3) return track;

	// interpolate gaps > 2× the median sampling interval (motion blur / missed frames)
	const dts = track.slice(1).map((p, i) => p.t - track[i].t);
	const median = [...dts].sort((a, b) => a - b)[Math.floor(dts.length / 2)];
	if (!median) return track;
	const filled: TracePoint[] = [track[0]];
	for (let i = 1; i < track.length; i++) {
		const a = track[i - 1];
		const b = track[i];
		const gap = b.t - a.t;
		const steps = Math.min(Math.round(gap / median), 12); // cap runaway interpolation
		for (let s = 1; s < steps; s++) {
			const f = s / steps;
			filled.push({
				t: a.t + gap * f,
				lane: [a.lane[0] + (b.lane[0] - a.lane[0]) * f, a.lane[1] + (b.lane[1] - a.lane[1]) * f]
			});
		}
		filled.push(b);
	}
	return filled;
}
