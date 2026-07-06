// Bowling centres — stock (generic, no real names) + custom + hidden. Physics-neutral.
import { StockedStore, newId } from '$lib/stores/local.svelte';
import type { Centre } from '$lib/engine/types';

const KEY = 'vl.centres.v1';

export const STOCK_CENTRES: Centre[] = [
	{ id: 'ctr-sunset', name: 'Sunset Lanes', lanes: 24, pinsetter: 'freefall', approach: 'standard', approachFeel: 'normal', ballReturn: 'standard', note: 'house default' },
	{ id: 'ctr-downtown', name: 'Downtown Strikes', lanes: 16, pinsetter: 'string', approach: 'short', approachFeel: 'slippery', ballReturn: 'close', note: 'string pins, tight building' },
	{ id: 'ctr-galaxy', name: 'Galaxy Bowl', lanes: 40, pinsetter: 'freefall', approach: 'long', approachFeel: 'sticky', ballReturn: 'far', note: 'big centre, long approach' }
];

export class Centres extends StockedStore<Centre> {
	protected get key() {
		return KEY;
	}
	protected get stock() {
		return STOCK_CENTRES;
	}
	get stockList() {
		return this.stock.map((centre) => ({ centre, hidden: this.hidden.includes(centre.id) }));
	}

	static newId() {
		return newId('ctr');
	}
}

export const centres = new Centres();
