// VirtualLanes simulation + scoring engine (typed port of the validated prototype).
// Causal model: rev rate + ball speed + accuracy + consistency drive everything.

import type { Attr, Ball, Bowler, Cover, Frame, Lane, LaneCondition, SimParams, TierKey } from './types';
import { TIERS } from './personas';

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const rnd = () => Math.random();
const irange = (n: number) => Math.floor(Math.random() * Math.max(1, n));

/* ---------- attributes → simulation parameters ---------- */
export function derive(attr: Attr, tierMult: number): SimParams {
	const rev01 = clamp((attr.rev - 150) / 400, 0, 1);
	const optSpeed = 15 + 5 * rev01;
	const speedPen = clamp(0.05 * Math.pow(attr.speed - optSpeed, 2), 0, 0.35);
	return {
		tierMult,
		rev01,
		acc: attr.acc,
		cons: attr.cons,
		baseStrike: clamp((0.15 + 0.58 * rev01) * (1 - speedPen), 0.05, 0.85),
		baseSpare: clamp(0.5 + 0.45 * attr.acc, 0.3, 0.99),
		variance: clamp((1.25 - attr.cons) * (0.55 + 0.8 * rev01), 0.2, 1.6),
		aggression: 0.1 + 0.95 * rev01,
		idealFriction: 0.62 - 0.22 * rev01,
		frictionSens: 0.4 + 1.25 * rev01
	};
}

/** ball coverstock shifts friction comfort: urethane/plastic add control on the dry */
export const BALL_BIAS: Record<Cover, number> = { solid: -0.02, hybrid: 0.03, pearl: 0, urethane: 0.12, plastic: 0.2 };

export interface Effective {
	strike: number;
	spare: number;
	variance: number;
}
export function eff(p: SimParams, friction: number, sport: boolean, ballBias = 0): Effective {
	const ideal = p.idealFriction + ballBias;
	const sens = p.frictionSens * (sport ? 1.6 : 1);
	const d = friction - ideal;
	const sm = clamp(1 - sens * d * d, 0.35, 1.2);
	let strike = p.baseStrike * p.tierMult * sm;
	let spare = p.baseSpare * (0.6 + 0.4 * p.tierMult);
	if (sport) {
		strike *= 1 - 0.7 * (1 - p.cons); // sport = no miss room; punishes low acc/cons
		spare *= 0.72 + 0.28 * p.acc;
	}
	return {
		strike: clamp(strike, 0.02, 0.92),
		spare: clamp(spare, 0.3, 0.99),
		variance: p.variance * (1 + 1.6 * Math.abs(d)) * (sport ? 1.25 : 1)
	};
}

/* ---------- lane condition + oil breakdown ---------- */
const VOL_FRICTION = { light: 0.6, medium: 0.46, heavy: 0.32 } as const;
const LEN_ADJ = { short: 0.1, medium: 0, long: -0.06 } as const;
export const initialFriction = (c: LaneCondition) =>
	clamp(VOL_FRICTION[c.volume] + LEN_ADJ[c.length] + (c.surface === 'wood' ? 0.05 : 0), 0.1, 0.85);

const COVER_OILMOVE: Record<Cover, number> = { plastic: 0.4, urethane: 0.7, solid: 1.1, hybrid: 1.15, pearl: 1.2 };

export function breakdownRate(
	onLane: { attr: Attr; ball: Ball }[],
	cfg: { breakdown: boolean; laneMode: 'ignore' | 'bySelection' | 'manual'; manualCount: number }
): number {
	if (!cfg.breakdown || cfg.laneMode === 'ignore') return 0;
	const occ = cfg.laneMode === 'manual' ? cfg.manualCount : onLane.length;
	const avgAgg = onLane.reduce((s, b) => s + (0.1 + 0.95 * clamp((b.attr.rev - 150) / 400, 0, 1)), 0) / onLane.length;
	const avgCov = onLane.reduce((s, b) => s + COVER_OILMOVE[b.ball.cover], 0) / onLane.length;
	return 0.02 * (occ / 4) * (0.4 + avgAgg) * avgCov;
}

export const frictionAt = (lane: Lane, f: number) => clamp(lane.initialFriction + lane.rate * f, 0.05, 0.98);

/* ---------- ball recommender (generic, no brands) ---------- */
export function recommendBall(rev01: number, friction: number, forSpare = false): Ball {
	if (forSpare) return { name: 'Plastic spare ball', cover: 'plastic', core: 'symmetric', why: 'goes straight at corner pins' };
	const power = rev01 >= 0.55;
	if (friction <= 0.4)
		return power
			? { name: 'Solid reactive · asymmetric', cover: 'solid', core: 'asymmetric', why: 'reads heavy oil early, strong continuation' }
			: { name: 'Solid reactive · symmetric', cover: 'solid', core: 'symmetric', why: 'gets through the oil with control' };
	if (friction >= 0.62)
		return power
			? { name: 'Urethane · symmetric', cover: 'urethane', core: 'symmetric', why: 'controls the burn, smooths over/under' }
			: { name: 'Pearl reactive · symmetric', cover: 'pearl', core: 'symmetric', why: 'length + gentle backend on the dry' };
	return power
		? { name: 'Pearl reactive · asymmetric', cover: 'pearl', core: 'asymmetric', why: 'length then sharp backend on medium' }
		: { name: 'Pearl reactive · symmetric', cover: 'pearl', core: 'symmetric', why: 'clean and predictable on medium' };
}

/* ---------- opponent simulation (frame by frame; uses transition + ball change) ---------- */
// A ball rolled at a full rack of 10. Less consistent bowlers (high variance) occasionally
// throw a wild shot — a gutter or light hit (0–5) — rather than the usual pocket-area leave.
function fullBall(p: Effective): number {
	if (rnd() < p.strike) return 10;
	if (rnd() < clamp(p.variance * 0.14, 0.03, 0.2)) return irange(6); // wild: 0–5
	return 6 + irange(4); // pocket-area leave: 6–9
}
function simReg(p: Effective): Frame {
	const first = fullBall(p);
	if (first === 10) return [10];
	const rem = 10 - first;
	// a messy leave (split / washout) converts far less often; more likely with high variance.
	const messy = rnd() < 0.12 * p.variance;
	const so = messy ? p.spare * 0.25 : p.spare;
	return [first, Math.min(rnd() < so ? rem : irange(rem + 1), rem)];
}
function simTen(p: Effective): Frame {
	const r: number[] = [];
	const full = () => fullBall(p);
	const at = (standing: number) => (rnd() < p.spare ? standing : irange(standing + 1));

	r.push(full()); // ball 1
	const earned = r[0] === 10; // a first-ball strike earns two bonus balls
	// ball 2: fresh rack after a strike, otherwise the spare attempt at ball 1's remainder
	r.push(earned ? full() : at(10 - r[0]));
	// ball 3: only when earned. After a strike it resets (ball 2 also a strike) or continues
	// ball 2's rack; after a (ball 1) spare it is a fresh bonus rack.
	if (earned && r[1] === 10) r.push(full());
	else if (earned) r.push(at(10 - r[1]));
	else if (r[0] + r[1] === 10) r.push(full());
	return r;
}

export interface SimResult {
	frames: Frame[];
	switchFrame: number | null; // frame index where they changed ball, or null
}

export function simBowlerGame(b: Bowler, lane: Lane, startBall: Ball): SimResult {
	const p = derive(b.attr, TIERS[b.tier].mult);
	let ball = startBall;
	let switched: number | null = null;
	const frames: Frame[] = [];
	for (let i = 0; i < 10; i++) {
		const fr = frictionAt(lane, i);
		if (lane.allowBallChange && switched === null && p.rev01 > 0.5 && fr > p.idealFriction + 0.2 && ball.cover !== 'urethane' && ball.cover !== 'plastic') {
			ball = { name: 'Urethane (ball down)', cover: 'urethane', core: 'symmetric', why: 'controls the burn' };
			switched = i;
		}
		const e = eff(p, fr, lane.sport, BALL_BIAS[ball.cover]);
		frames.push(i < 9 ? simReg(e) : simTen(e));
	}
	return { frames, switchFrame: switched };
}

/** Quick projected house average for a set of attributes (for the rival-creator preview). */
export function projectAverage(attr: Attr, tier: TierKey, n = 120): number {
	const lane: Lane = { initialFriction: 0.46, rate: 0, sport: false, allowBallChange: false };
	const ball = recommendBall(clamp((attr.rev - 150) / 400, 0, 1), 0.46);
	const b: Bowler = { id: 'preview', name: 'preview', styleKey: 'custom', tier, division: 'open', handicap: 0, attr };
	let sum = 0;
	for (let k = 0; k < n; k++) sum += lastTotal(simBowlerGame(b, lane, ball).frames);
	return Math.round(sum / n);
}

/* ---------- traditional scoring ---------- */
function rollsFrom(frames: Frame[], idx: number): number[] {
	const o: number[] = [];
	for (let i = idx; i < frames.length; i++) for (const r of frames[i] ?? []) o.push(r);
	return o;
}
export function tenthComplete(f: Frame | undefined): boolean {
	if (!f || !f.length) return false;
	if (f[0] === 10) return f.length === 3;
	if (f.length >= 2 && f[0] + f[1] === 10) return f.length === 3;
	return f.length === 2;
}
export function cumulative(frames: Frame[]): (number | null)[] {
	const res: (number | null)[] = Array(10).fill(null);
	let tot = 0;
	for (let i = 0; i < 10; i++) {
		const f = frames[i];
		if (!f || !f.length) break;
		let fs: number;
		if (i < 9) {
			if (f[0] === 10) {
				const b = rollsFrom(frames, i + 1);
				if (b.length < 2) break;
				fs = 10 + b[0] + b[1];
			} else if (f.length >= 2) {
				if (f[0] + f[1] === 10) {
					const b = rollsFrom(frames, i + 1);
					if (b.length < 1) break;
					fs = 10 + b[0];
				} else fs = f[0] + f[1];
			} else break;
		} else {
			if (!tenthComplete(f)) break;
			fs = f.reduce((a, b) => a + b, 0);
		}
		tot += fs;
		res[i] = tot;
	}
	return res;
}
export function lastTotal(frames: Frame[]): number {
	const c = cumulative(frames);
	for (let i = 9; i >= 0; i--) if (c[i] != null) return c[i] as number;
	return 0;
}
export function glyphs(f: Frame | undefined, isTenth: boolean): string[] {
	if (!f) return [];
	const g: string[] = [];
	for (let i = 0; i < f.length; i++) {
		const r = f[i];
		if (isTenth) {
			if (i === 0) {
				g.push(r === 10 ? 'X' : r === 0 ? '-' : String(r));
			} else if (i === 1) {
				// ball 2: spare if ball 1 wasn't a strike and they sum to 10; else a plain count
				if (r === 10) g.push('X');
				else if (f[0] !== 10 && f[0] + r === 10) g.push('/');
				else g.push(r === 0 ? '-' : String(r));
			} else {
				// ball 3 (bonus): a spare only when ball 1 was a strike and ball 2 left an open count
				// that ball 3 then converts — a fresh bonus ball (after strike+strike, or a spare) is never '/'
				if (r === 10) g.push('X');
				else if (f[0] === 10 && f[1] !== 10 && f[1] + r === 10) g.push('/');
				else g.push(r === 0 ? '-' : String(r));
			}
		} else {
			if (i === 0) g.push(r === 10 ? 'X' : r === 0 ? '-' : String(r));
			else g.push(f[0] + r === 10 ? '/' : r === 0 ? '-' : String(r));
		}
	}
	return g;
}

/* ---------- pins / split detection ---------- */
export const ALLPINS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const PIN_ROWS = [
	[7, 8, 9, 10],
	[4, 5, 6],
	[2, 3],
	[1]
];
const PIN_ADJ: Record<number, number[]> = {
	1: [2, 3], 2: [1, 3, 4, 5], 3: [1, 2, 5, 6], 4: [2, 5, 7, 8], 5: [2, 3, 4, 6, 8, 9],
	6: [3, 5, 9, 10], 7: [4, 8], 8: [4, 5, 7, 9], 9: [5, 6, 8, 10], 10: [6, 9]
};
export function isSplit(standing: number[]): boolean {
	if (standing.includes(1) || standing.length < 2) return false;
	const set = new Set(standing);
	const seen = new Set<number>();
	let comps = 0;
	for (const p of standing) {
		if (seen.has(p)) continue;
		comps++;
		const st = [p];
		while (st.length) {
			const c = st.pop() as number;
			if (seen.has(c)) continue;
			seen.add(c);
			for (const n of PIN_ADJ[c]) if (set.has(n) && !seen.has(n)) st.push(n);
		}
	}
	return comps > 1;
}
export const leaveLabel = (s: number[]) => (s.length ? s.slice().sort((a, b) => a - b).join('-') : '');

/* ---------- handicap (scoring overlay, decoupled from sim) ---------- */
export type HandicapCfg =
	| { mode: 'scratch' }
	| { mode: 'perBowler' }
	| { mode: 'percent'; pct: number; basis: number };
export function handicap(b: { handicap?: number; avg?: number }, cfg: HandicapCfg): number {
	if (cfg.mode === 'perBowler') return Math.max(0, b.handicap ?? 0);
	if (cfg.mode === 'percent') return Math.max(0, Math.round((cfg.pct / 100) * (cfg.basis - (b.avg ?? 150))));
	return 0;
}
