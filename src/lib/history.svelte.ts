// Shared game history — one timeline for both modes, persisted to localStorage.
import type { GameRecord } from '$lib/engine/types';

const KEY = 'vl.games.v1';

export class History {
	games = $state<GameRecord[]>([]);
	#loaded = false;

	/** Lazy-load from localStorage (client only). Safe to call repeatedly. */
	load() {
		if (this.#loaded || typeof localStorage === 'undefined') return;
		this.#loaded = true;
		try {
			this.games = JSON.parse(localStorage.getItem(KEY) ?? '[]');
		} catch {
			this.games = [];
		}
	}
	#persist() {
		if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(this.games));
	}
	add(g: GameRecord) {
		this.load();
		this.games.unshift(g); // newest first
		this.#persist();
	}
	remove(id: string) {
		this.games = this.games.filter((x) => x.id !== id);
		this.#persist();
	}
	clear() {
		this.games = [];
		this.#persist();
	}
	/** Merge (or replace) imported games. Returns how many new ones were added. */
	import(incoming: GameRecord[], replace = false): number {
		this.load();
		if (replace) {
			this.games = incoming;
			this.#persist();
			return incoming.length;
		}
		const have = new Set(this.games.map((g) => g.id));
		const fresh = incoming.filter((g) => g && g.id && !have.has(g.id));
		this.games = [...fresh, ...this.games].sort((a, b) => (a.date < b.date ? 1 : -1));
		this.#persist();
		return fresh.length;
	}

	/** Generate an id without relying on crypto (works everywhere). */
	static newId() {
		return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
	}
}

export const history = new History();
