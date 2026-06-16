<div class="page">
	<h1>🎥 Trace <span class="badge">coming soon</span></h1>
	<p class="lede">Film a shot and let the app track the ball — see what actually happened, not just what you read.</p>

	<figure class="mock">
		<svg viewBox="0 0 130 300" role="img" aria-label="Mock top-down lane with a hooking ball track">
			<!-- lane -->
			<rect x="15" y="10" width="100" height="280" rx="3" fill="#0d1326" stroke="var(--line)" />
			<!-- board lines -->
			{#each [27.5, 40, 52.5, 65, 77.5, 90, 102.5] as bx}
				<line x1={bx} y1="10" x2={bx} y2="290" stroke="#1d2640" />
			{/each}
			<!-- arrows (15 ft) -->
			{#each [33, 46, 59, 72, 85, 98] as ax}
				<path d={`M${ax} 224 l3 6 l-6 0 z`} fill="#2b3556" />
			{/each}
			<!-- pins (top) -->
			{#each [[70, 22], [64, 30], [76, 30], [58, 38], [70, 38], [82, 38], [52, 46], [64, 46], [76, 46], [88, 46]] as [px, py]}
				<circle cx={px} cy={py} r="2.4" fill="#3a466e" />
			{/each}
			<!-- pocket marker -->
			<rect x="66" y="14" width="8" height="4" rx="1.5" fill="#ff7a59" />
			<!-- ball track: lay down right, break, hook to pocket -->
			<path
				d="M84 288 C96 222 104 152 99 118 C95 80 80 40 70 24"
				fill="none"
				stroke="var(--me)"
				stroke-width="2.6"
				stroke-linecap="round"
			/>
			<circle cx="84" cy="288" r="4" fill="var(--gold)" />
			<circle cx="99" cy="118" r="4" fill="var(--gold)" />
			<circle cx="70" cy="24" r="4" fill="var(--gold)" />
			<!-- labels -->
			<text x="90" y="285" class="lbl">laydown</text>
			<text x="104" y="120" class="lbl">breakpoint</text>
			<text x="40" y="26" class="lbl" text-anchor="end">entry / pocket</text>
		</svg>
		<figcaption>Sketch of the output — your real track and boards will differ.</figcaption>
	</figure>

	<div class="soon">
		<strong>The plan</strong>
		<ul>
			<li>Set your phone down the lane and record (slow-mo clip works best), then import it.</li>
			<li>Using the lane's known geometry (39 boards, 60 ft), warp the view to a true top-down.</li>
			<li>Auto-track the ball → <strong>laydown · breakpoint · entry angle · pocket</strong>, drawn as a top-down path (early / mid / backend).</li>
			<li><strong>Ball speed</strong> from frame timing. <strong>Revs</strong> estimated (hard on a solid-colour ball).</li>
			<li>The real value is <strong>relative</strong>: compare a shot to your own averages — "breakpoint 3 boards tighter than usual."</li>
		</ul>
		<p style="margin:8px 0 0">Trace shots will save to the same history as Bowl-off and Journal, so a tracked path can sit alongside the shot you journaled.</p>
	</div>
</div>

<style>
	.badge {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--gold);
		border: 1px solid var(--gold);
		border-radius: 999px;
		padding: 2px 8px;
		vertical-align: middle;
		margin-left: 6px;
	}
	.soon ul {
		margin: 10px 0 0;
		padding-left: 18px;
		line-height: 1.5;
	}
	.soon li {
		margin-bottom: 6px;
	}
	.mock {
		margin: 16px 0;
		text-align: center;
	}
	.mock svg {
		max-width: 220px;
		width: 100%;
		height: auto;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 8px;
	}
	.mock :global(.lbl) {
		fill: var(--dim);
		font-size: 7px;
		font-family: inherit;
	}
	.mock figcaption {
		color: var(--dim);
		font-size: 12px;
		margin-top: 6px;
	}
</style>
