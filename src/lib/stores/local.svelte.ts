// Shared persistence mechanics for the localStorage-backed stores.
// Centralises: SSR-safe one-time load, quota-safe writes, id generation, and the
// stock + custom + hidden record pattern shared by Arsenal / Centres / Roster.
import { browser } from '$app/environment';

/** A collision-resistant id without depending on crypto (works in any browser/worker). */
export function newId(prefix = ''): string {
	return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

/** Read + parse a localStorage key. Returns null when absent, corrupt, or on the server. */
export function readJSON<T>(key: string): T | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(key);
		return raw == null ? null : (JSON.parse(raw) as T);
	} catch {
		return null; // corrupt JSON — keep defaults rather than crashing the app
	}
}

/**
 * Write JSON to localStorage. Returns false if the write failed (quota exceeded,
 * private mode, storage disabled). Callers surface the failure to the user rather
 * than silently losing data.
 */
export function writeJSON(key: string, value: unknown): boolean {
	if (!browser) return false;
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
}

/** Persisted shape written to disk for the stocked stores. */
export interface StockedState<T> {
	custom: T[];
	hidden: string[];
}

/**
 * Base for the "stock + user-created + hidden" collection stores (Arsenal, Centres,
 * Roster). The subclass supplies the immutable `stock` list and storage `key` (as
 * getters, so they exist when the constructor loads), and may override `hydrate`.
 */
export abstract class StockedStore<T extends { id: string }> {
	// Getters (not fields) so they are available when the base constructor calls load().
	protected abstract get key(): string;
	protected abstract get stock(): readonly T[];

	custom = $state<T[]>([]);
	hidden = $state<string[]>([]);
	/** True when the most recent write failed (out of storage / private mode). */
	writeFailed = $state(false);

	#loaded = false;

	constructor() {
		this.load();
	}

	/** Normalise the parsed on-disk value into the canonical shape, or null to keep defaults.
	 *  Override to migrate legacy formats (e.g. a bare array of custom records). */
	protected hydrate(raw: unknown): StockedState<T> | null {
		const s = raw as Partial<StockedState<T>> | null;
		if (!s) return null;
		return { custom: Array.isArray(s.custom) ? s.custom : [], hidden: Array.isArray(s.hidden) ? s.hidden : [] };
	}

	protected load(): void {
		if (this.#loaded || !browser) return;
		this.#loaded = true;
		const s = this.hydrate(readJSON<unknown>(this.key));
		if (!s) return;
		this.custom = s.custom;
		this.hidden = s.hidden;
	}

	protected persist(): void {
		this.writeFailed = !writeJSON(this.key, { custom: this.custom, hidden: this.hidden });
	}

	/** Records selectable in the app: visible built-ins first, then user-created. */
	get available(): T[] {
		return [...this.stock.filter((r) => !this.hidden.includes(r.id)), ...this.custom];
	}

	byId(id: string | undefined): T | undefined {
		if (!id) return undefined;
		return this.stock.find((r) => r.id === id) ?? this.custom.find((r) => r.id === id);
	}

	add(record: T): void {
		this.custom.push(record);
		this.persist();
	}
	update(id: string, record: T): void {
		const i = this.custom.findIndex((r) => r.id === id);
		if (i >= 0) this.custom[i] = record;
		this.persist();
	}
	remove(id: string): void {
		this.custom = this.custom.filter((r) => r.id !== id);
		this.persist();
	}
	hide(id: string): void {
		if (!this.hidden.includes(id)) {
			this.hidden.push(id);
			this.persist();
		}
	}
	unhide(id: string): void {
		this.hidden = this.hidden.filter((h) => h !== id);
		this.persist();
	}

	/** Serializable copy of the user-owned state, for backup export. */
	snapshot(): StockedState<T> {
		return { custom: this.custom.map((r) => ({ ...r })), hidden: [...this.hidden] };
	}
	/** Replace state from an imported backup. Returns false (untouched) on malformed input. */
	restore(raw: unknown): boolean {
		const s = this.hydrate(raw);
		if (!s) return false;
		this.custom = s.custom;
		this.hidden = s.hidden;
		this.persist();
		return true;
	}
}
