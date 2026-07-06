// Trace mode: film a shot → calibrate the lane → scan for the ball → results.
// Session-only except the last calibration, which is remembered as a starting
// guess (a propped phone barely moves between shots at the same centre).
import { readJSON, writeJSON } from '$lib/stores/local.svelte';
import { applyHomography, isPlausibleLaneHomography, isValidCornerOrder, laneHomography, type Pt } from './cv/homography';
import { diffMask, grayscale, largestBlob } from './cv/blob';
import { applyLaneMask, buildTrack, quadMask, type RawHit } from './cv/scan';
import { computeMetrics, type Handedness, type TraceMetrics, type TracePoint } from './cv/metrics';

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

	/* ---------- ball scan ---------- */
	scanning = $state(false);
	scanProgress = $state(0); // 0..1
	scanError = $state('');

	/** Bowler's hand flips the breakpoint logic; read from the shared profile. */
	handedness(): Handedness {
		return readJSON<{ human?: { handedness?: Handedness } }>('vl.bowloff.setup.v1')?.human?.handedness ?? 'right';
	}

	/**
	 * Seek through the clip (~30 samples/s), frame-diff inside the calibrated lane
	 * quad, and assemble the track. Processing is ~200px wide — sub-ms per frame —
	 * so it runs inline; the seek loop itself yields to the UI between frames.
	 */
	async scan() {
		const v = this.video;
		if (!v || !this.H || !this.clip || this.scanning) return;
		this.scanning = true;
		this.scanError = '';
		this.track = [];
		this.metrics = null;
		try {
			const SW = 192;
			const SH = Math.max(2, Math.round((SW * this.clip.height) / this.clip.width));
			const work = document.createElement('canvas');
			work.width = SW;
			work.height = SH;
			const ctx = work.getContext('2d', { willReadFrequently: true })!;
			const lane = quadMask(this.corners, SW, SH, this.clip.width, this.clip.height);
			const H = this.H;
			const raw: RawHit[] = [];
			let prev: Uint8Array | null = null;
			const seekTo = (time: number) =>
				new Promise<void>((res) => {
					if (Math.abs(v.currentTime - time) < 1e-4 && v.readyState >= 2) return res();
					v.addEventListener('seeked', () => res(), { once: true });
					v.currentTime = time;
				});
			v.pause();
			const step = 1 / 30;
			for (let time = 0; time < this.clip.duration; time += step) {
				await seekTo(time);
				ctx.drawImage(v, 0, 0, SW, SH);
				const cur = grayscale(ctx.getImageData(0, 0, SW, SH).data, SW, SH);
				if (prev) {
					const mask = applyLaneMask(diffMask(cur, prev), lane);
					const blob = largestBlob(mask, SW, SH);
					if (blob && blob.size >= 3) {
						const vx = ((blob.cx + 0.5) / SW) * this.clip.width;
						const vy = ((blob.cy + 0.5) / SH) * this.clip.height;
						raw.push({ t: time, lane: applyHomography(H, [vx, vy]) });
					}
				}
				prev = cur;
				this.scanProgress = time / this.clip.duration;
			}
			this.track = buildTrack(raw);
			this.metrics = computeMetrics(this.track, this.handedness());
			if (this.track.length < 5) {
				this.scanError = 'No moving ball found on the lane — try a clearer clip, or re-check the corner taps.';
			} else {
				this.step = 'results';
			}
		} finally {
			this.scanning = false;
			this.scanProgress = 0;
		}
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
