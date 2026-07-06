// Aggregate bowling stats computed from stored GameRecords (works retroactively).
import type { BowloffRecord, GameRecord, JournalRecord } from '$lib/engine/types';

export interface Group {
	key: string;
	count: number;
	avg: number;
	sparePct: number;
}
export interface Stats {
	games: number;
	avg: number;
	high: number;
	low: number;
	lastScore: number;
	strikePct: number;
	firstBallAvg: number;
	openRate: number;
	cleanGames: number;
	spareAtt: number;
	spareConv: number;
	sparePct: number;
	splitCount: number;
	splitRate: number;
	makableAtt: number;
	makableConv: number;
	makablePct: number;
	trend: number[];
	leftPins: { pin: number; count: number; made: number }[];
	byPattern: Group[];
	byVolume: Group[];
	byLength: Group[];
	byBall: Group[];
	byCentre: Group[];
	byApproach: Group[];
	journalGames: number;
	readMatched: number;
	readJudged: number;
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export function computeStats(all: GameRecord[]): Stats {
	const bg = all
		.filter((g): g is BowloffRecord => g.mode === 'bowloff' && !!g.frames?.length && !g.partial)
		.slice()
		.sort((a, b) => (a.date < b.date ? -1 : 1));
	const scores = bg.map((g) => g.score ?? 0);
	const games = bg.length;
	const sum = scores.reduce((s, x) => s + x, 0);

	let frameCount = 0,
		strikes = 0,
		firstBallSum = 0,
		openTotal = 0,
		cleanGames = 0;
	let spareAtt = 0,
		spareConv = 0,
		splitCount = 0,
		makableAtt = 0,
		makableConv = 0;
	const leftCount: Record<number, number> = {};
	const leftMade: Record<number, number> = {};

	for (const g of bg) {
		let openThis = 0;
		for (const f of g.frames ?? []) {
			if (!f || !f.length) continue;
			frameCount++;
			firstBallSum += f[0];
			const isStrike = f[0] === 10;
			if (isStrike) strikes++;
			const isSpare = !isStrike && f.length >= 2 && f[0] + f[1] === 10;
			if (!isStrike && !isSpare && f.length >= 2) openThis++;
		}
		if (openThis === 0) cleanGames++;
		openTotal += openThis;
		for (const lv of g.leaves ?? []) {
			spareAtt++;
			if (lv.converted) spareConv++;
			if (lv.split) splitCount++;
			else {
				makableAtt++;
				if (lv.converted) makableConv++;
			}
			for (const p of lv.standing) {
				leftCount[p] = (leftCount[p] ?? 0) + 1;
				if (lv.converted) leftMade[p] = (leftMade[p] ?? 0) + 1;
			}
		}
	}

	const group = (key: (g: BowloffRecord) => string): Group[] => {
		const m = new Map<string, BowloffRecord[]>();
		for (const g of bg) {
			const k = key(g);
			if (!m.has(k)) m.set(k, []);
			m.get(k)!.push(g);
		}
		return [...m.entries()]
			.map(([k, gs]) => {
				const sc = gs.map((x) => x.score ?? 0);
				let att = 0,
					conv = 0;
				for (const x of gs) for (const lv of x.leaves ?? []) (att++, lv.converted && conv++);
				return { key: k, count: gs.length, avg: Math.round(sc.reduce((s, x) => s + x, 0) / gs.length), sparePct: pct(conv, att) };
			})
			.sort((a, b) => b.count - a.count);
	};

	const jg = all.filter((g): g is JournalRecord => g.mode === 'journal');
	let readMatched = 0,
		readJudged = 0;
	for (const g of [...jg, ...bg])
		for (const s of g.shots ?? []) {
			if (s.read) {
				readJudged++;
				if (s.read === 'match') readMatched++;
			}
		}

	return {
		games,
		avg: games ? Math.round(sum / games) : 0,
		high: games ? Math.max(...scores) : 0,
		low: games ? Math.min(...scores) : 0,
		lastScore: games ? scores[scores.length - 1] : 0,
		strikePct: pct(strikes, frameCount),
		firstBallAvg: frameCount ? Math.round((firstBallSum / frameCount) * 10) / 10 : 0,
		openRate: pct(openTotal, frameCount),
		cleanGames,
		spareAtt,
		spareConv,
		sparePct: pct(spareConv, spareAtt),
		splitCount,
		splitRate: pct(splitCount, spareAtt),
		makableAtt,
		makableConv,
		makablePct: pct(makableConv, makableAtt),
		trend: scores,
		leftPins: Object.keys(leftCount)
			.map((k) => ({ pin: +k, count: leftCount[+k], made: leftMade[+k] ?? 0 }))
			.sort((a, b) => b.count - a.count),
		byPattern: group((g) => g.condition?.patternType ?? '—'),
		byVolume: group((g) => g.condition?.volume ?? '—'),
		byLength: group((g) => g.condition?.length ?? '—'),
		byBall: group((g) => g.ball ?? '—'),
		byCentre: group((g) => g.centre?.name ?? '—'),
		byApproach: group((g) => g.centre?.approachFeel ?? '—'),
		journalGames: jg.length,
		readMatched,
		readJudged
	};
}
