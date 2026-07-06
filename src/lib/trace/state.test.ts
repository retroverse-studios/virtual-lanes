import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true, building: false, dev: true, version: '' }));

import { Trace } from './state.svelte';
import type { Pt } from './cv/homography';

function memStorage() {
	const m = new Map<string, string>();
	return {
		getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
		setItem: (k: string, v: string) => void m.set(k, String(v)),
		removeItem: (k: string) => void m.delete(k),
		clear: () => m.clear()
	};
}

const CLIP = { name: 'shot.mp4', duration: 2.5, width: 1920, height: 1080 };
/** A believable lane quad: wide at the foul line (bottom), narrow at the pins (top). */
const GOOD_CORNERS: Pt[] = [[300, 1000], [1600, 1000], [820, 200], [1100, 200]];

beforeEach(() => {
	vi.stubGlobal('localStorage', memStorage());
});

describe('calibration flow', () => {
	it('tap 4 valid corners → homography computed → advances to scan', () => {
		const t = new Trace();
		t.loadClip(CLIP);
		t.startCalibrate();
		expect(t.step).toBe('calibrate');
		GOOD_CORNERS.forEach((c) => t.addCorner(c));
		expect(t.computeCalibration()).toBe(true);
		expect(t.H).toHaveLength(9);
		expect(t.step).toBe('scan');
		expect(t.calibError).toBe('');
	});

	it('refuses a 5th corner', () => {
		const t = new Trace();
		t.loadClip(CLIP);
		GOOD_CORNERS.forEach((c) => t.addCorner(c));
		t.addCorner([5, 5]);
		expect(t.corners).toHaveLength(4);
	});

	it('rejects mis-ordered taps with a helpful error and stays on calibrate', () => {
		const t = new Trace();
		t.loadClip(CLIP);
		t.startCalibrate();
		// pins tapped before foul (swapped pairs)
		[GOOD_CORNERS[2], GOOD_CORNERS[3], GOOD_CORNERS[0], GOOD_CORNERS[1]].forEach((c) => t.addCorner(c));
		expect(t.computeCalibration()).toBe(false);
		expect(t.calibError).toContain('order');
		expect(t.step).toBe('calibrate');
		expect(t.H).toBeNull();
	});

	it('rejects collinear taps', () => {
		const t = new Trace();
		t.loadClip(CLIP);
		t.startCalibrate();
		// left of right, foul below pins — passes order check — but all on one line
		([[100, 900], [104, 900], [100, 100], [104, 100]] as Pt[]).forEach((c) => t.addCorner(c));
		// nearly-degenerate sliver: order check passes, homography may still be exact.
		// The truly collinear case:
		t.resetCorners();
		([[100, 900], [300, 700], [500, 500], [700, 300]] as Pt[]).forEach((c) => t.addCorner(c));
		expect(t.computeCalibration()).toBe(false);
		expect(t.step).toBe('calibrate');
	});

	it('drag-to-adjust: cornerNear finds the corner, updateCorner moves it', () => {
		const t = new Trace();
		t.loadClip(CLIP);
		GOOD_CORNERS.forEach((c) => t.addCorner(c));
		expect(t.cornerNear([310, 995], 30)).toBe(0);
		expect(t.cornerNear([960, 600], 30)).toBe(-1);
		t.updateCorner(0, [280, 990]);
		expect(t.corners[0]).toEqual([280, 990]);
	});
});

describe('calibration persistence (starting guess)', () => {
	it('remembers corners and restores them for a clip with the same dimensions', () => {
		const a = new Trace();
		a.loadClip(CLIP);
		a.startCalibrate();
		GOOD_CORNERS.forEach((c) => a.addCorner(c));
		expect(a.computeCalibration()).toBe(true);

		const b = new Trace(); // "next session", same stubbed storage
		b.loadClip({ ...CLIP, name: 'shot2.mp4' });
		b.startCalibrate();
		expect(b.corners).toEqual(GOOD_CORNERS);
	});

	it('does NOT restore for a clip with different dimensions', () => {
		const a = new Trace();
		a.loadClip(CLIP);
		a.startCalibrate();
		GOOD_CORNERS.forEach((c) => a.addCorner(c));
		a.computeCalibration();

		const b = new Trace();
		b.loadClip({ ...CLIP, width: 1280, height: 720 });
		b.startCalibrate();
		expect(b.corners).toEqual([]);
	});

	it('restored corners are copies — dragging them does not mutate the saved guess', () => {
		const a = new Trace();
		a.loadClip(CLIP);
		a.startCalibrate();
		GOOD_CORNERS.forEach((c) => a.addCorner(c));
		a.computeCalibration();

		const b = new Trace();
		b.loadClip(CLIP);
		b.startCalibrate();
		b.updateCorner(0, [1, 1]);

		const c = new Trace();
		c.loadClip(CLIP);
		c.startCalibrate();
		expect(c.corners[0]).toEqual(GOOD_CORNERS[0]);
	});
});

describe('step transitions', () => {
	it('loading a new clip clears calibration and returns to load', () => {
		const t = new Trace();
		t.loadClip(CLIP);
		t.startCalibrate();
		GOOD_CORNERS.forEach((c) => t.addCorner(c));
		t.computeCalibration();
		t.loadClip({ ...CLIP, name: 'other.mp4', duration: 3 });
		expect(t.step).toBe('load');
		expect(t.corners).toEqual([]);
		expect(t.H).toBeNull();
	});

	it('recalibrate returns to calibrate and drops H but keeps corners for tweaking', () => {
		const t = new Trace();
		t.loadClip(CLIP);
		t.startCalibrate();
		GOOD_CORNERS.forEach((c) => t.addCorner(c));
		t.computeCalibration();
		t.recalibrate();
		expect(t.step).toBe('calibrate');
		expect(t.H).toBeNull();
		expect(t.corners).toHaveLength(4);
	});

	it('seek clamps into the clip and is a no-op without a video element', () => {
		const t = new Trace();
		t.loadClip(CLIP);
		t.seek(99); // no video bound — must not throw
		expect(t.time).toBe(0);
	});
});
