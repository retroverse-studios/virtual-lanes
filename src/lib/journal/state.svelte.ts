// Journal mode: log real shots (saw → decided → happened). Saves to shared history.
import { history, History } from '$lib/history.svelte';
import type { JournalRecord, JournalShot } from '$lib/engine/types';

export const ADJUSTMENTS = ['feet', 'target', 'speed', 'loft', 'hand', 'ball'];
export const EMOJI: Record<string, string> = { good: '😊', ok: '😐', bad: '😤' };

const emptyShot = (): JournalShot => ({ saw: '', reaction: '', result: '', adjustments: [], read: '', emotion: '', note: '' });

class Journal {
	active = $state(false);
	alley = $state('Sunset Lanes');
	pattern = $state('House');
	ball = $state('');
	shots = $state<JournalShot[]>([]);
	draft = $state<JournalShot>(emptyShot());
	editing = $state<number | null>(null); // index being edited; null = new shot

	start() {
		this.active = true;
		this.shots = [];
		this.draft = emptyShot();
		this.editing = null;
	}
	editShot(i: number) {
		this.draft = { ...this.shots[i], adjustments: [...this.shots[i].adjustments] };
		this.editing = i;
	}
	cancelEdit() {
		this.draft = emptyShot();
		this.editing = null;
	}
	toggleAdj(tag: string) {
		const s = new Set(this.draft.adjustments);
		s.has(tag) ? s.delete(tag) : s.add(tag);
		this.draft.adjustments = [...s];
	}
	saveShot() {
		const shot: JournalShot = { ...this.draft, adjustments: [...this.draft.adjustments] };
		if (this.editing === null) this.shots.push(shot);
		else this.shots[this.editing] = shot;
		this.draft = emptyShot();
		this.editing = null;
	}
	removeShot(i: number) {
		this.shots.splice(i, 1);
		if (this.editing === i) this.cancelEdit();
	}
	get canSaveShot() {
		return !!(this.draft.saw || this.draft.result || this.draft.note || this.draft.adjustments.length);
	}
	get matchRate() {
		const judged = this.shots.filter((s) => s.read);
		return { matched: judged.filter((s) => s.read === 'match').length, judged: judged.length };
	}
	finish() {
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
	}
}

export const j = new Journal();
