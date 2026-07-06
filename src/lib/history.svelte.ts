// Shared game history — one timeline for both modes, persisted to localStorage.
import { browser } from '$app/environment';
import { newId, readJSON, writeJSON } from '$lib/stores/local.svelte';
import type { GameRecord } from '$lib/engine/types';

const KEY = 'vl.games.v1';

export class History {
	games = $state<GameRecord[]>([]);
	/** True when the most recent write failed (out of storage / private mode). */
	writeFailed = $state(false);
	#loaded = false;

	constructor() {
		this.load();
	}

	/** Load once from localStorage. Idempotent and SSR-safe — safe to call again. */
	load() {
		if (this.#loaded || !browser) return;
		this.#loaded = true;
		const parsed = readJSON<GameRecord[]>(KEY);
		this.games = Array.isArray(parsed) ? parsed : [];
	}

	#persist() {
		this.writeFailed = !writeJSON(KEY, this.games);
	}

	add(g: GameRecord) {
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

	static newId() {
		return newId();
	}
}

export const history = new History();
