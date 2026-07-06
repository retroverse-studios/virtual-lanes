import { describe, expect, it } from 'vitest';
import { applyLaneMask, buildTrack, pointInQuad, quadMask, type RawHit } from './scan';
import type { Pt } from './homography';

// A phone-view lane quad: wide at the foul line (bottom of image), narrow at the pins.
const QUAD: Pt[] = [[100, 330], [540, 330], [240, 40], [400, 40]]; // FL, FR, PL, PR

describe('pointInQuad', () => {
	it('inside / outside', () => {
		expect(pointInQuad([320, 200], QUAD)).toBe(true); // mid-lane
		expect(pointInQuad([320, 320], QUAD)).toBe(true); // near the foul line
		expect(pointInQuad([50, 200], QUAD)).toBe(false); // left of the lane
		expect(pointInQuad([320, 20], QUAD)).toBe(false); // above the pin deck
		expect(pointInQuad([150, 60], QUAD)).toBe(false); // outside the perspective taper
	});
});

describe('quadMask', () => {
	const w = 64,
		h = 36;
	const mask = quadMask(QUAD, w, h, 640, 360);
	it('marks lane pixels and leaves the borders clear', () => {
		const at = (x: number, y: number) => mask[y * w + x];
		expect(at(32, 20)).toBe(1); // mid-lane
		expect(at(2, 20)).toBe(0); // far left
		expect(at(32, 1)).toBe(0); // above pins
		expect(at(32, 35)).toBe(0); // below foul line
	});
	it('covers a plausible fraction of the frame', () => {
		const on = mask.reduce((s, v) => s + v, 0);
		expect(on / mask.length).toBeGreaterThan(0.15);
		expect(on / mask.length).toBeLessThan(0.6);
	});
});

describe('applyLaneMask', () => {
	it('zeroes motion outside the lane (the arm, the next lane)', () => {
		const diff = new Uint8Array([1, 1, 1, 1]);
		const lane = new Uint8Array([0, 1, 1, 0]);
		expect([...applyLaneMask(diff, lane)]).toEqual([0, 1, 1, 0]);
	});
});

describe('buildTrack', () => {
	const hit = (t: number, x: number, y: number): RawHit => ({ t, lane: [x, y] });

	it('drops hits outside the lane bounds', () => {
		const track = buildTrack([hit(0, 18, 2), hit(0.1, 60, 10), hit(0.2, 18, 12), hit(0.3, 18, -20)], { fillGaps: false });
		expect(track).toHaveLength(2);
	});

	it('monotonic filter: discards backwards jumps, not just re-sorts them', () => {
		// ball marching to the pins with one noise hit back near the foul line
		const raw = [hit(0, 18, 5), hit(0.1, 17, 15), hit(0.2, 16, 25), hit(0.25, 19, 6), hit(0.3, 15, 35)];
		const track = buildTrack(raw, { fillGaps: false });
		expect(track.map((p) => p.lane[1])).toEqual([5, 15, 25, 35]);
	});

	it('tolerates small backward jitter', () => {
		const raw = [hit(0, 18, 5), hit(0.1, 17, 15), hit(0.2, 17, 14.5), hit(0.3, 15, 25)];
		expect(buildTrack(raw, { fillGaps: false })).toHaveLength(4);
	});

	it('interpolates a blur gap at the median sampling rate', () => {
		// steady 0.1s sampling with one 0.4s hole between y=20 and y=50
		const raw = [hit(0, 18, 10), hit(0.1, 18, 15), hit(0.2, 18, 20), hit(0.6, 18, 50), hit(0.7, 18, 55)];
		const track = buildTrack(raw);
		expect(track.length).toBeGreaterThan(raw.length); // gap got filled
		const ys = track.map((p) => p.lane[1]);
		for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeLessThanOrEqual(10.01); // no 30ft jump remains
	});

	it('caps runaway interpolation on absurd gaps', () => {
		const raw = [hit(0, 18, 1), hit(0.01, 18, 2), hit(0.02, 18, 3), hit(10, 18, 55), hit(10.01, 18, 56)];
		expect(buildTrack(raw).length).toBeLessThan(30);
	});

	it('sorts unordered input by time', () => {
		const raw = [hit(0.2, 16, 25), hit(0, 18, 5), hit(0.1, 17, 15)];
		const track = buildTrack(raw, { fillGaps: false });
		expect(track.map((p) => p.lane[1])).toEqual([5, 15, 25]);
	});
});
