<div class="topbar">
	<a class="back" href="/settings">←</a>
	<span class="tag">HELP</span>
</div>

<div class="page">
	<h1>Getting started</h1>
	<p class="lede">VirtualLanes is your bowling companion — compete, journal your shots, and track your stats. Everything stays on your phone (no account).</p>

	<div class="sec">Install it like an app</div>
	<div class="card">
		<b>iPhone (Safari):</b> tap the Share button → <b>Add to Home Screen</b>.<br />
		<b>Android (Chrome):</b> menu (⋮) → <b>Install app</b> / Add to Home Screen.<br />
		It then opens full-screen and works offline.
	</div>

	<div class="sec">What to try</div>
	<div class="card">
		<ol>
			<li><b>Bowl-off</b> — pick conditions &amp; rivals (or go solo), then bowl: tap the pins you knock down each ball.</li>
			<li><b>📝 Note a frame</b> — after an interesting frame, tap “Note frame” and jot what you saw / adjusted.</li>
			<li><b>🔄 Switch ball</b> — change balls mid-game; it's recorded.</li>
			<li><b>Journal tab</b> — while a game's on, tap any frame to annotate it.</li>
			<li><b>History → Stats</b> — see your average, strike %, spare/makable %, and breakdowns by pattern / ball / centre.</li>
			<li><b>Settings</b> — your profile, and your <b>Arsenal</b> (balls), <b>Rivals</b>, and <b>Centres</b>.</li>
		</ol>
	</div>

	<div class="sec">Sending feedback</div>
	<div class="card">
		Your games are stored only on this device. To share what you've recorded (or move to a new phone):
		<b>Settings → Data → Export backup</b> saves a file — send it along with any notes on what felt good or broke.
	</div>

	<div class="sec">The modes</div>
	<div class="card">
		🎳 <b>Bowl-off</b> — bowl real frames vs a simulated rival (or solo for stats).<br />
		📖 <b>Journal</b> — record what you saw / decided / happened.<br />
		🎥 <b>Trace</b> — <i>coming soon</i>: film a shot and auto-track the ball.<br />
		🏃 <b>Form</b> — <i>coming soon</i>: film your approach and track your body — swing plane, posture, footwork.
	</div>

	<p class="hint">Thanks for testing 🙏</p>
</div>

<style>
	.topbar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-bottom: 1px solid var(--line);
		position: sticky;
		top: 0;
		background: var(--bg);
		z-index: 5;
	}
	.back {
		font-size: 18px;
		color: var(--ink);
		padding: 0 4px;
	}
	.tag {
		font-weight: 700;
		letter-spacing: 0.5px;
	}
	.card {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 12px 14px;
		font-size: 14px;
		line-height: 1.5;
		color: var(--ink);
	}
	.card ol {
		margin: 0;
		padding-left: 18px;
	}
	.card li {
		margin-bottom: 7px;
	}
	.hint {
		text-align: center;
		color: var(--dim);
		font-size: 13px;
		margin-top: 14px;
	}
</style>
