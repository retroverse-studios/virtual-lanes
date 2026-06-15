<script lang="ts">
	import { g } from './state.svelte';
	import Leaderboard from './Leaderboard.svelte';
	import { leaveLabel } from '$lib/engine/bowling';

	let rows = $derived(g.standings());
	let win = $derived(rows[0]);
	let solo = $derived(g.opponents.length === 0);
	let lv = $derived(g.leaves);
	let att = $derived(lv.length);
	let conv = $derived(lv.filter((x) => x.converted).length);
	let spl = $derived(lv.filter((x) => x.split).length);
</script>

<div class="page" style="padding-top:20px">
	<div style="text-align:center;margin-bottom:14px">
		<div style="font-size:24px;font-weight:800">{solo ? `Final · ${win.scratch}` : win.me ? 'You win! 🏆' : `${win.name.split(' ')[0]} wins`}</div>
		<div style="color:var(--dim);font-size:13px">{solo ? 'solo game' : g.useHcp ? 'with handicap' : 'scratch'}</div>
	</div>

	<Leaderboard />

	{#if att}
		<div class="sec" style="margin-top:16px">Your spares — {conv}/{att} ({Math.round((conv / att) * 100)}%) · {spl} split{spl === 1 ? '' : 's'}</div>
		<div class="lb">
			{#each lv as l (l.frame)}
				<div class="lbrow">
					<span class="rank">F{l.frame + 1}</span>
					<span class="who" style="color:var(--dim)">{l.standing.length ? leaveLabel(l.standing) : 'clean'}</span>
					<span style="font-size:13px;font-weight:700;color:{l.standing.length === 0 ? 'var(--dim)' : l.converted ? 'var(--me)' : 'var(--opp)'}">
						{l.standing.length === 0 ? '—' : l.converted ? 'spare ✓' : l.split ? 'split ✗' : 'open ✗'}
					</span>
				</div>
			{/each}
		</div>
	{/if}

	<button class="cta" style="margin-top:18px" onclick={() => g.reset()}>New bowl-off →</button>
</div>
