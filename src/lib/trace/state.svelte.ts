// Trace mode: film a shot → calibrate the lane → scan for the ball → results.
// Session-only state (nothing persists until a TraceRecord is saved in a later phase).
import type { Pt } from './cv/homography';
import type { TraceMetrics, TracePoint } from './cv/metrics';

export type TraceStep = 'load' | 'calibrate' | 'scan' | 'results';

export interface ClipMeta {
	name: string;
	duration: number; // seconds
	width: number; // native video px
	height: number;
}

class Trace {
	step = $state<TraceStep>('load');
	clip = $state<ClipMeta | null>(null);
	time = $state(0); // current scrub position (s)

	// calibration (set in the calibrate step)
	corners = $state<Pt[]>([]); // tapped image px, order: foul-L, foul-R, pins-L, pins-R
	H = $state<number[] | null>(null); // image → lane homography

	// scan output (set in the scan step)
	track = $state<TracePoint[]>([]);
	metrics = $state<TraceMetrics | null>(null);

	/** The <video> behind the preview canvas; owned by ClipLoader, read by later steps. */
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
		this.track = [];
		this.metrics = null;
		this.step = 'load';
	}

	reset() {
		this.clip = null;
		this.video = null;
		this.time = 0;
		this.corners = [];
		this.H = null;
		this.track = [];
		this.metrics = null;
		this.step = 'load';
	}
}

export const t = new Trace();
