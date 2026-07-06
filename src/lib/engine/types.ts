// Core domain types for the VirtualLanes simulation + scoring engine.
// Ported from the validated prototype; see docs/product-direction.md.

export type StyleKey = 'straight' | 'stroker' | 'tweener' | 'cranker' | 'twoHand' | 'custom';
export type TierKey = 'rookie' | 'club' | 'pro' | 'elite';
export type Cover = 'plastic' | 'urethane' | 'solid' | 'pearl' | 'hybrid';
export type Core = 'symmetric' | 'asymmetric';

/** A ball in the bowler's arsenal. The sim reads `cover` (+`surface`); the rest is
 * record-keeping (and fuel for future fidelity / ML). */
export interface ArsenalBall {
	id: string;
	name: string;
	cover: Cover;
	core: Core;
	weight: number; // lb
	surface: string; // e.g. "2000 grit", "polished"
	rg?: number;
	diff?: number;
	layout?: string; // e.g. "4 x 4 x 2"
	note?: string;
}
export type Division = 'open' | 'pba' | 'pwba';

/** The causal levers. Style presets just fill these in. */
export interface Attr {
	rev: number; // rev rate, rpm (~150–600)
	speed: number; // ball speed, mph (~13–22)
	acc: number; // accuracy 0–1
	cons: number; // consistency 0–1
}

export interface Ball {
	name: string;
	cover: Cover;
	core: Core;
	why?: string;
}

export interface Bowler {
	id: string;
	name: string;
	styleKey: StyleKey;
	tier: TierKey;
	division: Division;
	handicap: number;
	attr: Attr;
	scout?: string;
	custom?: boolean;
	avg?: number;
}

export type PatternType = 'house' | 'sport';

/** A bowling centre. Physics-neutral — descriptive context (and ML signal). */
export interface Centre {
	id: string;
	name: string;
	location?: string;
	lanes?: number;
	pinsetter: 'freefall' | 'string';
	approach: 'short' | 'standard' | 'long';
	approachFeel: 'sticky' | 'normal' | 'slippery';
	ballReturn: 'close' | 'standard' | 'far';
	note?: string;
}

export interface LaneCondition {
	alley: string;
	centreId?: string;
	length: 'short' | 'medium' | 'long';
	volume: 'light' | 'medium' | 'heavy';
	surface: 'synthetic' | 'wood';
	patternType: PatternType;
}

export interface Lane {
	initialFriction: number;
	rate: number; // friction increase per frame (breakdown)
	sport: boolean;
	allowBallChange: boolean;
}

/** A frame is the pins knocked down per ball, e.g. [10] strike, [7,2] open, [9,1,9] tenth. */
export type Frame = number[];

export interface SimParams {
	tierMult: number;
	rev01: number;
	acc: number;
	cons: number;
	baseStrike: number;
	baseSpare: number;
	variance: number;
	aggression: number;
	idealFriction: number;
	frictionSens: number;
}

/** A leave recorded after the first ball of a frame (for spare/split analytics). */
export interface Leave {
	frame: number;
	standing: number[]; // pins still up after ball 1
	converted: boolean; // cleared on ball 2?
	split: boolean;
}

/** One journaled shot: what you saw → decided → happened (the Journal mode). */
export interface JournalShot {
	saw: string; // what the lane/ball did
	reaction: '' | 'early' | 'mid' | 'late'; // when it hooked
	result: string; // what happened (strike, 10-pin, washout, …)
	adjustments: string[]; // what you changed: feet / target / speed / loft / hand / ball
	read: '' | 'match' | 'miss'; // did your read match? (V / X)
	emotion: '' | 'good' | 'ok' | 'bad';
	note: string;
	frame?: number; // which frame this note is attached to (0-based), when journaled during a game
}

/** Fields every mode's history record shares. */
export interface GameBase {
	id: string;
	date: string; // ISO timestamp
	alley: string;
	ball?: string; // primary ball used (bowl-off: arsenal ball name; journal: free text)
}

export interface BowloffRecord extends GameBase {
	mode: 'bowloff';
	condition?: LaneCondition;
	frames?: Frame[];
	score?: number;
	handicap?: number;
	leaves?: Leave[];
	spares?: { attempts: number; converted: number; splits: number };
	opponents?: { name: string; score: number }[];
	result?: 'win' | 'loss' | 'tie';
	usedHandicap?: boolean;
	partial?: boolean; // finished early (fewer than 10 frames) — kept in history, excluded from stats
	ballChanges?: { frame: number; name: string; cover: string }[]; // ball-downs
	centre?: { name: string; pinsetter: string; approach: string; approachFeel: string; ballReturn: string }; // snapshot for stats/ML
	shots?: JournalShot[]; // per-frame post-it notes made during the game (unified session)
}

export interface JournalRecord extends GameBase {
	mode: 'journal';
	pattern?: string;
	shots?: JournalShot[];
}

/**
 * The shared, persisted history record — a union discriminated on `mode`, so every
 * consumer switches exhaustively and the compiler flags them all when a mode is added
 * (Trace lands as a `TraceRecord` variant here).
 */
export type GameRecord = BowloffRecord | JournalRecord;

// `satisfies Record<mode, true>` makes this fail to compile if the union gains a mode
// that isn't listed — the point of the union is that consumers can't silently lag.
const ALL_MODES = { bowloff: true, journal: true } satisfies Record<GameRecord['mode'], true>;
/** All valid record modes, derived from the union — used to validate imports. */
export const GAME_MODES = Object.keys(ALL_MODES) as GameRecord['mode'][];
