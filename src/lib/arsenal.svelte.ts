// The bowler's arsenal — stock balls (generic, no brands) + created balls + hidden stock.
import { StockedStore, newId } from '$lib/stores/local.svelte';
import type { ArsenalBall } from '$lib/engine/types';

const KEY = 'vl.arsenal.v1';

export const STOCK_BALLS: ArsenalBall[] = [
	{ id: 'stk-plastic', name: 'Plastic spare ball', cover: 'plastic', core: 'symmetric', weight: 15, surface: 'polished', note: 'goes straight — for corner pins' },
	{ id: 'stk-urethane', name: 'Urethane control', cover: 'urethane', core: 'symmetric', weight: 15, surface: '2000 grit', note: 'controls dry / burnt lanes' },
	{ id: 'stk-solid', name: 'Solid reactive (heavy oil)', cover: 'solid', core: 'asymmetric', weight: 15, surface: '2000 grit', note: 'early read, strong on oil' },
	{ id: 'stk-hybrid', name: 'Hybrid all-rounder', cover: 'hybrid', core: 'symmetric', weight: 15, surface: '3000 grit', note: 'clean through fronts, controllable' },
	{ id: 'stk-pearl', name: 'Pearl reactive (backend)', cover: 'pearl', core: 'asymmetric', weight: 15, surface: 'polished', note: 'length + sharp backend on medium' }
];

export class Arsenal extends StockedStore<ArsenalBall> {
	protected get key() {
		return KEY;
	}
	protected get stock() {
		return STOCK_BALLS;
	}

	/** Migrate the legacy format (a bare array of custom balls) into the canonical shape. */
	protected hydrate(raw: unknown) {
		if (Array.isArray(raw)) return { custom: raw as ArsenalBall[], hidden: [] };
		return super.hydrate(raw);
	}

	/** Stock balls with hidden flags, for the manager UI. */
	get stockList() {
		return this.stock.map((ball) => ({ ball, hidden: this.hidden.includes(ball.id) }));
	}

	static newId() {
		return newId('b');
	}
}

export const arsenal = new Arsenal();
