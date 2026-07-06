import { describe, expect, it } from 'vitest';
import { computeMetrics, downsampleTrack, type TracePoint } from './metrics';

/** Synthetic hook: skid out from the laydown, breakpoint, then hook back to the pocket. */
function hookTrack(opts: { hand: 'right' | 'left'; seconds?: number; points?: number }): TracePoint[] {
	const { hand, seconds = 2.5, points = 75 } = opts;
	const xAt = (y: number): number => {
		// RH shape (boards from right): laydown 18.5 → breakpoint 7.5 at 45 ft → pocket 17.5
		let x: number;
		if (y <= 45) x = 18.5 - (11 * y) / 45;
		else x = 7.5 + (10 * (y - 45)) / 15;
		return hand === 'right' ? x : 39 - x;
	};
	return Array.from({ length: points }, (_, i) => {
		const f = i / (points - 1);
		return { t: f * seconds, lane: [xAt(f * 60), f * 60] as [number, number] };
	});
}

describe('computeMetrics (right-handed hook)', () => {
	const m = computeMetrics(hookTrack({ hand: 'right' }), 'right')!;

	it('reads laydown / breakpoint / entry boards', () => {
		expect(m.laydownBoard).toBe(19); // x 18.5
		expect(m.breakpointBoard).toBe(8); // widest excursion x 7.5
		expect(m.breakpointFt).toBe(45);
		expect(m.entryBoard).toBe(18); // pocket x 17.5
	});

	it('entry angle is a realistic pocket angle from the final segment', () => {
		expect(m.entryAngleDeg).toBeGreaterThan(2);
		expect(m.entryAngleDeg).toBeLessThan(5);
	});

	it('speed from lane distance over clip time', () => {
		// ~60 ft in 2.5 s ≈ 16.4 mph (plus a hair for lateral travel)
		expect(m.speedMph).toBeGreaterThan(16);
		expect(m.speedMph).toBeLessThan(17);
	});

	it('entry lands flush in the pocket', () => {
		expect(Math.abs(m.pocketOffsetBoards)).toBeLessThanOrEqual(0.1);
	});
});

describe('computeMetrics (left-handed mirror)', () => {
	const m = computeMetrics(hookTrack({ hand: 'left' }), 'left')!;
	it('mirrors breakpoint to the left side and still finds the LH pocket', () => {
		expect(m.breakpointBoard).toBe(32); // 39 - 7.5 → board 32
		expect(m.entryBoard).toBe(22); // LH pocket x 21.5
		expect(Math.abs(m.pocketOffsetBoards)).toBeLessThanOrEqual(0.1);
	});
	it('wrong handedness reads the breakpoint on the wrong side', () => {
		const wrong = computeMetrics(hookTrack({ hand: 'left' }), 'right')!;
		expect(wrong.breakpointBoard).toBeGreaterThan(20); // why profile handedness matters
	});
});

describe('computeMetrics guards', () => {
	it('null for fewer than 3 points', () => {
		expect(computeMetrics(hookTrack({ hand: 'right' }).slice(0, 2))).toBeNull();
	});
	it('null when the track covers <10 ft (arm swing, not a shot)', () => {
		const short = hookTrack({ hand: 'right' }).filter((p) => p.lane[1] < 8);
		expect(computeMetrics(short)).toBeNull();
	});
	it('tolerates unsorted input', () => {
		const shuffled = [...hookTrack({ hand: 'right' })].reverse();
		expect(computeMetrics(shuffled, 'right')!.laydownBoard).toBe(19);
	});
});

describe('downsampleTrack', () => {
	const track = hookTrack({ hand: 'right', points: 600 });
	it('caps length and keeps the endpoints exactly', () => {
		const ds = downsampleTrack(track, 200);
		expect(ds.length).toBe(200);
		expect(ds[0]).toEqual(track[0]);
		expect(ds[ds.length - 1]).toEqual(track[track.length - 1]);
	});
	it('derives (nearly) the same metrics from the downsampled track', () => {
		const a = computeMetrics(track, 'right')!;
		const b = computeMetrics(downsampleTrack(track, 200), 'right')!;
		expect(b.laydownBoard).toBe(a.laydownBoard);
		expect(b.breakpointBoard).toBe(a.breakpointBoard);
		expect(Math.abs(b.speedMph - a.speedMph)).toBeLessThan(0.2);
	});
	it('returns a copy when already small enough', () => {
		const small = hookTrack({ hand: 'right', points: 50 });
		const ds = downsampleTrack(small, 200);
		expect(ds.length).toBe(50);
		expect(ds).not.toBe(small);
	});
});
