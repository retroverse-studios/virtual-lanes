// Keep the hero scorecard "live": every time the ball animation loops (another
// strike rolled), advance the mock game a frame, then start a fresh game.
const GAME = [
  { frame: 5, me: 107, opp: 98 },
  { frame: 6, me: 129, opp: 117 },
  { frame: 7, me: 148, opp: 127 },
  { frame: 8, me: 166, opp: 146 },
  { frame: 9, me: 187, opp: 155 },
]
let i = 0

const track = document.querySelector('.ball-track')
const totMe = document.getElementById('tot-me')
const totOpp = document.getElementById('tot-opp')
const note = document.querySelector('.lane-note')

if (track && totMe && totOpp && note) {
  track.addEventListener('animationiteration', () => {
    i = (i + 1) % GAME.length
    const g = GAME[i]
    totMe.textContent = g.me
    totOpp.textContent = g.opp
    note.textContent = `Frame ${g.frame} · house shot, oil ${g.frame < 7 ? 'starting to break down' : 'breaking down — time to move left?'}`
  })
}
