// Trace mode: film a shot → calibrate the lane → scan for the ball → results.
// Session-only except the last calibration, which is remembered as a starting
// guess (a propped phone barely moves between shots at the same centre).
import { readJSON, writeJSON } from '$lib/stores/local.svelte';
import { isPlausibleLaneHomography, isValidCornerOrder, laneHomography, type Pt } from './cv/homography';
import type { TraceMetrics, TracePoint } from './cv/metrics';

export type TraceStep = 'load' | 'calibrate' | 'scan' | 'results';

export interface ClipMeta {
	name: string;
	duration: number; // seconds
	width: number; // native video px
	height: number;
}

const CALIB_KEY = 'vl.trace.calib.v1';

/** Corner tap order, everywhere: foul-L, foul-R, pins-L, pins-R. */
export const CORNER_TAGS = ['FL', 'FR', 'PL', 'PR'] as const;
export const CORNER_LABELS = [
	'foul line — LEFT corner',
	'foul line — RIGHT corner',
	'pin deck — LEFT corner',
	'pin deck — RIGHT corner'
] as const;

export class Trace {
	step = $state<TraceStep>('load');
	clip = $state<ClipMeta | null>(null);
	time = $state(0); // current scrub position (s)
	/** Bumped every time the video lands on a new frame — canvases redraw off this. */
	frameTick = $state(0);

	// calibration
	corners = $state<Pt[]>([]); // tapped image px, in CORNER_TAGS order
	H = $state<number[] | null>(null); // image → lane homography
	calibError = $state('');

	// scan output (phases 3-4)
	track = $state<TracePoint[]>([]);
	metrics = $state<TraceMetrics | null>(null);

	/** The <video> decoder element; owned by the page, used by every step. */
	video: HTMLVideoElement | null = null;

	get hasClip(): boolean {
		return !!this.clip;
	}

	/** A new clip resets everything downstream of it. */
	loadClip(meta: ClipMeta) {
		this.clip = meta;
		this.time = 0;
		this.corners = [];
		this.H = null;
		this.calibError = '';
		this.track = [];
		this.metrics = null;
		this.step = 'load';
	}

	seek(time: number) {
		if (!this.video || !this.clip) return;
		this.time = Math.min(Math.max(0, time), this.clip.duration);
		this.video.currentTime = this.time;
	}
	/** Called from the page's <video onseeked>. */
	frameSeeked() {
		this.frameTick++;
	}

	/* ---------- calibration ---------- */
	startCalibrate() {
		if (!this.clip) return;
		this.calibError = '';
		// restore the last calibration as a starting guess when the camera setup matches
		if (!this.corners.length) {
			const saved = readJSON<{ w: number; h: number; corners: Pt[] }>(CALIB_KEY);
			if (saved && saved.w === this.clip.width && saved.h === this.clip.height && Array.isArray(saved.corners) && saved.corners.length === 4)
				this.corners = saved.corners.map((c) => [...c] as Pt);
		}
		this.step = 'calibrate';
	}

	addCorner(p: Pt) {
		if (this.corners.length >= 4) return;
		this.corners.push(p);
		this.calibError = '';
	}
	updateCorner(i: number, p: Pt) {
		if (i < 0 || i >= this.corners.length) return;
		this.corners[i] = p;
		this.calibError = '';
	}
	resetCorners() {
		this.corners = [];
		this.H = null;
		this.calibError = '';
	}
	/** Index of the corner within `r` px of `p`, else -1 (for drag-to-adjust). */
	cornerNear(p: Pt, r: number): number {
		let best = -1;
		let bd = r;
		this.corners.forEach((c, i) => {
			const d = Math.hypot(c[0] - p[0], c[1] - p[1]);
			if (d <= bd) {
				bd = d;
				best = i;
			}
		});
		return best;
	}

	/** Compute + validate the homography; on success remember it and advance to scan. */
	computeCalibration(): boolean {
		if (this.corners.length !== 4 || !this.clip) return false;
		if (!isValidCornerOrder(this.corners)) {
			this.calibError = 'Those corners are out of order — tap foul-left, foul-right, then pin-left, pin-right (film from behind the foul line).';
			return false;
		}
		const H = laneHomography(this.corners);
		if (!isPlausibleLaneHomography(H, this.corners)) {
			this.calibError = 'Those corners don’t map to a lane — re-tap them (they can’t sit on one line).';
			return false;
		}
		this.H = H;
		writeJSON(CALIB_KEY, { w: this.clip.width, h: this.clip.height, corners: this.corners.map((c) => [...c]) });
		this.step = 'scan';
		return true;
	}

	recalibrate() {
		this.H = null;
		this.calibError = '';
		this.step = 'calibrate';
	}
	backToLoad() {
		this.step = 'load';
	}

	reset() {
		this.clip = null;
		this.video = null;
		this.time = 0;
		this.corners = [];
		this.H = null;
		this.calibError = '';
		this.track = [];
		this.metrics = null;
		this.step = 'load';
	}
}

export const t = new Trace();
