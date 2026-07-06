import { describe, it, expect, beforeEach, vi } from 'vitest';

// The stores only touch localStorage when `browser` is true. Mock it on so the
// base class exercises its load/persist path; we supply an in-memory localStorage.
vi.mock('$app/environment', () => ({ browser: true, building: false, dev: true, version: '' }));

import { StockedStore, newId, readJSON, writeJSON } from './local.svelte';

interface MemStorage {
	getItem(k: string): string | null;
	setItem(k: string, v: string): void;
	removeItem(k: string): void;
	clear(): void;
}
function memStorage(): MemStorage {
	const m = new Map<string, string>();
	return {
		getItem: (k) => (m.has(k) ? m.get(k)! : null),
		setItem: (k, v) => void m.set(k, String(v)),
		removeItem: (k) => void m.delete(k),
		clear: () => m.clear()
	};
}

// A minimal concrete subclass exercising the base (stock + custom + hidden).
class Box extends StockedStore<{ id: string; v: number }> {
	protected get key() {
		return 'test.box';
	}
	protected get stock() {
		return [
			{ id: 's1', v: 1 },
			{ id: 's2', v: 2 }
		];
	}
}

beforeEach(() => {
	vi.stubGlobal('localStorage', memStorage());
});

describe('StockedStore', () => {
	it('hydrates custom + hidden from localStorage in the constructor', () => {
		localStorage.setItem('test.box', JSON.stringify({ custom: [{ id: 'c1', v: 9 }], hidden: ['s1'] }));
		const b = new Box();
		expect(b.custom.map((x) => x.id)).toEqual(['c1']);
		expect(b.hidden).toEqual(['s1']);
	});

	it('available = visible stock first, then custom', () => {
		const b = new Box();
		b.add({ id: 'c1', v: 9 });
		b.hide('s1');
		expect(b.available.map((x) => x.id)).toEqual(['s2', 'c1']);
	});

	it('add / update / remove round-trip through localStorage', () => {
		const b = new Box();
		b.add({ id: 'c1', v: 5 });
		expect(JSON.parse(localStorage.getItem('test.box')!).custom).toHaveLength(1);
		b.update('c1', { id: 'c1', v: 7 });
		expect(b.custom[0].v).toBe(7);
		b.remove('c1');
		expect(b.custom).toHaveLength(0);
	});

	it('byId resolves stock then custom, and undefined safely', () => {
		const b = new Box();
		expect(b.byId('s2')?.v).toBe(2);
		b.add({ id: 'c1', v: 9 });
		expect(b.byId('c1')?.v).toBe(9);
		expect(b.byId('missing')).toBeUndefined();
		expect(b.byId(undefined)).toBeUndefined();
	});

	it('hide / unhide flip the hidden set and persist', () => {
		const b = new Box();
		b.hide('s1');
		expect(b.available.map((x) => x.id)).toEqual(['s2']);
		b.unhide('s1');
		expect(b.available.map((x) => x.id)).toEqual(['s1', 's2']);
	});

	it('flags writeFailed (no silent data loss) when storage throws', () => {
		// Swap in a storage whose write always fails — emulates quota exceeded / private mode.
		const broken: MemStorage = {
			...memStorage(),
			setItem: () => {
				throw new Error('quota exceeded');
			}
		};
		vi.stubGlobal('localStorage', broken);
		const b = new Box();
		b.add({ id: 'c1', v: 1 });
		expect(b.writeFailed).toBe(true);
	});

	it('survives corrupt on-disk JSON (keeps defaults)', () => {
		localStorage.setItem('test.box', '{not valid json');
		const b = new Box();
		expect(b.custom).toHaveLength(0);
		expect(b.available.map((x) => x.id)).toEqual(['s1', 's2']);
	});
});

describe('readJSON / writeJSON / newId', () => {
	it('round-trips values and tolerates corrupt JSON', () => {
		expect(writeJSON('k', { x: 1 })).toBe(true);
		expect(readJSON('k')).toEqual({ x: 1 });
		localStorage.setItem('bad', '{not json');
		expect(readJSON('bad')).toBeNull();
		expect(readJSON('absent')).toBeNull();
	});
	it('newId is prefixed and monotonic-unique', () => {
		const a = newId('b');
		const b = newId('b');
		expect(a.startsWith('b')).toBe(true);
		expect(a).not.toBe(b);
	});
});
