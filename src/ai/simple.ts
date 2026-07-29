import {
  listLegalActions,
  reduce,
  getDef,
  opponentOf,
  type Action,
  type GameState,
} from '../engine'
import { effectiveDefense, effectivePower, critChance } from '../engine/helpers'
import { COMMAND_MAP, typeModifier } from '../data/battle'
import { STARTING_TREATS } from '../engine/helpers'

function scoreAction(state: GameState, action: Action): number {
  const pid = state.activePlayer

  if (action.type === 'END_TURN') {
    const productive = listLegalActions(state).some((a) => a.type !== 'END_TURN')
    return productive ? -50 : 1
  }

  const next = reduce(state, action)
  const me = next.players[pid]
  const opp = next.players[opponentOf(pid)]
  const beforeMe = state.players[pid]
  const beforeOpp = state.players[opponentOf(pid)]

  let score = 0
  score += (beforeOpp.treats - opp.treats) * 14
  score += (me.treats - beforeMe.treats) * 11
  if (next.winner === pid) score += 1000
  if (next.winner === opponentOf(pid)) score -= 1000

  if (action.type === 'SUMMON') {
    const card = state.players[pid].hand.find(
      (c) => c.instanceId === action.instanceId,
    )
    if (card) {
      const def = getDef(card.cardId)
      score += 8 + def.power * 2 + def.defense + (5 - def.cost)
      if (def.ability === 'herding') score += 10
      if (def.ability === 'nibble') score += 9
      if (def.ability === 'rally') score += 10
      if (def.ability === 'howl' || def.ability === 'blizzard') score += 8
      if (def.ability === 'barrel' || def.ability === 'swim') score += 6
      if (def.ability === 'cheer') score += 7
      if (def.ability === 'spots') score += 5
      if (def.ability === 'gale') score += 6
      if (def.ability === 'ghost') score += 5
      if (def.ability === 'silent' && (state.howlActive || state.foeHowlOwner != null))
        score += 6
      if (def.ability === 'silk') score += 4
      if (def.ability === 'ward') score += 7
      if (def.ability === 'gentle') score += 3
      if (def.ability === 'fight') score += 4
      if (def.ability === 'aloof') score += 3
      if (def.ability === 'nurse') score += 6
      if (def.ability === 'comeback') {
        score += 3
        if (beforeMe.treats <= Math.floor(STARTING_TREATS / 2)) score += 6
      }
    }
    if (
      !state.players[opponentOf(pid)].field.some((d) => d.lane === action.lane)
    ) {
      score += 5
    }
  }

  if (action.type === 'REST') {
    const atk = state.players[pid].field.find(
      (d) => d.instanceId === action.instanceId,
    )
    const cmd = COMMAND_MAP[action.command]
    const effect = cmd.effect
    if (effect.kind === 'rest' && atk) {
      const def = getDef(atk.cardId)
      let treats = effect.treats ?? 0
      let energy = effect.energy ?? 0
      if (
        effect.elementTreatBonus &&
        def.element === effect.elementTreatBonus.element
      ) {
        treats += effect.elementTreatBonus.treats
      }
      if (
        effect.elementEnergyBonus &&
        def.element === effect.elementEnergyBonus.element
      ) {
        energy += effect.elementEnergyBonus.energy
      }
      if (
        effect.behindTreats &&
        beforeMe.treats <= Math.floor(STARTING_TREATS / 2)
      ) {
        treats += effect.behindTreats
      }
      if (treats) score += 8 + treats * 5 + (STARTING_TREATS - beforeMe.treats) * 0.25
      if (effect.guardCharges) {
        score += beforeOpp.field.length >= 1 ? 9 : 2
      }
      if (energy) score += 5 + energy * 3
    }
  }

  if (action.type === 'CHALLENGE') {
    const atk = state.players[pid].field.find(
      (d) => d.instanceId === action.attackerInstanceId,
    )
    const cmd = COMMAND_MAP[action.command]
    const effect = cmd.effect
    if (atk && effect.kind === 'challenge') {
      let power =
        effectivePower(atk, state.players[pid]) + (effect.powerBonus ?? 0)
      const target = state.players[opponentOf(pid)].field.find(
        (d) => d.lane === action.targetLane,
      )
      if (!target) {
        // engine: silk ? power : max(1, power - 1) + emptyBonus + spots − guard
        const atkDef = getDef(atk.cardId)
        let emptyDmg =
          (atkDef.ability === 'silk'
            ? Math.max(1, power)
            : Math.max(1, power - 1)) + (effect.emptyBonus ?? 0)
        if (
          state.players[pid].field.some(
            (d) => getDef(d.cardId).ability === 'spots',
          )
        ) {
          emptyDmg += 1
        }
        if (
          state.players[opponentOf(pid)].field.some(
            (d) => getDef(d.cardId).ability === 'guard',
          )
        ) {
          emptyDmg = Math.max(0, emptyDmg - 1)
        }
        score += 20 + emptyDmg * 6
        if ((effect.emptyBonus ?? 0) > 0) score += 4
        if (atkDef.ability === 'loot') score += 5
        if (atkDef.ability === 'silk') score += 4
      } else {
        let defense = effectiveDefense(target, state.howlActive, {
          foeHowlOwner: state.foeHowlOwner,
          ownerId: opponentOf(pid),
        })
        const tdef = getDef(target.cardId)
        const adef = getDef(atk.cardId)
        let pwr = power + typeModifier(adef.element, tdef.element)
        if (adef.ability === 'track' || adef.ability === 'gale') {
          defense = Math.max(0, defense - 1)
        }
        if ((effect.pierce ?? 0) > 0) {
          defense = Math.max(0, defense - (effect.pierce ?? 0))
        }
        if (tdef.ability === 'alert') pwr = Math.max(0, pwr - 1)
        const ghostTie = adef.ability === 'ghost' && pwr === defense
        if (pwr > defense || ghostTie) {
          score += 18 + (pwr - defense) * 5
          if (ghostTie) score += 10
          if (adef.ability === 'trophy' || adef.ability === 'dig') score += 4
        } else {
          const deficit = defense - pwr
          const chance =
            tdef.ability === 'gentle' ? 0 : critChance(deficit)
          score += -12 * (1 - chance) + (14 + chance * 8) * chance
          if (tdef.ability === 'grit') score -= 3 * (1 - chance)
          if (tdef.ability === 'blue_tongue') score -= 5 * (1 - chance)
          if (adef.ability === 'fight') score += 6
        }
        if ((effect.emptyBonus ?? 0) > 0) score -= 3
      }
    }
  }

  if (action.type === 'HERDING_TARGET') {
    const t = state.players[opponentOf(pid)].field.find(
      (d) => d.instanceId === action.targetInstanceId,
    )
    if (t) {
      const def = getDef(t.cardId)
      score += 12 + def.power * 3 + def.defense * 2
    }
  }

  score += (me.field.length - beforeMe.field.length) * 5
  score += (beforeOpp.field.length - opp.field.length) * 7
  return score
}

export function chooseCpuAction(state: GameState): Action {
  const legal = listLegalActions(state)
  if (legal.length === 0) return { type: 'END_TURN' }

  let best = legal[legal.length - 1]
  let bestScore = -Infinity
  for (const a of legal) {
    const s = scoreAction(state, a) + Math.random() * 0.3
    if (s > bestScore) {
      bestScore = s
      best = a
    }
  }
  return best
}
