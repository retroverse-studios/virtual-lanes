// 4-point homography (DLT): maps camera-image pixels onto the lane plane.
// Pure math — no DOM — so it's unit-testable like the scoring engine.
//
// Lane coordinate system (used by every Trace module):
//   x = continuous board position measured from the RIGHT gutter, 0..39
//       (standard numbering: board 1 is the rightmost; centre of board b is x = b - 0.5)
//   y = feet from the foul line toward the pins, 0..60
// Tap order for calibration corners is foul-L, foul-R, pins-L, pins-R (matches the
// prototype and product doc), so the destination corners are fixed:

export type Pt = [number, number];

export const LANE_BOARDS = 39;
export const LANE_LENGTH_FT = 60;
export const BOARD_WIDTH_IN = 41.5 / 39; // ≈ 1.064″ per board
export const ARROWS_FT = 15;
/** Right-hand pocket sits between boards 17 and 18 (from the right). */
export const POCKET_BOARD_RH = 17.5;
export const POCKET_BOARD_LH = LANE_BOARDS - POCKET_BOARD_RH; // mirrored, 21.5

/** Lane-space corners in tap order: foul-L, foul-R, pins-L, pins-R. */
export const LANE_CORNERS: readonly Pt[] = [
	[LANE_BOARDS, 0],
	[0, 0],
	[LANE_BOARDS, LANE_LENGTH_FT],
	[0, LANE_LENGTH_FT]
];

/** Display board number for a continuous lane-x. */
export function boardAt(x: number): number {
	return Math.min(LANE_BOARDS, Math.max(1, Math.ceil(x)));
}

/** Gaussian elimination with partial pivoting; solves A·x = b (A is n×n). */
function gauss(A: number[][], b: number[]): number[] {
	const n = b.length;
	const M = A.map((row, i) => [...row, b[i]]);
	for (let c = 0; c < n; c++) {
		let p = c;
		for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
		[M[c], M[p]] = [M[p], M[c]];
		const piv = M[c][c] || 1e-9; // degenerate (e.g. collinear corners) — avoid NaN, caller validates
		for (let r = 0; r < n; r++) {
			if (r === c) continue;
			const f = M[r][c] / piv;
			for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
		}
	}
	return M.map((row, i) => row[n] / (row[i] || 1e-9));
}

/**
 * Solve the homography H (row-major, 9 elements, h33 = 1) mapping each src[i] → dst[i].
 * Both arrays must hold exactly 4 points, no three of which are collinear.
 */
export function solveHomography(src: readonly Pt[], dst: readonly Pt[]): number[] {
	if (src.length !== 4 || dst.length !== 4) throw new Error('homography needs exactly 4 point pairs');
	const A: number[][] = [];
	const b: number[] = [];
	for (let i = 0; i < 4; i++) {
		const [x, y] = src[i];
		const [u, v] = dst[i];
		A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
		b.push(u);
		A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
		b.push(v);
	}
	const h = gauss(A, b);
	return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/** Map a point through H. */
export function applyHomography(H: readonly number[], [x, y]: Pt): Pt {
	const w = H[6] * x + H[7] * y + H[8];
	return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

/** Homography from tapped image corners (foul-L, foul-R, pins-L, pins-R) to lane coords. */
export function laneHomography(corners: readonly Pt[]): number[] {
	return solveHomography(corners, LANE_CORNERS);
}

/**
 * Sanity check for a computed lane homography: the image-corner quad must map into
 * lane space without flipping or blowing up (catches collinear / degenerate taps).
 */
export function isPlausibleLaneHomography(H: readonly number[], corners: readonly Pt[]): boolean {
	return corners.every((c, i) => {
		const [u, v] = applyHomography(H, c);
		const [eu, ev] = LANE_CORNERS[i];
		return Number.isFinite(u) && Number.isFinite(v) && Math.abs(u - eu) < 0.01 && Math.abs(v - ev) < 0.01;
	});
}

/**
 * Checks the tapped corners look like a lane filmed from behind the foul line:
 * foul corners below the pin corners in the image, left corners left of right ones.
 * (The DLT itself can't catch mis-ORDERED taps — it happily maps any 4 points.)
 */
export function isValidCornerOrder(corners: readonly Pt[]): boolean {
	if (corners.length !== 4) return false;
	const [fl, fr, pl, pr] = corners;
	return fl[0] < fr[0] && pl[0] < pr[0] && fl[1] > pl[1] && fr[1] > pr[1];
}
