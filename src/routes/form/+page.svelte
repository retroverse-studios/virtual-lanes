<div class="page">
	<h1>🏃 Form <span class="badge">coming soon</span></h1>
	<p class="lede">Film your approach and let the app track your body — see your swing plane, posture and footwork, step by step.</p>

	<figure class="mock">
		<svg viewBox="0 0 200 240" role="img" aria-label="Mock pose skeleton at release with the swing-plane arc">
			<!-- swing-plane arc (the pendulum the arm travels) -->
			<path
				d="M150 40 C168 90 150 150 88 150 C30 150 24 90 40 46"
				fill="none"
				stroke="var(--gold)"
				stroke-width="2"
				stroke-dasharray="4 4"
				opacity="0.9"
			/>
			<!-- skeleton bones -->
			<g stroke="var(--me)" stroke-width="3" stroke-linecap="round" fill="none">
				<!-- spine (highlighted) -->
				<line x1="110" y1="128" x2="92" y2="60" stroke="var(--violet)" stroke-width="4" />
				<!-- shoulders to hips frame -->
				<line x1="92" y1="60" x2="110" y2="128" />
				<!-- bowling arm (the swing) -->
				<line x1="92" y1="62" x2="82" y2="100" />
				<line x1="82" y1="100" x2="74" y2="138" />
				<!-- balance arm -->
				<line x1="96" y1="62" x2="118" y2="78" />
				<line x1="118" y1="78" x2="138" y2="72" />
				<!-- slide (front) leg -->
				<line x1="110" y1="128" x2="92" y2="168" />
				<line x1="92" y1="168" x2="76" y2="205" />
				<line x1="76" y1="205" x2="62" y2="210" />
				<!-- trail (back) leg -->
				<line x1="110" y1="128" x2="130" y2="166" />
				<line x1="130" y1="166" x2="144" y2="200" />
				<line x1="144" y1="200" x2="156" y2="196" />
			</g>
			<!-- head -->
			<circle cx="95" cy="34" r="12" fill="none" stroke="var(--me)" stroke-width="3" />
			<!-- joints -->
			{#each [[92, 60], [96, 62], [110, 128], [82, 100], [74, 138], [118, 78], [138, 72], [92, 168], [76, 205], [130, 166], [144, 200]] as [jx, jy]}
				<circle cx={jx} cy={jy} r="3.4" fill="var(--violet)" />
			{/each}
			<!-- labels -->
			<text x="170" y="38" class="lbl" text-anchor="end">swing plane</text>
			<text x="118" y="96" class="lbl">spine tilt</text>
			<text x="60" y="150" class="lbl" text-anchor="end">release</text>
		</svg>
		<figcaption>Sketch — skeleton overlay + swing arc; real read-outs come from your clip.</figcaption>
	</figure>

	<div class="soon">
		<strong>The plan</strong>
		<ul>
			<li>Film your approach (down the lane or side-on; slow-mo works best), then import it — same as Trace.</li>
			<li>On-device pose tracking finds your joints each frame — no clip ever leaves your phone.</li>
			<li>Auto-split the approach into <strong>positions</strong>: stance · pushaway · steps 1–4 · release, captured as still frames you can flick between.</li>
			<li>See the read-outs: <strong>swing-plane arc · spine tilt · hip turn · knee bend · timing</strong> — with a toggleable skeleton overlay.</li>
			<li>The real value is <strong>relative</strong>: compare today's approach to your own — "swing drifted 4° flatter than usual" or "release a beat early."</li>
		</ul>
		<p style="margin:8px 0 0">Form clips will save to the same history as Bowl-off, Journal and Trace — so how you moved can sit beside what the ball did and what you journaled.</p>
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
		max-width: 240px;
		width: 100%;
		height: auto;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 8px;
	}
	.mock :global(.lbl) {
		fill: var(--dim);
		font-size: 10px;
		font-family: inherit;
	}
	.mock figcaption {
		color: var(--dim);
		font-size: 12px;
		margin-top: 6px;
	}
</style>
