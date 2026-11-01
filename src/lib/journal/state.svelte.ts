// Journal mode: log real shots (saw → decided → happened). Saves to shared history.
import { history, History } from '$lib/history.svelte';
import { readJSON, writeJSON } from '$lib/stores/local.svelte';
import { browser } from '$app/environment';
import type { JournalRecord, JournalShot } from '$lib/engine/types';

export const ADJUSTMENTS = ['feet', 'target', 'speed', 'loft', 'hand', 'ball'];
export const EMOJI: Record<string, string> = { good: '😊', ok: '😐', bad: '😤' };

const emptyShot = (): JournalShot => ({ saw: '', reaction: '', result: '', adjustments: [], read: '', emotion: '', note: '' });

const LIVE_KEY = 'vl.journal.live.v1';

interface LiveJournal {
	alley: string;
	pattern: string;
	ball: string;
	shots: JournalShot[];
	draft: JournalShot;
	editing: number | null;
}

class Journal {
	active = $state(false);
	alley = $state('Sunset Lanes');
	pattern = $state('House');
	ball = $state('');
	shots = $state<JournalShot[]>([]);
	draft = $state<JournalShot>(emptyShot());
	editing = $state<number | null>(null); // index being edited; null = new shot

	constructor() {
		this.#resume();
	}

	// Checkpointed like a live Bowl-off game: a refresh or killed tab
	// mid-session used to lose every logged shot (AUDIT M4)
	checkpoint() {
		if (!this.active) return;
		writeJSON(LIVE_KEY, {
			alley: this.alley,
			pattern: this.pattern,
			ball: this.ball,
			shots: this.shots,
			draft: this.draft,
			editing: this.editing
		} satisfies LiveJournal);
	}
	#resume() {
		const s = readJSON<LiveJournal>(LIVE_KEY);
		if (!s || !Array.isArray(s.shots)) return;
		this.alley = s.alley ?? this.alley;
		this.pattern = s.pattern ?? this.pattern;
		this.ball = s.ball ?? '';
		this.shots = s.shots;
		this.draft = s.draft ? { ...emptyShot(), ...s.draft, adjustments: [...(s.draft.adjustments ?? [])] } : emptyShot();
		this.editing = typeof s.editing === 'number' ? s.editing : null;
		this.active = true;
	}

	start() {
		this.active = true;
		this.shots = [];
		this.draft = emptyShot();
		this.editing = null;
		this.checkpoint();
	}
	editShot(i: number) {
		this.draft = { ...this.shots[i], adjustments: [...this.shots[i].adjustments] };
		this.editing = i;
		this.checkpoint();
	}
	cancelEdit() {
		this.draft = emptyShot();
		this.editing = null;
		this.checkpoint();
	}
	toggleAdj(tag: string) {
		const s = new Set(this.draft.adjustments);
		s.has(tag) ? s.delete(tag) : s.add(tag);
		this.draft.adjustments = [...s];
		this.checkpoint();
	}
	saveShot() {
		const shot: JournalShot = { ...this.draft, adjustments: [...this.draft.adjustments] };
		if (this.editing === null) this.shots.push(shot);
		else this.shots[this.editing] = shot;
		this.draft = emptyShot();
		this.editing = null;
		this.checkpoint();
	}
	removeShot(i: number) {
		this.shots.splice(i, 1);
		if (this.editing === i) this.cancelEdit();
		this.checkpoint();
	}
	get canSaveShot() {
		return !!(this.draft.saw || this.draft.result || this.draft.note || this.draft.adjustments.length);
	}
	get matchRate() {
		const judged = this.shots.filter((s) => s.read);
		return { matched: judged.filter((s) => s.read === 'match').length, judged: judged.length };
	}
	finish() {
		// A complete-but-unlogged draft belongs in the record, not the bin
		if (this.canSaveShot) this.saveShot();
		if (this.shots.length) {
			const rec: JournalRecord = {
				id: History.newId(),
				date: new Date().toISOString(),
				mode: 'journal',
				alley: this.alley,
				pattern: this.pattern,
				ball: this.ball,
				shots: this.shots.map((s) => ({ ...s, adjustments: [...s.adjustments] }))
			};
			history.add(rec);
		}
		this.discard();
	}
	discard() {
		this.active = false;
		this.shots = [];
		this.draft = emptyShot();
		this.editing = null;
		if (browser) {
			try {
				localStorage.removeItem(LIVE_KEY);
			} catch {
				/* storage unavailable — nothing was checkpointed anyway */
			}
		}
	}
}

export const j = new Journal();
