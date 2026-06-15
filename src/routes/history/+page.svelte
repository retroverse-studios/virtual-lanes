<script lang="ts">
	import { history } from '$lib/history.svelte';

	history.load();
	let games = $derived(history.games);
	let bowloffs = $derived(games.filter((g) => g.mode === 'bowloff'));
	let avg = $derived(bowloffs.length ? Math.round(bowloffs.reduce((s, g) => s + (g.score ?? 0), 0) / bowloffs.length) : 0);
	let best = $derived(bowloffs.length ? Math.max(...bowloffs.map((g) => g.score ?? 0)) : 0);
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
		<div class="summary">
			<div class="stat"><div class="v">{bowloffs.length}</div><div class="k">games</div></div>
			<div class="stat"><div class="v">{avg}</div><div class="k">avg</div></div>
			<div class="stat"><div class="v">{best}</div><div class="k">best</div></div>
		</div>

		{#each games as g (g.id)}
			<div class="gcard">
				<div class="top">
					<span class="mode">{g.mode === 'bowloff' ? '🎳 Bowl-off' : '📖 Journal'}</span>
					<span class="date">{fmt(g.date)}</span>
					<button class="del" aria-label="Delete game" onclick={() => history.remove(g.id)}>✕</button>
				</div>
				{#if g.mode === 'bowloff'}
					<div class="mid">
						<span class="score">{g.score}{g.usedHandicap && g.handicap ? ` (+${g.handicap})` : ''}</span>
						{#if g.result}<span class="res" style="color:{resultColor(g.result)}">{g.result.toUpperCase()}</span>{/if}
					</div>
					<div class="meta">
						{g.alley}{g.condition ? ` · ${g.condition.length}/${g.condition.volume}${g.condition.patternType === 'sport' ? ' · sport' : ''}` : ''}
						{#if g.spares?.attempts}· spares {g.spares.converted}/{g.spares.attempts}{g.spares.splits ? ` · ${g.spares.splits} split${g.spares.splits > 1 ? 's' : ''}` : ''}{/if}
					</div>
					{#if g.opponents?.length}
						<div class="vs">vs {g.opponents.map((o) => `${o.name.split(' ')[0]} ${o.score}`).join(' · ')}</div>
					{/if}
				{:else}
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
</div>

<style>
	.summary {
		display: flex;
		gap: 10px;
		margin: 6px 0 14px;
	}
	.stat {
		flex: 1;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 12px;
		text-align: center;
	}
	.stat .v {
		font-size: 24px;
		font-weight: 800;
		color: var(--accent);
	}
	.stat .k {
		font-size: 11px;
		color: var(--dim);
	}
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
