import { describe, it, expect } from 'vitest';
import {
	ALLPINS,
	BALL_BIAS,
	clamp,
	cumulative,
	breakdownRate,
	derive,
	eff,
	frictionAt,
	glyphs,
	handicap,
	initialFriction,
	isSplit,
	lastTotal,
	recommendBall,
	simBowlerGame,
	tenthComplete,
	type HandicapCfg
} from './bowling';
import { ROSTER, STYLE_PRESETS, TIERS } from './personas';
import type { Attr, Ball, Bowler, Frame, Lane, LaneCondition } from './types';

/* ----------------------------- scoring ----------------------------- */

describe('cumulative / lastTotal (validated against the canonical Python reference)', () => {
	it('scores a perfect game as 300', () => {
		const game: Frame[] = Array.from({ length: 9 }, () => [10]).concat([[10, 10, 10]]);
		expect(lastTotal(game)).toBe(300);
		expect(cumulative(game).at(-1)).toBe(300);
	});

	it('scores an all-open 9-and-gutter game as 90', () => {
		const game: Frame[] = Array.from({ length: 9 }, () => [8, 1]).concat([[8, 1]]);
		expect(lastTotal(game)).toBe(90);
	});

	// Canonical example + expected total lifted from reference/tests/test_scoring.py
	it('scores the reference "normal game" as 156', () => {
		const game: Frame[] = [
			[6, 3],
			[7, 2],
			[3, 7],
			[10],
			[8, 0],
			[2, 8],
			[1, 9],
			[10],
			[10],
			[6, 4, 5]
		];
		expect(lastTotal(game)).toBe(156);
	});

	it('counts strikes, spares and the running total frame by frame', () => {
		const game: Frame[] = [[10], [9, 1], [10], [9, 1], [10], [9, 1], [10], [9, 1], [10], [9, 1, 10]];
		const cum = cumulative(game);
		// every frame is 20 (strike/spare chains): 10 frames × 20 = 200
		expect(cum[0]).toBe(20); // strike + (9+1)
		expect(cum[1]).toBe(40); // spare + next strike
		expect(cum.every((v, i) => i === 9 || v === (i + 1) * 20)).toBe(true);
		expect(lastTotal(game)).toBe(200);
	});

	it('leaves later frames null when an early strike cannot yet resolve', () => {
		// lone strike, nothing after it → frame 0 can't resolve → no running total at all
		const game: Frame[] = [[10]];
		expect(cumulative(game).every((v) => v === null)).toBe(true);
		expect(lastTotal(game)).toBe(0);
	});

	it('resolves a partial game up to the last completable frame', () => {
		// 5 frames, ending on an open frame so everything resolves.
		const game: Frame[] = [
			[6, 3],
			[7, 2],
			[3, 7],
			[10],
			[8, 0]
		];
		const cum = cumulative(game);
		expect(cum.slice(5)).toEqual([null, null, null, null, null]);
		expect(lastTotal(game)).toBe(64); // 9+9+20+18+8
	});

	it('scores nine strikes then an open 10th as 266', () => {
		// F0–F6 = 30 (7×30=210); F7 strike = 10+10+8 = 28; F8 strike = 10+8+1 = 19; F9 open [8,1] = 9 → 266
		const game: Frame[] = Array.from({ length: 9 }, () => [10]).concat([[8, 1]]);
		expect(lastTotal(game)).toBe(266);
	});

	it('returns an empty total for an empty game', () => {
		expect(lastTotal([])).toBe(0);
		expect(cumulative([])).toEqual(Array(10).fill(null));
	});
});

describe('tenthComplete', () => {
	it.each([
		['undefined', undefined, false],
		['empty', [], false],
		['single strike', [10], false],
		['strike + one bonus', [10, 10], false],
		['strike + two bonus', [10, 10, 10], true],
		['single ball', [9], false],
		['spare missing bonus', [9, 1], false],
		['spare + bonus', [9, 1, 9], true],
		['open complete', [8, 1], true],
		['open missing ball', [8], false]
	])('%s → %s', (_label, frame, expected) => {
		expect(tenthComplete(frame)).toBe(expected);
	});
});

describe('glyphs', () => {
	it('renders a strike', () => {
		expect(glyphs([10], false)).toEqual(['X']);
	});
	it('renders a spare on the second ball', () => {
		expect(glyphs([3, 7], false)).toEqual(['3', '/']);
	});
	it('renders a gutter', () => {
		expect(glyphs([8, 0], false)).toEqual(['8', '-']);
	});
	it('tenth-frame strikes do not get a phantom spare on the bonus ball', () => {
		// X then 7 then spare of (7,3): ball 3 is '/', ball 2 is just '7' (fresh rack)
		expect(glyphs([10, 7, 3], true)).toEqual(['X', '7', '/']);
		expect(glyphs([10, 10, 10], true)).toEqual(['X', 'X', 'X']);
		expect(glyphs([9, 1, 9], true)).toEqual(['9', '/', '9']);
	});
});

/* ----------------------------- pins / splits ----------------------------- */

describe('isSplit', () => {
	it('is never a split when the head pin is standing', () => {
		expect(isSplit([1, 2, 3])).toBe(false);
		expect(isSplit([1])).toBe(false);
	});
	it('flags the 7-10 (and other isolated-pin) leaves', () => {
		expect(isSplit([7, 10])).toBe(true);
		expect(isSplit([5, 7, 10])).toBe(true); // three isolated pins
	});
	it('does not flag a contiguous leave (a row)', () => {
		expect(isSplit([4, 5, 6])).toBe(false);
		expect(isSplit([7, 8])).toBe(false);
	});
	it('ignores single-pin leaves', () => {
		expect(isSplit([7])).toBe(false);
	});
});

/* ----------------------------- handicap ----------------------------- */

describe('handicap', () => {
	const scratch: HandicapCfg = { mode: 'scratch' };
	const perBowler: HandicapCfg = { mode: 'perBowler' };
	const pct: HandicapCfg = { mode: 'percent', pct: 90, basis: 220 };

	it('scratch is always zero', () => {
		expect(handicap({ handicap: 50, avg: 150 }, scratch)).toBe(0);
	});
	it('perBowler uses the bowler number', () => {
		expect(handicap({ handicap: 50, avg: 150 }, perBowler)).toBe(50);
		expect(handicap({ handicap: 0 }, perBowler)).toBe(0);
	});
	it('percent rounds (basis - avg) * pct', () => {
		expect(handicap({ avg: 150 }, pct)).toBe(63); // round(0.9 * 70)
		expect(handicap({ avg: 220 }, pct)).toBe(0); // scratch-level bowler → 0
		expect(handicap({ avg: 240 }, pct)).toBe(0); // never negative
	});
});

/* ----------------------------- simulation invariants ----------------------------- */

const ALL_BOWLERS: Bowler[] = ROSTER;

/** Assert a single frame is legal (balls in range, no over-counting a rack). */
function assertLegalFrame(frame: Frame, isTenth: boolean) {
	expect(frame.length).toBeGreaterThan(0);
	for (const b of frame) expect(b).toBeGreaterThanOrEqual(0), expect(b).toBeLessThanOrEqual(10);
	if (isTenth) {
		const [a, b, c] = frame;
		// ball 1
		if (a < 10) {
			// ball 2 is on the remaining pins
			expect(b).toBeLessThanOrEqual(10 - a);
			if (a + b === 10) {
				// spare → bonus ball, fresh rack, optional
				expect(frame.length).toBe(3);
				expect(c).toBeLessThanOrEqual(10);
			} else {
				expect(frame.length).toBe(2); // open 10th, no bonus
			}
		} else {
			// strike → bonus ball(s) on a fresh rack
			expect(frame.length).toBeGreaterThanOrEqual(2);
			if (b === 10) {
				expect(frame.length).toBe(3);
				expect(c).toBeLessThanOrEqual(10); // third ball fresh rack
			} else {
				expect(frame.length).toBe(3);
				expect(c).toBeLessThanOrEqual(10 - b); // third ball cleans up ball 2's rack
			}
		}
	} else {
		if (frame[0] === 10) expect(frame.length).toBe(1); // strike = single ball
		else {
			expect(frame.length).toBe(2);
			expect(frame[1]).toBeLessThanOrEqual(10 - frame[0]);
		}
	}
}

describe('simBowlerGame invariants (run over the whole roster × conditions)', () => {
	const lanes: { name: string; lane: Lane }[] = [
		{ name: 'house', lane: { initialFriction: 0.46, rate: 0, sport: false, allowBallChange: false } },
		{ name: 'sport', lane: { initialFriction: 0.34, rate: 0.01, sport: true, allowBallChange: true } },
		{ name: 'burning', lane: { initialFriction: 0.7, rate: 0.03, sport: false, allowBallChange: true } }
	];

	for (const bowler of ALL_BOWLERS) {
		for (const { name, lane } of lanes) {
			it(`${bowler.name} on ${name}: 10 legal frames, score 0–300`, () => {
				const startBall: Ball = recommendBall(clamp((bowler.attr.rev - 150) / 400, 0, 1), lane.initialFriction);
				// average over a few rolls to smooth RNG
				for (let i = 0; i < 25; i++) {
					const { frames, switchFrame } = simBowlerGame(bowler, lane, startBall);
					expect(frames.length).toBe(10);
					frames.forEach((f, idx) => assertLegalFrame(f, idx === 9));
					const total = lastTotal(frames);
					expect(total).toBeGreaterThanOrEqual(0);
					expect(total).toBeLessThanOrEqual(300);
					if (switchFrame !== null) {
						expect(switchFrame).toBeGreaterThanOrEqual(0);
						expect(switchFrame).toBeLessThan(10);
					}
				}
			});
		}
	}
});

describe('simulation realism (wild-shot distribution)', () => {
	const house: Lane = { initialFriction: 0.46, rate: 0, sport: false, allowBallChange: false };
	const ball: Ball = { name: 'x', cover: 'solid', core: 'symmetric' };
	const firstBalls = (bowler: Bowler, games: number) => {
		const out: number[] = [];
		for (let k = 0; k < games; k++) for (const f of simBowlerGame(bowler, house, ball).frames) out.push(f[0]);
		return out;
	};

	it('a high-variance bowler occasionally throws a sub-5 first ball (gutter / light hit)', () => {
		const cranker = ROSTER.find((b) => b.id === 'reyes')!; // high variance
		const lows = firstBalls(cranker, 400).filter((n) => n < 5).length;
		expect(lows).toBeGreaterThan(0);
	});

	it('a consistent bowler rarely throws sub-5 (wild shots scale with variance)', () => {
		const straight = ROSTER.find((b) => b.id === 'buddy')!; // straight / low variance
		// over many frames the consistent bowler throws far fewer wild shots than the cranker
		const straightLows = firstBalls(straight, 400).filter((n) => n < 5).length;
		const crankerLows = firstBalls(ROSTER.find((b) => b.id === 'reyes')!, 400).filter((n) => n < 5).length;
		expect(straightLows).toBeLessThan(crankerLows);
	});
});

/* ----------------------------- attributes → sim params ----------------------------- */

describe('derive / eff (ranges & monotonicity)', () => {
	it('strike probability rises with rev rate (same accuracy/consistency)', () => {
		const low = derive({ rev: 150, speed: 16, acc: 0.85, cons: 0.8 }, 1);
		const high = derive({ rev: 550, speed: 18.5, acc: 0.85, cons: 0.8 }, 1);
		const eLow = eff(low, low.idealFriction, false);
		const eHigh = eff(high, high.idealFriction, false);
		expect(eHigh.strike).toBeGreaterThan(eLow.strike);
	});

	it('clamp bounds the strike/spare outputs', () => {
		for (const tierMult of [0.52, 0.8, 1, 1.12]) {
			for (const sport of [false, true]) {
				for (const friction of [0.1, 0.34, 0.46, 0.7, 0.95]) {
					const p = derive({ rev: 200, speed: 16, acc: 0.5, cons: 0.5 }, tierMult);
					const e = eff(p, friction, sport, 0);
					expect(e.strike).toBeGreaterThanOrEqual(0.02);
					expect(e.strike).toBeLessThanOrEqual(0.92);
					expect(e.spare).toBeGreaterThanOrEqual(0.3);
					expect(e.spare).toBeLessThanOrEqual(0.99);
					expect(e.variance).toBeGreaterThan(0);
				}
			}
		}
	});

	it('covers every coverstock bias without throwing', () => {
		const p = derive({ rev: 380, speed: 17, acc: 0.8, cons: 0.75 }, 1);
		for (const bias of Object.values(BALL_BIAS)) {
			const e = eff(p, 0.46, false, bias);
			expect(e.strike).toBeGreaterThanOrEqual(0);
		}
	});
});

/* ----------------------------- lane physics ----------------------------- */

describe('initialFriction / frictionAt / breakdownRate', () => {
	const base: LaneCondition = { alley: 'x', length: 'medium', volume: 'medium', surface: 'synthetic', patternType: 'house' };
	it('house medium synthetic starts at 0.46; wood adds friction', () => {
		expect(initialFriction(base)).toBeCloseTo(0.46, 5);
		expect(initialFriction({ ...base, surface: 'wood' })).toBeCloseTo(0.51, 5);
	});
	it('heavy/long lowers friction; light raises it', () => {
		expect(initialFriction({ ...base, volume: 'heavy' })).toBeLessThan(0.46);
		expect(initialFriction({ ...base, volume: 'light' })).toBeGreaterThan(0.46);
	});
	it('frictionAt clamps to [0.05, 0.98] and rises with rate', () => {
		const lane: Lane = { initialFriction: 0.9, rate: 0.2, sport: false, allowBallChange: false };
		expect(frictionAt(lane, 10)).toBeCloseTo(0.98, 5);
		const cold: Lane = { initialFriction: 0.1, rate: -0.2, sport: false, allowBallChange: false };
		expect(frictionAt(cold, 10)).toBeCloseTo(0.05, 5);
	});
	it('breakdown is zero when disabled or ignored, positive otherwise', () => {
		const ball: Ball = { name: 'x', cover: 'solid', core: 'symmetric' };
		const onLane = [{ attr: STYLE_PRESETS.tweener, ball }];
		expect(breakdownRate(onLane, { breakdown: false, laneMode: 'bySelection', manualCount: 4 })).toBe(0);
		expect(breakdownRate(onLane, { breakdown: true, laneMode: 'ignore', manualCount: 4 })).toBe(0);
		const r = breakdownRate(onLane, { breakdown: true, laneMode: 'bySelection', manualCount: 4 });
		expect(r).toBeGreaterThan(0);
		// more traffic → faster breakdown
		const rMore = breakdownRate(onLane, { breakdown: true, laneMode: 'manual', manualCount: 8 });
		expect(rMore).toBeGreaterThan(r);
	});
});

/* ----------------------------- ball recommender ----------------------------- */

describe('recommendBall', () => {
	it('always hands a plastic ball for spares', () => {
		expect(recommendBall(0.8, 0.3, true).cover).toBe('plastic');
		expect(recommendBall(0.2, 0.7, true).cover).toBe('plastic');
	});
	it('reads heavy oil with a solid cover', () => {
		expect(recommendBall(0.7, 0.3).cover).toBe('solid');
		expect(recommendBall(0.3, 0.3).cover).toBe('solid');
	});
	it('controls the burn with urethane/pearl on dry lanes', () => {
		expect(recommendBall(0.7, 0.7).cover).toBe('urethane');
		expect(recommendBall(0.3, 0.7).cover).toBe('pearl');
	});
	it('picks pearl for a power player on medium', () => {
		expect(recommendBall(0.7, 0.5).cover).toBe('pearl');
		expect(recommendBall(0.7, 0.5).core).toBe('asymmetric');
	});
});

/* ----------------------------- roster sanity ----------------------------- */

describe('roster / personas', () => {
	it('every built-in bowler has a valid tier, style and attributes', () => {
		for (const b of ROSTER) {
			expect(TIERS[b.tier]).toBeDefined();
			expect(b.attr.rev).toBeGreaterThanOrEqual(150);
			expect(b.attr.rev).toBeLessThanOrEqual(600);
			expect(b.attr.acc).toBeGreaterThan(0);
			expect(b.attr.acc).toBeLessThanOrEqual(1);
		}
	});
	it('elite tiers bowl a higher projected house average than rookies (same body)', () => {
		const body: Attr = { rev: 380, speed: 17, acc: 0.8, cons: 0.75 };
		expect(
			averageOverRuns(() => simAvg(body, 'elite'), 60)
		).toBeGreaterThan(averageOverRuns(() => simAvg(body, 'rookie'), 60));
	});
});

// helpers used above
function simAvg(attr: Attr, tier: keyof typeof TIERS): number {
	const lane: Lane = { initialFriction: 0.46, rate: 0, sport: false, allowBallChange: false };
	const ball = recommendBall(clamp((attr.rev - 150) / 400, 0, 1), 0.46);
	const bowler: Bowler = { id: 't', name: 't', styleKey: 'custom', tier, division: 'open', handicap: 0, attr };
	return lastTotal(simBowlerGame(bowler, lane, ball).frames);
}
function averageOverRuns(fn: () => number, n: number): number {
	let s = 0;
	for (let i = 0; i < n; i++) s += fn();
	return s / n;
}
