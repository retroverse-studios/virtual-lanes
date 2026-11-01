import { describe, it, expect } from 'vitest';
import { g } from './state.svelte';

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

describe('bowl-off undo (AUDIT M3)', () => {
	it('undoes a bowled strike, restoring frame and standing', () => {
		g.startGame();
		g.bowl(ALL);
		expect(g.humanFrames).toEqual([[10], []]);
		expect(g.canUndo).toBe(true);
		g.undoLastBall();
		expect(g.humanFrames).toEqual([[]]);
		expect(g.curStanding).toEqual(ALL);
		expect(g.canUndo).toBe(false);
	});

	it('undoes a spare conversion and its leave record', () => {
		g.startGame();
		g.bowl([1, 2, 3, 4, 5, 6, 7, 8, 9]); // leave the 10-pin
		g.bowl([10]); // convert
		expect(g.leaves).toHaveLength(1);
		expect(g.leaves[0].converted).toBe(true);
		g.undoLastBall();
		expect(g.humanFrames).toEqual([[9]]);
		expect(g.leaves).toHaveLength(0);
		expect(g.curStanding).toEqual([10]);
		g.undoLastBall();
		expect(g.humanFrames).toEqual([[]]);
	});
});

describe('tenth-frame second leave (AUDIT L5)', () => {
	it('records the leave after strike + partial ball 2', () => {
		g.startGame();
		// Jump straight to the tenth with nine strikes bowled
		g.humanFrames = Array.from({ length: 9 }, () => [10]).concat([[]]);
		g.curStanding = [...ALL];
		g.bowl(ALL); // strike
		g.bowl([1, 2, 3]); // leaves 7 pins standing for ball 3
		g.bowl([4, 5, 6, 7, 8, 9, 10]); // convert them
		const tenthLeave = g.leaves.find((l) => l.frame === 9);
		expect(tenthLeave).toBeDefined();
		expect(tenthLeave!.converted).toBe(true);
	});
});
