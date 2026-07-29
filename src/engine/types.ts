import type { AbilityId } from '../data/dogs'
import type { CommandId, ElementId } from '../data/battle'

export type PlayerId = 0 | 1

export interface CardInstance {
  instanceId: string
  cardId: string
  /** 手札に戻ったときに持ち越す残り回数 */
  commandUses?: Record<string, number>
}

export interface FieldDog extends CardInstance {
  lane: number
  summonedThisTurn: boolean
  tsunAvailable: boolean
  hasChallenged: boolean
  /** コマンドごとの残り回数（PP） */
  commandUses: Record<string, number>
}

export interface PlayerState {
  treats: number
  energy: number
  maxEnergy: number
  deck: CardInstance[]
  hand: CardInstance[]
  field: FieldDog[]
  /** みきり残弾（相手ターンまで持ち越し可） */
  guardCharges: number
}

export type Phase = 'main' | 'ended'

export interface GameState {
  players: [PlayerState, PlayerState]
  activePlayer: PlayerId
  turn: number
  phase: Phase
  howlActive: boolean
  winner: PlayerId | null
  log: string[]
  pendingHerding: { player: PlayerId; corgiInstanceId: string } | null
  rngSeed: number
}

export type Action =
  | { type: 'SUMMON'; instanceId: string; lane: number }
  | {
      type: 'CHALLENGE'
      attackerInstanceId: string
      targetLane: number
      command: CommandId
    }
  | { type: 'REST'; instanceId: string; command: CommandId }
  | { type: 'HERDING_TARGET'; targetInstanceId: string }
  | { type: 'END_TURN' }

export interface PublicCommandView {
  id: CommandId
  name: string
  text: string
  uses: number
  maxUses: number
  kind: 'challenge' | 'rest'
}

export interface PublicDogView {
  instanceId: string
  cardId: string
  lane: number
  power: number
  defense: number
  cost: number
  name: string
  abilityName: string
  abilityText: string
  ability: AbilityId
  hue: number
  element: ElementId
  elementName: string
  canChallenge: boolean
  summonedThisTurn: boolean
  hasChallenged: boolean
  tsunAvailable: boolean
  commands: PublicCommandView[]
}

export interface PublicPlayerView {
  treats: number
  energy: number
  maxEnergy: number
  deckCount: number
  handCount: number
  hand: PublicDogView[] | null
  field: PublicDogView[]
  guardCharges: number
}

export interface PublicState {
  you: PlayerId
  activePlayer: PlayerId
  turn: number
  phase: Phase
  howlActive: boolean
  winner: PlayerId | null
  log: string[]
  pendingHerding: GameState['pendingHerding']
  players: [PublicPlayerView, PublicPlayerView]
}
