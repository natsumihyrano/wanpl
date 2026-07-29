import { canChallenge } from './legal'
import {
  effectiveDefense,
  effectivePower,
  getDef,
  initialCommandUses,
} from './helpers'
import { COMMAND_MAP, ELEMENT_MAP } from '../data/battle'
import type {
  CardInstance,
  FieldDog,
  GameState,
  PlayerId,
  PlayerState,
  PublicCommandView,
  PublicDogView,
  PublicState,
} from './types'

function commandViews(
  cardId: string,
  uses: Record<string, number>,
): PublicCommandView[] {
  const def = getDef(cardId)
  return def.commands.map((id) => {
    const cmd = COMMAND_MAP[id]
    return {
      id,
      name: cmd.name,
      text: cmd.text,
      uses: uses[id] ?? cmd.maxUses,
      maxUses: cmd.maxUses,
      kind: cmd.effect.kind,
    }
  })
}

function toView(
  dog: FieldDog,
  owner: PlayerState,
  howlActive: boolean,
): PublicDogView {
  const def = getDef(dog.cardId)
  return {
    instanceId: dog.instanceId,
    cardId: dog.cardId,
    lane: dog.lane,
    power: effectivePower(dog, owner),
    defense: effectiveDefense(dog, howlActive),
    cost: def.cost,
    name: def.name,
    abilityName: def.abilityName,
    abilityText: def.abilityText,
    ability: def.ability,
    hue: def.hue,
    element: def.element,
    elementName: ELEMENT_MAP[def.element].name,
    canChallenge: canChallenge(dog),
    summonedThisTurn: dog.summonedThisTurn,
    hasChallenged: dog.hasChallenged,
    tsunAvailable: dog.tsunAvailable,
    commands: commandViews(dog.cardId, dog.commandUses),
  }
}

function handView(
  cards: CardInstance[],
  show: boolean,
): PublicDogView[] | null {
  if (!show) return null
  return cards.map((c) => {
    const def = getDef(c.cardId)
    const uses = initialCommandUses(c.cardId, c.commandUses)
    return {
      instanceId: c.instanceId,
      cardId: c.cardId,
      lane: -1,
      power: def.power,
      defense: def.defense,
      cost: def.cost,
      name: def.name,
      abilityName: def.abilityName,
      abilityText: def.abilityText,
      ability: def.ability,
      hue: def.hue,
      element: def.element,
      elementName: ELEMENT_MAP[def.element].name,
      canChallenge: false,
      summonedThisTurn: false,
      hasChallenged: false,
      tsunAvailable: false,
      commands: commandViews(c.cardId, uses),
    }
  })
}

export function toPublicState(
  state: GameState,
  viewer: PlayerId | 'spectator',
  opts?: { revealHand?: PlayerId | 'both' },
): PublicState {
  const reveal = opts?.revealHand

  const players = [0, 1].map((i) => {
    const pid = i as PlayerId
    const p = state.players[pid]
    const showHand =
      reveal === 'both' ||
      reveal === pid ||
      (viewer !== 'spectator' && viewer === pid)

    return {
      treats: p.treats,
      energy: p.energy,
      maxEnergy: p.maxEnergy,
      deckCount: p.deck.length,
      handCount: p.hand.length,
      hand: handView(p.hand, showHand),
      field: [...p.field]
        .sort((a, b) => a.lane - b.lane)
        .map((d) => toView(d, p, state.howlActive)),
      guardCharges: p.guardCharges,
    }
  }) as PublicState['players']

  return {
    you: viewer === 'spectator' ? 0 : viewer,
    activePlayer: state.activePlayer,
    turn: state.turn,
    phase: state.phase,
    howlActive: state.howlActive,
    winner: state.winner,
    log: state.log.slice(-12),
    pendingHerding: state.pendingHerding,
    players,
  }
}
