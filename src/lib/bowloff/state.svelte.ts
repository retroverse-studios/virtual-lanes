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
import { arsenal } from '$lib/arsenal.svelte';
import { centres } from '$lib/centres.svelte';
import { history, History } from '$lib/history.svelte';
import { readJSON, writeJSON } from '$lib/stores/local.svelte';
import { browser } from '$app/environment';
import type { Ball, Bowler, BowloffRecord, Frame, JournalShot, Lane, LaneCondition, Leave, StyleKey } from '$lib/engine/types';

const emptyNote = (): JournalShot => ({ saw: '', reaction: '', result: '', adjustments: [], read: '', emotion: '', note: '' });

export type Screen = 'setup' | 'play' | 'done';
export type HcpMode = 'scratch' | 'perBowler' | 'percent';

interface HumanProfile {
	name: string;
	styleKey: Exclude<StyleKey, 'custom'>;
	avg: number;
	division: 'open' | 'pba' | 'pwba';
	handicap: number;
	handedness: 'left' | 'right';
	grip: 'one' | 'two';
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
const LIVE_KEY = 'vl.bowloff.live.v1';

/** Snapshot of an in-progress game, checkpointed so a refresh/tab-kill at the alley can't lose it. */
interface LiveGame {
	cond: LaneCondition;
	lane: Lane | null; // never null in practice — checkpoints only happen mid-play
	opponents: Opp[];
	humanFrames: Frame[];
	curStanding: number[];
	leaves: Leave[];
	pendingLeave: { frame: number; standing: number[] } | null;
	revealed: number;
	notes: Record<number, JournalShot>;
	ballId: string;
	ballChanges: { frame: number; id: string; name: string; cover: string }[];
}

class BowlOff {
	screen = $state<Screen>('setup');
	cond = $state<LaneCondition>({
		alley: 'Sunset Lanes',
		centreId: 'ctr-sunset',
		length: 'medium',
		volume: 'medium',
		surface: 'synthetic',
		patternType: 'house'
	});
	human = $state<HumanProfile>({ name: 'You', styleKey: 'stroker', avg: 165, division: 'open', handicap: 0, handedness: 'right', grip: 'one' });
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

	// per-frame journal notes (post-it) attached to the live game
	notes = $state<Record<number, JournalShot>>({});
	noteFrame = $state<number | null>(null); // frame whose post-it is open
	noteDraft = $state<JournalShot>(emptyNote());

	// your ball + per-game ball changes
	ballId = $state<string>('');
	ballChanges = $state<{ frame: number; id: string; name: string; cover: string }[]>([]);
	ballPickerOpen = $state(false);

	/** Selectable rivals = visible built-ins + custom (from the roster store). */
	get roster() {
		return rosterStore.available;
	}

	constructor() {
		this.#loadSetup();
		this.#resume();
	}
	#loadSetup() {
		const s = readJSON<Partial<{ cond: LaneCondition; human: HumanProfile; selectedIds: string[]; cfg: Cfg }>>(SETUP_KEY);
		if (!s) return;
		if (s.cond) this.cond = { ...this.cond, ...s.cond };
		if (s.human) this.human = { ...this.human, ...s.human };
		if (Array.isArray(s.selectedIds)) this.selectedIds = s.selectedIds.filter((id: string) => this.roster.some((r) => r.id === id));
		if (s.cfg) this.cfg = { ...this.cfg, ...s.cfg };
	}
	/** Persist the current setup (also called from Settings when the profile changes). */
	saveSetup() {
		writeJSON(SETUP_KEY, { cond: this.cond, human: this.human, selectedIds: this.selectedIds, cfg: this.cfg });
	}

	/* ---------- live-game checkpoint (durability across refresh / PWA eviction) ---------- */
	#checkpoint() {
		if (this.screen !== 'play') return;
		writeJSON(LIVE_KEY, {
			cond: this.cond,
			lane: this.lane,
			opponents: this.opponents,
			humanFrames: this.humanFrames,
			curStanding: this.curStanding,
			leaves: this.leaves,
			pendingLeave: this.#pendingLeave,
			revealed: this.revealed,
			notes: this.notes,
			ballId: this.ballId,
			ballChanges: this.ballChanges
		} satisfies LiveGame);
	}
	#clearCheckpoint() {
		if (!browser) return;
		try {
			localStorage.removeItem(LIVE_KEY);
		} catch {
			/* storage disabled — nothing to clear */
		}
	}
	#resume() {
		const s = readJSON<LiveGame>(LIVE_KEY);
		if (!s || !s.lane || !Array.isArray(s.humanFrames) || !Array.isArray(s.opponents)) return;
		this.cond = { ...this.cond, ...s.cond };
		this.lane = s.lane;
		this.opponents = s.opponents;
		this.humanFrames = s.humanFrames.length ? s.humanFrames : [[]];
		this.curStanding = Array.isArray(s.curStanding) ? s.curStanding : [...ALLPINS];
		this.leaves = Array.isArray(s.leaves) ? s.leaves : [];
		this.#pendingLeave = s.pendingLeave ?? null;
		this.revealed = s.revealed ?? 0;
		this.notes = s.notes ?? {};
		this.ballId = s.ballId ?? '';
		this.ballChanges = Array.isArray(s.ballChanges) ? s.ballChanges : [];
		this.screen = 'play';
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
		this.notes = {};
		this.noteFrame = null;
		const firstBall = arsenal.available[0];
		this.ballId = firstBall?.id ?? '';
		this.ballChanges = firstBall ? [{ frame: 0, id: firstBall.id, name: firstBall.name, cover: firstBall.cover }] : [];
		this.ballPickerOpen = false;
		this.screen = 'play';
		this.#checkpoint();
	}
	reset() {
		this.#clearCheckpoint(); // covers Discard mid-game — a dropped game must not resume
		this.screen = 'setup';
	}
	/** Finish early: save what's bowled so far (partial if before the 10th) and show the summary. */
	finish() {
		if (this.screen !== 'play') return;
		this.#saveGame();
		this.#clearCheckpoint();
		this.screen = 'done';
	}
	get partial() {
		return !this.gameOver;
	}

	/* ---------- human frame machine ---------- */
	get curIdx() {
		return this.humanFrames.length - 1;
	}
	get curFrame() {
		return this.humanFrames[this.curIdx];
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
			this.#clearCheckpoint();
			this.screen = 'done';
		} else {
			this.#checkpoint();
		}
	}

	#saveGame() {
		const rows = this.standings();
		const me = rows.find((r) => r.me)!;
		const oppRows = rows.filter((r) => !r.me);
		const bestOpp = oppRows.length ? Math.max(...oppRows.map((r) => r.total)) : 0;
		const partial = !this.gameOver;
		const result: 'win' | 'loss' | 'tie' | undefined =
			oppRows.length && !partial ? (me.total > bestOpp ? 'win' : me.total < bestOpp ? 'loss' : 'tie') : undefined;
		const rec: BowloffRecord = {
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
			usedHandicap: this.useHcp,
			partial: partial || undefined,
			ball: this.ballChanges[0]?.name,
			ballChanges: this.ballChanges.length > 1 ? this.ballChanges.map((c) => ({ frame: c.frame, name: c.name, cover: c.cover })) : undefined,
			centre: (() => {
				const c = centres.byId(this.cond.centreId);
				return c ? { name: c.name, pinsetter: c.pinsetter, approach: c.approach, approachFeel: c.approachFeel, ballReturn: c.ballReturn } : undefined;
			})(),
			shots: this.noteCount ? Object.values(this.notes).map((s) => ({ ...s, adjustments: [...s.adjustments] })) : undefined
		};
		history.add(rec);
	}
	togglePin(p: number) {
		const s = new Set(this.deckKnocked);
		s.has(p) ? s.delete(p) : s.add(p);
		this.deckKnocked = [...s];
	}

	/* ---------- per-frame journal (post-it) ---------- */
	get noteCount() {
		return Object.keys(this.notes).length;
	}
	openNote(frame: number) {
		const ex = this.notes[frame];
		this.noteDraft = ex ? { ...ex, adjustments: [...ex.adjustments] } : emptyNote();
		this.noteFrame = frame;
	}
	closeNote() {
		this.noteFrame = null;
	}
	toggleNoteAdj(tag: string) {
		const s = new Set(this.noteDraft.adjustments);
		s.has(tag) ? s.delete(tag) : s.add(tag);
		this.noteDraft.adjustments = [...s];
	}
	saveNote() {
		if (this.noteFrame === null) return;
		const d = this.noteDraft;
		const has = d.saw || d.note || d.adjustments.length || d.read || d.emotion || d.reaction;
		if (has) this.notes[this.noteFrame] = { ...d, adjustments: [...d.adjustments], frame: this.noteFrame };
		else delete this.notes[this.noteFrame];
		this.noteFrame = null;
		this.#checkpoint();
	}

	/* ---------- your ball / ball changes ---------- */
	get currentBall() {
		return arsenal.available.find((b) => b.id === this.ballId);
	}
	switchBall(id: string) {
		const b = arsenal.available.find((x) => x.id === id);
		this.ballPickerOpen = false;
		if (!b || id === this.ballId) return;
		this.ballId = id;
		const f = Math.min(this.curIdx, 9);
		const entry = { frame: f, id: b.id, name: b.name, cover: b.cover };
		const ex = this.ballChanges.findIndex((c) => c.frame === f);
		if (ex >= 0) this.ballChanges[ex] = entry;
		else this.ballChanges.push(entry);
		this.#checkpoint();
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
