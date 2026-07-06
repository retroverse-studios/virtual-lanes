// Roster store: built-in rivals + user-created custom rivals + hidden built-ins.
import { StockedStore, newId } from '$lib/stores/local.svelte';
import { ROSTER } from '$lib/engine/personas';
import type { Bowler } from '$lib/engine/types';

const KEY = 'vl.roster.v1';

export class RosterStore extends StockedStore<Bowler> {
	protected get key() {
		return KEY;
	}
	protected get stock() {
		return ROSTER;
	}

	/** Built-in rivals with hidden flags, for the manager UI. */
	get builtins() {
		return this.stock.map((bowler) => ({ bowler, hidden: this.hidden.includes(bowler.id) }));
	}

	static newId() {
		return newId('c');
	}
}

export const roster = new RosterStore();
