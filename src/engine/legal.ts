import type { Action, FieldDog, GameState, PlayerId } from './types'
import { getDef, opponentOf, dogHasCommandUses } from './helpers'
import {
  isChallengeCommand,
  isRestCommand,
  COMMAND_MAP,
  type CommandId,
} from '../data/battle'

export function canChallenge(dog: {
  hasChallenged: boolean
  commandUses: Record<string, number>
}): boolean {
  if (dog.hasChallenged) return false
  return dogHasCommandUses(dog)
}

function hasUses(dog: FieldDog, command: CommandId): boolean {
  return (dog.commandUses[command] ?? 0) > 0
}

export function listLegalActions(state: GameState): Action[] {
  if (state.winner !== null || state.phase === 'ended') return []

  const pid = state.activePlayer
  const actions: Action[] = []

  if (state.pendingHerding) {
    if (state.pendingHerding.player !== pid) return []
    const opp = state.players[opponentOf(pid)]
    for (const d of opp.field) {
      if (getDef(d.cardId).ability === 'stubborn') continue
      if (getDef(d.cardId).ability === 'ward') continue
      actions.push({ type: 'HERDING_TARGET', targetInstanceId: d.instanceId })
    }
    if (actions.length === 0) {
      actions.push({ type: 'END_TURN' })
    }
    return actions
  }

  const p = state.players[pid]
  const taken = new Set(p.field.map((d) => d.lane))

  for (const card of p.hand) {
    const def = getDef(card.cardId)
    if (p.energy < def.cost) continue
    if (p.field.length >= 3) continue
    for (let lane = 0; lane < 3; lane++) {
      if (taken.has(lane)) continue
      actions.push({
        type: 'SUMMON',
        instanceId: card.instanceId,
        lane,
      })
    }
  }

  for (const dog of p.field) {
    if (!canChallenge(dog)) continue
    for (const command of getDef(dog.cardId).commands) {
      if (!hasUses(dog, command)) continue
      if (isRestCommand(command)) {
        actions.push({
          type: 'REST',
          instanceId: dog.instanceId,
          command,
        })
      } else if (isChallengeCommand(command)) {
        const effect = COMMAND_MAP[command].effect
        const opp = state.players[opponentOf(pid)]
        for (let lane = 0; lane < 3; lane++) {
          const occupied = opp.field.some((d) => d.lane === lane)
          if (effect.kind === 'challenge') {
            if (effect.onlyEmpty && occupied) continue
            if (effect.onlyDog && !occupied) continue
          }
          actions.push({
            type: 'CHALLENGE',
            attackerInstanceId: dog.instanceId,
            targetLane: lane,
            command,
          })
        }
      }
    }
  }

  actions.push({ type: 'END_TURN' })
  return actions
}

export function isLegal(state: GameState, action: Action): boolean {
  return listLegalActions(state).some((a) => actionsEqual(a, action))
}

export function onlyEndTurnLeft(state: GameState): boolean {
  if (state.winner !== null || state.phase === 'ended') return false
  if (state.pendingHerding) return false
  const actions = listLegalActions(state)
  return actions.length === 1 && actions[0]?.type === 'END_TURN'
}

function actionsEqual(a: Action, b: Action): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function legalForPlayer(state: GameState, player: PlayerId): Action[] {
  if (state.activePlayer !== player) return []
  return listLegalActions(state)
}

export { effectivePower } from './helpers'
