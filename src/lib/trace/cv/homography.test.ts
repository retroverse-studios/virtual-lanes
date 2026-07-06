import { describe, expect, it } from 'vitest';
import {
	applyHomography,
	boardAt,
	isPlausibleLaneHomography,
	LANE_CORNERS,
	laneHomography,
	solveHomography,
	type Pt
} from './homography';

const close = (a: Pt, b: Pt, eps = 1e-6) => {
	expect(Math.abs(a[0] - b[0])).toBeLessThan(eps);
	expect(Math.abs(a[1] - b[1])).toBeLessThan(eps);
};

describe('solveHomography', () => {
	it('identity when src === dst', () => {
		const pts: Pt[] = [[0, 0], [10, 0], [0, 10], [10, 10]];
		const H = solveHomography(pts, pts);
		for (const p of [[3, 7], [9.5, 0.1], [5, 5]] as Pt[]) close(applyHomography(H, p), p);
	});

	it('maps all 4 corners exactly', () => {
		const src: Pt[] = [[102, 355], [534, 349], [281, 61], [369, 60]]; // a phone-view lane quad
		const dst: Pt[] = [[39, 0], [0, 0], [39, 60], [0, 60]];
		const H = solveHomography(src, dst);
		src.forEach((s, i) => close(applyHomography(H, s), dst[i], 1e-4));
	});

	it('handles pure scale + translate (affine)', () => {
		const src: Pt[] = [[0, 0], [2, 0], [0, 2], [2, 2]];
		const dst: Pt[] = src.map(([x, y]) => [x * 3 + 5, y * 2 - 1] as Pt);
		const H = solveHomography(src, dst);
		close(applyHomography(H, [1, 1]), [8, 1]);
		close(applyHomography(H, [0.5, 1.5]), [6.5, 2]);
	});

	it('is projective: interior points interpolate non-linearly for a perspective quad', () => {
		// Trapezoid (camera looking down a lane) → rectangle
		const src: Pt[] = [[0, 100], [100, 100], [40, 0], [60, 0]];
		const dst: Pt[] = [[0, 0], [100, 0], [0, 100], [100, 100]];
		const H = solveHomography(src, dst);
		src.forEach((s, i) => close(applyHomography(H, s), dst[i], 1e-4));
		// midpoint of the far (short) edge maps to midpoint of the far dst edge
		close(applyHomography(H, [50, 0]), [50, 100], 1e-4);
		// Halfway up the IMAGE is nowhere near halfway down the LANE: the far half of the
		// lane is compressed into the top sliver of the frame, so v is well under 50.
		const [, v] = applyHomography(H, [50, 50]);
		expect(v).toBeGreaterThan(5);
		expect(v).toBeLessThan(35);
	});

	it('throws on wrong point counts', () => {
		expect(() => solveHomography([[0, 0]] as Pt[], [[0, 0]] as Pt[])).toThrow();
	});

	it('round-trips through the inverse mapping', () => {
		const src: Pt[] = [[80, 400], [560, 390], [260, 80], [390, 78]];
		const H = solveHomography(src, LANE_CORNERS as Pt[]);
		const Hinv = solveHomography(LANE_CORNERS as Pt[], src);
		for (const p of [[150, 300], [400, 200], [320, 100]] as Pt[]) {
			close(applyHomography(Hinv, applyHomography(H, p)), p, 1e-3);
		}
	});
});

describe('laneHomography', () => {
	it('maps tap order foulL,foulR,pinsL,pinsR to lane corners', () => {
		const corners: Pt[] = [[100, 700], [600, 700], [300, 100], [420, 100]];
		const H = laneHomography(corners);
		close(applyHomography(H, corners[0]), [39, 0], 1e-4); // foul-L → left gutter at foul line
		close(applyHomography(H, corners[1]), [0, 0], 1e-4); // foul-R → right gutter
		close(applyHomography(H, corners[3]), [0, 60], 1e-4); // pins-R
		expect(isPlausibleLaneHomography(H, corners)).toBe(true);
	});

	it('flags degenerate (collinear) corner taps as implausible', () => {
		const collinear: Pt[] = [[0, 0], [10, 10], [20, 20], [30, 30]];
		const H = laneHomography(collinear);
		expect(isPlausibleLaneHomography(H, collinear)).toBe(false);
	});
});

describe('boardAt', () => {
	it('maps continuous lane-x to standard board numbers (1 = rightmost)', () => {
		expect(boardAt(0.2)).toBe(1);
		expect(boardAt(0.5)).toBe(1); // centre of board 1
		expect(boardAt(17.5)).toBe(18);
		expect(boardAt(38.7)).toBe(39);
	});
	it('clamps outside the lane', () => {
		expect(boardAt(-2)).toBe(1);
		expect(boardAt(45)).toBe(39);
	});
});
