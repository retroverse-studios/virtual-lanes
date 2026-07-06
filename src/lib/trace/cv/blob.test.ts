import { describe, expect, it } from 'vitest';
import { diffMask, grayscale, largestBlob } from './blob';

/** Build a w×h mask from row strings ('.'=0, '#'=1). */
function mask(rows: string[]): { m: Uint8Array; w: number; h: number } {
	const h = rows.length,
		w = rows[0].length;
	const m = new Uint8Array(w * h);
	rows.forEach((row, y) => [...row].forEach((ch, x) => (m[y * w + x] = ch === '#' ? 1 : 0)));
	return { m, w, h };
}

describe('grayscale', () => {
	it('applies Rec.601 luma weights', () => {
		// one pure-red, one pure-green, one pure-blue, one white pixel
		const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
		const g = grayscale(rgba, 4, 1);
		expect([...g.slice(0, 3)]).toEqual([76, 150, 28]); // 255*.3, 255*.59, 255*.11, floored
		expect(g[3]).toBeGreaterThanOrEqual(254); // white ≈ 255 (fp rounding)
	});
});

describe('diffMask', () => {
	it('marks only pixels that moved more than the threshold', () => {
		const prev = new Uint8Array([10, 10, 10, 200]);
		const cur = new Uint8Array([10, 50, 30, 160]);
		expect([...diffMask(cur, prev, 28)]).toEqual([0, 1, 0, 1]);
	});
	it('threshold is exclusive', () => {
		const prev = new Uint8Array([0]);
		const cur = new Uint8Array([28]);
		expect([...diffMask(cur, prev, 28)]).toEqual([0]);
	});
});

describe('largestBlob', () => {
	it('returns null on an empty mask', () => {
		const { m, w, h } = mask(['....', '....']);
		expect(largestBlob(m, w, h)).toBeNull();
	});

	it('finds a single blob centroid', () => {
		const { m, w, h } = mask([
			'......',
			'..##..',
			'..##..',
			'......'
		]);
		const b = largestBlob(m, w, h)!;
		expect(b.size).toBe(4);
		expect(b.cx).toBeCloseTo(2.5);
		expect(b.cy).toBeCloseTo(1.5);
	});

	it('picks the larger of two blobs (ball vs noise)', () => {
		const { m, w, h } = mask([
			'#.....',
			'....##',
			'....##',
			'....#.'
		]);
		const b = largestBlob(m, w, h)!;
		expect(b.size).toBe(5);
		expect(b.cx).toBeGreaterThan(3); // the right-hand cluster
	});

	it('uses 4-connectivity: diagonal pixels are separate blobs', () => {
		const { m, w, h } = mask([
			'#.',
			'.#'
		]);
		const b = largestBlob(m, w, h)!;
		expect(b.size).toBe(1);
	});

	it('handles a mask that is one solid block (stack, not recursion)', () => {
		const w = 200,
			h = 110; // the real downscaled processing size
		const m = new Uint8Array(w * h).fill(1);
		const b = largestBlob(m, w, h)!;
		expect(b.size).toBe(w * h);
		expect(b.cx).toBeCloseTo((w - 1) / 2);
		expect(b.cy).toBeCloseTo((h - 1) / 2);
	});
});
