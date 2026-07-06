<script lang="ts">
	import { history } from '$lib/history.svelte';
	import StatsView from '$lib/StatsView.svelte';
	import type { GameRecord } from '$lib/engine/types';

	// Typed Record over the mode union: adding a mode (e.g. 'trace') won't compile
	// until this card knows how to label it.
	const MODE_LABEL: Record<GameRecord['mode'], string> = { bowloff: '🎳 Bowl-off', journal: '📖 Journal' };

	let games = $derived(history.games);
	let view = $state<'games' | 'stats'>('games');
	const readRate = (g: { shots?: { read: string }[] }) => {
		const j = (g.shots ?? []).filter((s) => s.read);
		return { matched: j.filter((s) => s.read === 'match').length, judged: j.length };
	};

	const fmt = (iso: string) => {
		const d = new Date(iso);
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	};
	const resultColor = (r?: string) => (r === 'win' ? 'var(--me)' : r === 'loss' ? 'var(--opp)' : 'var(--dim)');
</script>

<div class="page">
	<div style="display:flex;align-items:center;justify-content:space-between">
		<h1>📊 History</h1>
		{#if games.length}<button class="ghost" onclick={() => confirm('Clear all saved games?') && history.clear()}>Clear all</button>{/if}
	</div>

	{#if !games.length}
		<p class="lede">Every game you record lands here.</p>
		<div class="soon">No games yet — finish a bowl-off or a journal session and it’ll show up automatically.</div>
	{:else}
		<div class="seg" role="group" aria-label="History view" style="margin-bottom:12px">
			<button class:on={view === 'games'} aria-pressed={view === 'games'} onclick={() => (view = 'games')}>Games</button>
			<button class:on={view === 'stats'} aria-pressed={view === 'stats'} onclick={() => (view = 'stats')}>Stats</button>
		</div>

		{#if view === 'stats'}
			<StatsView {games} />
		{:else}

		{#each games as g (g.id)}
			<div class="gcard">
				<div class="top">
					<span class="mode">{MODE_LABEL[g.mode]}</span>
					<span class="date">{fmt(g.date)}</span>
					<button class="del" aria-label="Delete game" onclick={() => history.remove(g.id)}>✕</button>
				</div>
				{#if g.mode === 'bowloff'}
					<div class="mid">
						<span class="score">{g.score}{g.usedHandicap && g.handicap ? ` (+${g.handicap})` : ''}</span>
						{#if g.partial}<span class="res" style="color:var(--gold)">PARTIAL</span>{/if}
						{#if g.result}<span class="res" style="color:{resultColor(g.result)}">{g.result.toUpperCase()}</span>{/if}
					</div>
					<div class="meta">
						{g.alley}{g.condition ? ` · ${g.condition.length}/${g.condition.volume}${g.condition.patternType === 'sport' ? ' · sport' : ''}` : ''}
						{#if g.spares?.attempts}· spares {g.spares.converted}/{g.spares.attempts}{g.spares.splits ? ` · ${g.spares.splits} split${g.spares.splits > 1 ? 's' : ''}` : ''}{/if}
						{#if g.shots?.length}· 📝 {g.shots.length}{/if}
						{#if g.ball}· 🎳 {g.ball}{/if}
					</div>
					{#if g.ballChanges?.length}
						<div class="vs" style="color:var(--gold)">🔄 {g.ballChanges.filter((c) => c.frame > 0).map((c) => `${c.name} (F${c.frame + 1})`).join(' → ')}</div>
					{/if}
					{#if g.opponents?.length}
						<div class="vs">vs {g.opponents.map((o) => `${o.name.split(' ')[0]} ${o.score}`).join(' · ')}</div>
					{/if}
				{:else if g.mode === 'journal'}
					{@const rr = readRate(g)}
					<div class="mid">
						<span class="score">{g.shots?.length ?? 0}</span>
						<span class="res" style="color:var(--dim);font-weight:600">shot{(g.shots?.length ?? 0) === 1 ? '' : 's'}</span>
						{#if rr.judged}<span class="res" style="color:{rr.matched === rr.judged ? 'var(--me)' : 'var(--gold)'}">read {rr.matched}/{rr.judged}</span>{/if}
					</div>
					<div class="meta">{g.alley}{g.pattern ? ` · ${g.pattern}` : ''}{g.ball ? ` · ${g.ball}` : ''}</div>
				{/if}
			</div>
		{/each}
		{/if}
	{/if}
</div>

<style>
	.gcard {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 11px 12px;
		margin-bottom: 8px;
	}
	.top {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--dim);
	}
	.top .mode {
		font-weight: 700;
		color: var(--ink);
	}
	.top .date {
		flex: 1;
	}
	.del {
		color: var(--dim);
		font-size: 14px;
		padding: 2px 6px;
	}
	.mid {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin: 4px 0 2px;
	}
	.mid .score {
		font-size: 26px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.mid .res {
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.5px;
	}
	.meta {
		font-size: 11px;
		color: var(--dim);
	}
	.vs {
		font-size: 12px;
		color: var(--opp);
		margin-top: 4px;
	}
</style>
