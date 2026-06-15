// The bowler's arsenal — stock balls (generic, no brands) + created balls + hidden stock.
import type { ArsenalBall } from '$lib/engine/types';

const KEY = 'vl.arsenal.v1';

export const STOCK_BALLS: ArsenalBall[] = [
	{ id: 'stk-plastic', name: 'Plastic spare ball', cover: 'plastic', core: 'symmetric', weight: 15, surface: 'polished', note: 'goes straight — for corner pins' },
	{ id: 'stk-urethane', name: 'Urethane control', cover: 'urethane', core: 'symmetric', weight: 15, surface: '2000 grit', note: 'controls dry / burnt lanes' },
	{ id: 'stk-solid', name: 'Solid reactive (heavy oil)', cover: 'solid', core: 'asymmetric', weight: 15, surface: '2000 grit', note: 'early read, strong on oil' },
	{ id: 'stk-hybrid', name: 'Hybrid all-rounder', cover: 'hybrid', core: 'symmetric', weight: 15, surface: '3000 grit', note: 'clean through fronts, controllable' },
	{ id: 'stk-pearl', name: 'Pearl reactive (backend)', cover: 'pearl', core: 'asymmetric', weight: 15, surface: 'polished', note: 'length + sharp backend on medium' }
];

export class Arsenal {
	custom = $state<ArsenalBall[]>([]);
	hidden = $state<string[]>([]); // ids of stock balls the user hid

	constructor() {
		this.#load();
	}
	#load() {
		if (typeof localStorage === 'undefined') return;
		try {
			const s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
			if (Array.isArray(s)) this.custom = s; // legacy: bare array of custom balls
			else if (s) {
				if (Array.isArray(s.custom)) this.custom = s.custom;
				if (Array.isArray(s.hidden)) this.hidden = s.hidden;
			}
		} catch {
			/* ignore */
		}
	}
	#persist() {
		if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify({ custom: this.custom, hidden: this.hidden }));
	}

	/** Balls available to pick in a game: visible stock + custom. */
	get available(): ArsenalBall[] {
		return [...STOCK_BALLS.filter((b) => !this.hidden.includes(b.id)), ...this.custom];
	}
	/** Stock balls with hidden flags, for the manager UI. */
	get stockList() {
		return STOCK_BALLS.map((b) => ({ ball: b, hidden: this.hidden.includes(b.id) }));
	}

	add(b: ArsenalBall) {
		this.custom.push(b);
		this.#persist();
	}
	update(id: string, b: ArsenalBall) {
		const i = this.custom.findIndex((x) => x.id === id);
		if (i >= 0) this.custom[i] = b;
		this.#persist();
	}
	remove(id: string) {
		this.custom = this.custom.filter((x) => x.id !== id);
		this.#persist();
	}
	hide(id: string) {
		if (!this.hidden.includes(id)) {
			this.hidden.push(id);
			this.#persist();
		}
	}
	unhide(id: string) {
		this.hidden = this.hidden.filter((h) => h !== id);
		this.#persist();
	}
	static newId() {
		return 'b' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
	}
}

export const arsenal = new Arsenal();
