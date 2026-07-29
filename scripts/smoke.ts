import { createGame, listLegalActions, reduce, isLegal, type Action } from '../src/engine/index.ts'
import { chooseCpuAction } from '../src/ai/simple.ts'

let s = createGame(7)
let steps = 0
while (!s.winner && steps < 500) {
  const action: Action =
    s.activePlayer === 1 ? chooseCpuAction(s) : pickHumanish(s)
  if (!isLegal(s, action)) {
    console.error('illegal', action, listLegalActions(s))
    process.exit(1)
  }
  s = reduce(s, action)
  steps++
}
console.log({ steps, winner: s.winner, treats: s.players.map((p) => p.treats) })
if (!s.winner) process.exit(2)

function pickHumanish(state: typeof s): Action {
  const acts = listLegalActions(state)
  const scored = acts.map((a) => {
    if (a.type === 'END_TURN') return { a, s: state.players[state.activePlayer].energy === 0 && !state.players[state.activePlayer].field.some(d => !d.hasChallenged && (!d.summonedThisTurn || d.cardId === 'greyhound')) ? 5 : -1 }
    return { a, s: 3 + Math.random() }
  })
  scored.sort((x, y) => y.s - x.s)
  return scored[0]?.a ?? { type: 'END_TURN' }
}
