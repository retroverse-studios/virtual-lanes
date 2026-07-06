// Shared game history — one timeline for both modes, persisted to localStorage.
import { browser } from '$app/environment';
import { newId, readJSON, writeJSON } from '$lib/stores/local.svelte';
import { GAME_MODES, type GameRecord } from '$lib/engine/types';

/** Minimal shape check for records coming from an import file (untrusted JSON). */
function isValidRecord(g: unknown): g is GameRecord {
	const r = g as GameRecord | null;
	return !!r && typeof r.id === 'string' && typeof r.date === 'string' && !isNaN(Date.parse(r.date)) && GAME_MODES.includes(r.mode);
}

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
	/** Merge (or replace) imported games, dropping malformed records. Returns how many were added. */
	import(incoming: unknown[], replace = false): number {
		const valid = incoming.filter(isValidRecord);
		if (replace) {
			this.games = valid;
			this.#persist();
			return valid.length;
		}
		const have = new Set(this.games.map((g) => g.id));
		const fresh = valid.filter((g) => !have.has(g.id));
		this.games = [...fresh, ...this.games].sort((a, b) => (a.date < b.date ? 1 : -1));
		this.#persist();
		return fresh.length;
	}

	static newId() {
		return newId();
	}
}

export const history = new History();
