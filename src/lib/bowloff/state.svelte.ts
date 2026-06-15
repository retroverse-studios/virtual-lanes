// Bowl-off mode: reactive state machine (Svelte 5 runes) on top of the engine.
import {
	ALLPINS,
	breakdownRate,
	clamp,
	cumulative,
	frictionAt,
	handicap,
	initialFriction,
	isSplit,
	lastTotal,
	recommendBall,
	simBowlerGame,
	type HandicapCfg
} from '$lib/engine/bowling';
import { STYLE_PRESETS, TIERS } from '$lib/engine/personas';
import { roster as rosterStore } from '$lib/roster.svelte';
import { history, History } from '$lib/history.svelte';
import type { Ball, Bowler, Frame, GameRecord, Lane, LaneCondition, Leave, StyleKey } from '$lib/engine/types';

export type Screen = 'setup' | 'play' | 'done';
export type HcpMode = 'scratch' | 'perBowler' | 'percent';

interface HumanProfile {
	name: string;
	styleKey: Exclude<StyleKey, 'custom'>;
	avg: number;
	division: 'open' | 'pba' | 'pwba';
	handicap: number;
}
interface Cfg {
	breakdown: boolean;
	laneMode: 'ignore' | 'bySelection' | 'manual';
	manualCount: number;
	hcpMode: HcpMode;
	hcpPct: number;
	hcpBasis: number;
}
interface Opp {
	bowler: Bowler;
	ball: Ball;
	game: Frame[];
	switchFrame: number | null;
}
export interface StandRow {
	name: string;
	me: boolean;
	styleKey: StyleKey;
	scratch: number;
	hcp: number;
	total: number;
	sw: number | null;
}

const SETUP_KEY = 'vl.bowloff.setup.v1';

class BowlOff {
	screen = $state<Screen>('setup');
	cond = $state<LaneCondition>({
		alley: 'Sunset Lanes',
		length: 'medium',
		volume: 'medium',
		surface: 'synthetic',
		patternType: 'house'
	});
	human = $state<HumanProfile>({ name: 'You', styleKey: 'stroker', avg: 165, division: 'open', handicap: 0 });
	selectedIds = $state<string[]>(['halv', 'reyes']);
	cfg = $state<Cfg>({ breakdown: true, laneMode: 'bySelection', manualCount: 4, hcpMode: 'scratch', hcpPct: 90, hcpBasis: 220 });

	// play state
	lane = $state<Lane | null>(null);
	opponents = $state<Opp[]>([]);
	humanFrames = $state<Frame[]>([[]]);
	curStanding = $state<number[]>([...ALLPINS]);
	leaves = $state<Leave[]>([]);
	revealed = $state(0);
	deckKnocked = $state<number[]>([]);
	#pendingLeave: { frame: number; standing: number[] } | null = null;

	/** Selectable rivals = visible built-ins + custom (from the roster store). */
	get roster() {
		return rosterStore.available;
	}

	constructor() {
		this.#loadSetup();
	}
	#loadSetup() {
		if (typeof localStorage === 'undefined') return;
		try {
			const s = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null');
			if (!s) return;
			if (s.cond) this.cond = s.cond;
			if (s.human) this.human = s.human;
			if (Array.isArray(s.selectedIds)) this.selectedIds = s.selectedIds.filter((id: string) => this.roster.some((r) => r.id === id));
			if (s.cfg) this.cfg = s.cfg;
		} catch {
			/* ignore corrupt setup */
		}
	}
	/** Persist the current setup (also called from Settings when the profile changes). */
	saveSetup() {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(SETUP_KEY, JSON.stringify({ cond: this.cond, human: this.human, selectedIds: this.selectedIds, cfg: this.cfg }));
	}

	/* ---------- setup helpers ---------- */
	get humanAttr() {
		return { ...STYLE_PRESETS[this.human.styleKey] };
	}
	get humanRev01() {
		return clamp((this.humanAttr.rev - 150) / 400, 0, 1);
	}
	get recommendedBall(): Ball {
		return recommendBall(this.humanRev01, initialFriction(this.cond));
	}
	toggleRival(id: string) {
		const i = this.selectedIds.indexOf(id);
		if (i >= 0) this.selectedIds.splice(i, 1);
		else {
			if (this.selectedIds.length >= 3) this.selectedIds.shift();
			this.selectedIds.push(id);
		}
	}

	startGame() {
		const c = this.cond;
		const initF = initialFriction(c);
		this.selectedIds = this.selectedIds.filter((id) => this.roster.some((r) => r.id === id));
		this.saveSetup(); // remember last-used setup
		const opps: Opp[] = this.selectedIds.map((id) => {
			const b = this.roster.find((r) => r.id === id) as Bowler;
			const ball = recommendBall(clamp((b.attr.rev - 150) / 400, 0, 1), initF + 0.07);
			return { bowler: { ...b, avg: TIERS[b.tier].avg }, ball, game: [], switchFrame: null };
		});
		const onLane = [{ attr: this.humanAttr, ball: this.recommendedBall }, ...opps.map((o) => ({ attr: o.bowler.attr, ball: o.ball }))];
		const lane: Lane = { initialFriction: initF, rate: breakdownRate(onLane, this.cfg), sport: c.patternType === 'sport', allowBallChange: this.cfg.breakdown };
		for (const o of opps) {
			const r = simBowlerGame(o.bowler, lane, o.ball);
			o.game = r.frames;
			o.switchFrame = r.switchFrame;
		}
		this.lane = lane;
		this.opponents = opps;
		this.humanFrames = [[]];
		this.curStanding = [...ALLPINS];
		this.leaves = [];
		this.#pendingLeave = null;
		this.revealed = 0;
		this.deckKnocked = [];
		this.screen = 'play';
	}
	reset() {
		this.screen = 'setup';
	}

	/* ---------- human frame machine ---------- */
	get curIdx() {
		return this.humanFrames.length - 1;
	}
	get curFrame() {
		return this.humanFrames[this.curIdx];
	}
	get legalMax() {
		const i = this.curIdx,
			f = this.humanFrames[i];
		if (i < 9) return f.length === 0 ? 10 : 10 - f[0];
		if (f.length === 0) return 10;
		if (f.length === 1) return f[0] === 10 ? 10 : 10 - f[0];
		if (f[0] === 10) return f[1] === 10 ? 10 : 10 - f[1];
		return 10;
	}
	#frameDone(i: number) {
		const f = this.humanFrames[i];
		if (i < 9) return f[0] === 10 || f.length === 2;
		if (!f || !f.length) return false;
		if (f[0] === 10) return f.length === 3;
		if (f.length >= 2 && f[0] + f[1] === 10) return f.length === 3;
		return f.length === 2;
	}
	get gameOver() {
		return this.humanFrames.length === 10 && this.#frameDone(9);
	}
	#completedFrames() {
		let n = 0;
		for (let i = 0; i < this.humanFrames.length; i++) {
			if (this.humanFrames[i].length && this.#frameDone(i)) n++;
			else break;
		}
		return n;
	}

	/** Record a ball as the set of pins knocked down (positional). */
	bowl(knockedSet: number[]) {
		if (this.screen !== 'play' || this.gameOver) return;
		const i = this.curIdx;
		const before = this.curStanding;
		const ballNo = this.humanFrames[i].length;
		const knocked = knockedSet.filter((p) => before.includes(p));
		const pins = knocked.length;
		const after = before.filter((p) => !knocked.includes(p));

		this.humanFrames[i].push(pins);
		const done = this.#frameDone(i);
		if (done && i < 9) this.humanFrames.push([]);
		const advanced = this.curIdx !== i;

		if (ballNo === 0) {
			if (pins < 10) this.#pendingLeave = { frame: i, standing: after };
		} else if (this.#pendingLeave) {
			this.leaves.push({ frame: this.#pendingLeave.frame, standing: this.#pendingLeave.standing, converted: after.length === 0, split: isSplit(this.#pendingLeave.standing) });
			this.#pendingLeave = null;
		}
		this.curStanding = this.gameOver ? [] : advanced ? [...ALLPINS] : after.length === 0 ? [...ALLPINS] : after;
		if (done) this.revealed = Math.min(10, this.#completedFrames());
		this.deckKnocked = [];
		if (this.gameOver) {
			this.revealed = 10;
			this.#saveGame();
			this.screen = 'done';
		}
	}

	#saveGame() {
		const rows = this.standings();
		const me = rows.find((r) => r.me)!;
		const oppRows = rows.filter((r) => !r.me);
		const bestOpp = oppRows.length ? Math.max(...oppRows.map((r) => r.total)) : 0;
		const result: 'win' | 'loss' | 'tie' | undefined = oppRows.length
			? me.total > bestOpp
				? 'win'
				: me.total < bestOpp
					? 'loss'
					: 'tie'
			: undefined;
		const rec: GameRecord = {
			id: History.newId(),
			date: new Date().toISOString(),
			mode: 'bowloff',
			alley: this.cond.alley,
			condition: { ...this.cond },
			frames: this.humanFrames.map((f) => [...f]),
			score: me.scratch,
			handicap: me.hcp,
			leaves: this.leaves.map((l) => ({ ...l, standing: [...l.standing] })),
			spares: {
				attempts: this.leaves.length,
				converted: this.leaves.filter((l) => l.converted).length,
				splits: this.leaves.filter((l) => l.split).length
			},
			opponents: this.opponents.length ? this.opponents.map((o) => ({ name: o.bowler.name, score: lastTotal(this.oppFrames(o)) })) : undefined,
			result,
			usedHandicap: this.useHcp
		};
		history.add(rec);
	}
	togglePin(p: number) {
		const s = new Set(this.deckKnocked);
		s.has(p) ? s.delete(p) : s.add(p);
		this.deckKnocked = [...s];
	}

	/* ---------- views ---------- */
	get hcpCfg(): HandicapCfg {
		return this.cfg.hcpMode === 'percent'
			? { mode: 'percent', pct: this.cfg.hcpPct, basis: this.cfg.hcpBasis }
			: { mode: this.cfg.hcpMode };
	}
	oppFrames(o: Opp): Frame[] {
		return o.game.slice(0, this.revealed);
	}
	oppPadded(o: Opp): Frame[] {
		const out: Frame[] = [];
		for (let i = 0; i < 10; i++) out.push(i < this.revealed ? o.game[i] : []);
		return out;
	}
	get useHcp() {
		return this.cfg.hcpMode !== 'scratch';
	}
	standings(): StandRow[] {
		const rows: StandRow[] = [];
		const hs = lastTotal(this.humanFrames);
		rows.push({ name: this.human.name, me: true, styleKey: this.human.styleKey, scratch: hs, hcp: handicap({ handicap: this.human.handicap, avg: this.human.avg }, this.hcpCfg), total: 0, sw: null });
		for (const o of this.opponents) {
			const sc = lastTotal(this.oppFrames(o));
			rows.push({ name: o.bowler.name, me: false, styleKey: o.bowler.styleKey, scratch: sc, hcp: handicap(o.bowler, this.hcpCfg), total: 0, sw: o.switchFrame });
		}
		for (const r of rows) r.total = this.useHcp ? r.scratch + r.hcp : r.scratch;
		rows.sort((a, b) => b.total - a.total);
		return rows;
	}
	get laneFriction() {
		return this.lane ? frictionAt(this.lane, Math.min(9, this.curIdx)) : 0;
	}
	cumulativeOf(frames: Frame[]) {
		return cumulative(frames);
	}
}

export const g = new BowlOff();
