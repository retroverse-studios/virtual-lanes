<script lang="ts">
	import { g } from './state.svelte';
	import { STYLE_PRESETS, TIERS, styleShort } from '$lib/engine/personas';
	import { centres } from '$lib/centres.svelte';
	import { clamp } from '$lib/engine/bowling';
	import type { Attr } from '$lib/engine/types';

	function pickCentre(id: string) {
		const c = centres.available.find((x) => x.id === id);
		g.cond.centreId = id;
		if (c) g.cond.alley = c.name;
	}

	const styleOpts = Object.entries(STYLE_PRESETS).map(([k, v]) => ({ k, label: v.label }));
	function bars(a: Attr) {
		const rev01 = clamp((a.rev - 150) / 400, 0, 1);
		return [
			['PWR', 1 + rev01 * 4],
			['ACC', 1 + ((a.acc - 0.6) / 0.35) * 4],
			['CON', 1 + ((a.cons - 0.5) / 0.42) * 4]
		] as [string, number][];
	}
	const HCP = { scratch: 'Scratch', perBowler: 'Per bowler', percent: '% of diff' };

	let laneSummary = $derived(`${g.cond.alley} · ${g.cond.length}/${g.cond.volume}${g.cond.patternType === 'sport' ? ' · sport' : ''}`);
	let gameSummary = $derived(`${STYLE_PRESETS[g.human.styleKey].label} · ${g.human.avg} avg${g.human.handicap ? ` · hcp ${g.human.handicap}` : ''}`);
	let rivalSummary = $derived(
		g.selectedIds.length ? g.selectedIds.map((id) => g.roster.find((r) => r.id === id)?.name.split(' ')[0]).join(', ') : 'Solo — just track your game'
	);
	let advSummary = $derived(`${HCP[g.cfg.hcpMode]} · breakdown ${g.cfg.breakdown ? 'on' : 'off'} · ${g.cfg.laneMode === 'bySelection' ? 'this match' : g.cfg.laneMode}`);
</script>

<div class="page">
	<h1>Bowl-off</h1>
	<p class="lede">Defaults (and your last setup) are ready — just hit Start, or tap a section to tweak.</p>

	<details class="acc">
		<summary><div class="h">Lane &amp; conditions</div><div class="sum">{laneSummary}</div></summary>
		<div class="body">
			<div class="field"><label for="centre">Centre</label>
				<select id="centre" value={g.cond.centreId} onchange={(e) => pickCentre(e.currentTarget.value)}>
					{#each centres.available as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
				</select>
			</div>
			<a class="ghost" href="/centres" style="display:block;text-align:center;margin-bottom:10px">🏟 Manage centres</a>
			<div class="field">
				<span class="fl">Pattern length</span>
				<div class="seg" role="group" aria-label="Pattern length">
					{#each [['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']] as [v, l] (v)}
						<button class:on={g.cond.length === v} aria-pressed={g.cond.length === v} onclick={() => (g.cond.length = v as typeof g.cond.length)}>{l}</button>
					{/each}
				</div>
			</div>
			<div class="field">
				<span class="fl">Oil volume</span>
				<div class="seg" role="group" aria-label="Oil volume">
					{#each [['light', 'Light'], ['medium', 'Medium'], ['heavy', 'Heavy']] as [v, l] (v)}
						<button class:on={g.cond.volume === v} aria-pressed={g.cond.volume === v} onclick={() => (g.cond.volume = v as typeof g.cond.volume)}>{l}</button>
					{/each}
				</div>
			</div>
			<div class="field">
				<span class="fl">Pattern type</span>
				<div class="seg" role="group" aria-label="Pattern type">
					{#each [['house', 'House'], ['sport', 'Sport']] as [v, l] (v)}
						<button class:on={g.cond.patternType === v} aria-pressed={g.cond.patternType === v} onclick={() => (g.cond.patternType = v as typeof g.cond.patternType)}>{l}</button>
					{/each}
				</div>
			</div>
		</div>
	</details>

	<details class="acc">
		<summary><div class="h">Your game</div><div class="sum">{gameSummary}</div></summary>
		<div class="body">
			<div class="row2">
				<div class="field">
					<label for="hstyle">Your style</label>
					<select id="hstyle" bind:value={g.human.styleKey}>
						{#each styleOpts as o (o.k)}<option value={o.k}>{o.label}</option>{/each}
					</select>
				</div>
				<div class="field"><label for="havg">Your average</label><input id="havg" type="number" inputmode="numeric" bind:value={g.human.avg} /></div>
			</div>
			<div class="row2">
				<div class="field"><label for="hhcp">Your handicap</label><input id="hhcp" type="number" inputmode="numeric" bind:value={g.human.handicap} /></div>
				<div class="field">
					<span class="fl">Division</span>
					<div class="seg" role="group" aria-label="Division">
						{#each [['open', 'Open'], ['pba', 'PBA'], ['pwba', 'PWBA']] as [v, l] (v)}
						<button class:on={g.human.division === v} aria-pressed={g.human.division === v} onclick={() => (g.human.division = v as typeof g.human.division)}>{l}</button>
						{/each}
					</div>
				</div>
			</div>
			<div class="ball">🎳 Recommended ball: <b>{g.recommendedBall.name}</b> — {g.recommendedBall.why}.</div>
		</div>
	</details>

	<details class="acc">
		<summary><div class="h">Rivals ({g.selectedIds.length})</div><div class="sum">{rivalSummary}</div></summary>
		<div class="body">
			<a class="ghost" href="/rivals" style="display:block;text-align:center;margin-bottom:10px">✏️ Create / manage rivals</a>
			<div class="roster">
				{#each g.roster as p (p.id)}
					<button class="pcard" class:sel={g.selectedIds.includes(p.id)} onclick={() => g.toggleRival(p.id)}>
						<span class="pick">{g.selectedIds.includes(p.id) ? '✓' : '+'}</span>
						<div class="nm">{p.name}</div>
						<div class="st">{styleShort(p.styleKey)} · {TIERS[p.tier].label} · {p.division.toUpperCase()}{p.handicap ? ` · +${p.handicap}` : ''}</div>
						<div class="specs">{p.attr.rev} rpm · {p.attr.speed} mph</div>
						{#each bars(p.attr) as [lbl, v] (lbl)}
							<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--dim);margin-top:3px">
								<span style="width:30px">{lbl}</span>
								<span style="flex:1;height:5px;background:var(--panel2);border-radius:3px;overflow:hidden"><span style="display:block;height:100%;width:{clamp(v, 0, 5) * 20}%;background:var(--accent)"></span></span>
							</div>
						{/each}
						{#if p.scout}<div class="scout">{p.scout}</div>{/if}
					</button>
				{/each}
			</div>
		</div>
	</details>

	<details class="acc">
		<summary><div class="h">Advanced</div><div class="sum">{advSummary}</div></summary>
		<div class="body">
			<div class="field">
				<span class="fl">Handicap system</span>
				<div class="seg" role="group" aria-label="Handicap system">
					{#each [['scratch', 'Scratch'], ['perBowler', 'Per bowler'], ['percent', '% of diff']] as [v, l] (v)}
						<button class:on={g.cfg.hcpMode === v} aria-pressed={g.cfg.hcpMode === v} onclick={() => (g.cfg.hcpMode = v as typeof g.cfg.hcpMode)}>{l}</button>
					{/each}
				</div>
			</div>
			{#if g.cfg.hcpMode === 'percent'}
				<div class="row2">
					<div class="field"><label for="pct">Percent</label><input id="pct" type="number" bind:value={g.cfg.hcpPct} /></div>
					<div class="field"><label for="basis">Basis</label><input id="basis" type="number" bind:value={g.cfg.hcpBasis} /></div>
				</div>
			{:else if g.cfg.hcpMode === 'perBowler'}
				<p style="font-size:11px;color:var(--dim)">Uses each bowler's own handicap (set yours above; League Larry +50, Scratch Sam +13, pros 0).</p>
			{/if}
			<div class="field">
				<span class="fl">Lane oil breakdown</span>
				<div class="seg" role="group" aria-label="Lane oil breakdown">
					{#each [['on', 'On'], ['off', 'Off']] as [v, l] (v)}
						<button class:on={(g.cfg.breakdown ? 'on' : 'off') === v} aria-pressed={(g.cfg.breakdown ? 'on' : 'off') === v} onclick={() => (g.cfg.breakdown = v === 'on')}>{l}</button>
					{/each}
				</div>
			</div>
			<div class="field">
				<span class="fl">Whose traffic breaks it down?</span>
				<div class="seg" role="group" aria-label="Whose traffic breaks it down">
					{#each [['ignore', 'Ignore'], ['bySelection', 'This match'], ['manual', 'Set count']] as [v, l] (v)}
						<button class:on={g.cfg.laneMode === v} aria-pressed={g.cfg.laneMode === v} onclick={() => (g.cfg.laneMode = v as typeof g.cfg.laneMode)}>{l}</button>
					{/each}
				</div>
			</div>
			{#if g.cfg.laneMode === 'manual'}
				<div class="field"><label for="mc">Bowlers on the lane</label><input id="mc" type="number" inputmode="numeric" bind:value={g.cfg.manualCount} /></div>
			{/if}
		</div>
	</details>

	<button class="cta" style="margin-top:6px" onclick={() => g.startGame()}>
		{g.selectedIds.length ? `Start vs ${g.selectedIds.length} rival${g.selectedIds.length > 1 ? 's' : ''} →` : 'Start solo game →'}
	</button>
</div>
