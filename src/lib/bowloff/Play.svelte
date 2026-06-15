<script lang="ts">
	import { g } from './state.svelte';
	import Leaderboard from './Leaderboard.svelte';
	import { glyphs, lastTotal, ALLPINS, PIN_ROWS } from '$lib/engine/bowling';

	let meTot = $derived(lastTotal(g.humanFrames));
	let solo = $derived(g.opponents.length === 0);
	let leader = $derived([...g.opponents].sort((a, b) => lastTotal(g.oppFrames(b)) - lastTotal(g.oppFrames(a)))[0]);
	let leadTot = $derived(leader ? lastTotal(g.oppFrames(leader)) : 0);
	let i = $derived(Math.min(g.curIdx, 9));
	let myG = $derived(glyphs(g.humanFrames[i] ?? [], i === 9).join(' ') || '·');
	let oppLast = $derived(leader && g.revealed > 0 ? glyphs(leader.game[g.revealed - 1], g.revealed - 1 === 9).join(' ') : '…');

	let lv = $derived(g.leaves);
	let att = $derived(lv.length);
	let conv = $derived(lv.filter((x) => x.converted).length);
	let spl = $derived(lv.filter((x) => x.split).length);
	let leaveLine = $derived(att ? `Spares ${conv}/${att} · ${Math.round((conv / att) * 100)}%${spl ? ` · ${spl} split${spl > 1 ? 's' : ''}` : ''}` : 'Tap the pins you knock down');

	let standing = $derived(g.curStanding);
	let knocked = $derived(g.deckKnocked);
	let allDown = $derived(knocked.length === standing.length);
</script>

<div class="play">
	{#if solo}
		<div class="hero solo"><div class="side me"><div class="lbl">YOU · {g.cond.alley}</div><div class="big">{meTot}</div></div></div>
		<div class="cards" style="grid-template-columns:1fr">
			<div class="fcard"><div class="cap">Your frame {i + 1}</div><div class="rollbig">{myG}</div><div class="pend">bowling…</div></div>
		</div>
	{:else}
		<div class="hero">
			<div class="side me"><div class="lbl">YOU</div><div class="big">{meTot}</div></div>
			<div class="vs">VS</div>
			<div class="side opp"><div class="lbl">{leader ? leader.bowler.name.split(' ')[0] : '—'} (lead)</div><div class="big">{leadTot}</div></div>
		</div>
		<div class="cards">
			<div class="fcard"><div class="cap">Your frame {i + 1}</div><div class="rollbig">{myG}</div><div class="pend">bowling…</div></div>
			<div class="fcard"><div class="cap">{leader ? leader.bowler.name.split(' ')[0] : ''} fr {Math.max(1, g.revealed)}</div><div class="rollbig">{oppLast}</div><div class="pend">{g.revealed > 0 ? 'revealed' : 'waiting'}</div></div>
		</div>
	{/if}

	<div class="leavestat">{leaveLine}</div>

	<div class="deck">
		{#each PIN_ROWS as row, ri (ri)}
			<div class="drow">
				{#each row as p (p)}
					{@const isS = standing.includes(p)}
					<button class="pin" class:gone={!isS} class:hit={knocked.includes(p)} disabled={!isS} onclick={() => g.togglePin(p)}>{p}</button>
				{/each}
			</div>
		{/each}
	</div>

	<div class="deckbtns">
		<button class="dbtn" onclick={() => (g.deckKnocked = [...standing])}>{g.curFrame.length === 0 ? 'Strike (all)' : 'Spare (all)'}</button>
		<button class="dbtn" onclick={() => (g.deckKnocked = [])}>Clear</button>
	</div>
	<button class="bowl" onclick={() => g.bowl([...knocked])}>Bowl — {knocked.length} down{allDown ? ' ✓' : ''}</button>

	<div class="lbwrap"><Leaderboard /></div>
</div>

<style>
	.play {
		padding: 12px 14px calc(20px + env(safe-area-inset-bottom));
	}
	.hero {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 6px;
		margin: 2px 0 10px;
	}
	.hero .side {
		text-align: center;
	}
	.hero .lbl {
		font-size: 11px;
		color: var(--dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.hero .big {
		font-size: 42px;
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.hero .me .big {
		color: var(--me);
	}
	.hero .opp .big {
		color: var(--opp);
	}
	.hero .vs {
		color: var(--dim);
		font-weight: 800;
	}
	.hero.solo {
		grid-template-columns: 1fr;
	}
	.cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-bottom: 8px;
	}
	.fcard {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 11px;
		text-align: center;
	}
	.fcard .cap {
		font-size: 11px;
		color: var(--dim);
	}
	.fcard .rollbig {
		font-size: 30px;
		font-weight: 800;
		letter-spacing: 4px;
		margin: 5px 0;
	}
	.fcard .pend {
		color: var(--dim);
		font-size: 12px;
		min-height: 16px;
	}
	.leavestat {
		text-align: center;
		font-size: 12px;
		color: var(--dim);
		margin-bottom: 4px;
	}
	.deck {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 6px 0;
	}
	.drow {
		display: flex;
		gap: 10px;
		justify-content: center;
	}
	.pin {
		width: 30px;
		height: 40px;
		border-radius: 50% 50% 45% 45%;
		background: #f4f6ff;
		border: 2px solid #c9d2ff;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #26314f;
		font-size: 11px;
		font-weight: 700;
	}
	.pin.gone {
		background: transparent;
		border-style: dashed;
		border-color: var(--line);
		color: var(--dim);
		opacity: 0.4;
	}
	.pin.hit {
		background: var(--me);
		border-color: var(--me);
		color: #063;
	}
	.deckbtns {
		display: flex;
		gap: 8px;
		margin-top: 6px;
	}
	.dbtn {
		flex: 1;
		background: var(--panel2);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 10px 0;
		font-weight: 700;
		color: var(--dim);
	}
	.bowl {
		width: 100%;
		background: var(--me);
		color: #062;
		font-weight: 800;
		border-radius: 14px;
		padding: 14px;
		text-align: center;
		font-size: 16px;
		margin-top: 8px;
	}
	.lbwrap {
		margin-top: 14px;
	}
</style>
