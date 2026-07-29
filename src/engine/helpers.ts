import { DEAL_POOL, DOG_MAP } from '../data/dogs'
import { COMMAND_MAP, type CommandId } from '../data/battle'
import type {
  CardInstance,
  FieldDog,
  GameState,
  PlayerId,
  PlayerState,
} from './types'

/** 初期おやつ（コマンドが強いので余裕を持たせる） */
export const STARTING_TREATS = 30

let idCounter = 0

export function resetIdCounter(n = 0) {
  idCounter = n
}

export function nextId(prefix = 'c'): string {
  idCounter += 1
  return `${prefix}${idCounter}`
}

/** mulberry32 */
export function nextRng(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { value, seed: t >>> 0 }
}

/**
 * 守りに届かないときのクリティカル率（deficit = D − P ≥ 1）。
 * 1差 22% / 2差 12% / それ以上 6%
 */
export function critChance(deficit: number): number {
  if (deficit <= 0) return 0
  if (deficit === 1) return 0.22
  if (deficit === 2) return 0.12
  return 0.06
}

export function shuffle<T>(arr: T[], seed: number): { arr: T[]; seed: number } {
  const out = [...arr]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextRng(s)
    s = r.seed
    const j = Math.floor(r.value * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return { arr: out, seed: s }
}

function makeDeck(cardIds: string[]): CardInstance[] {
  return cardIds.map((cardId) => ({
    instanceId: nextId('d'),
    cardId,
  }))
}

function emptyPlayer(deck: CardInstance[]): PlayerState {
  return {
    treats: STARTING_TREATS,
    energy: 0,
    maxEnergy: 0,
    deck,
    hand: [],
    field: [],
    guardCharges: 0,
  }
}

export function getDef(cardId: string) {
  const d = DOG_MAP[cardId]
  if (!d) throw new Error(`Unknown card ${cardId}`)
  return d
}

/** 召喚時／手札復帰時のコマンド残り回数を組み立てる */
export function initialCommandUses(
  cardId: string,
  existing?: Record<string, number>,
): Record<string, number> {
  const def = getDef(cardId)
  const uses: Record<string, number> = {}
  for (const id of def.commands) {
    const max = COMMAND_MAP[id].maxUses
    const kept = existing?.[id]
    uses[id] = kept !== undefined ? Math.min(kept, max) : max
  }
  return uses
}

export function dogHasCommandUses(dog: {
  commandUses: Record<string, number>
}): boolean {
  return Object.values(dog.commandUses).some((n) => n > 0)
}

export function spendCommandUse(dog: FieldDog, command: CommandId): boolean {
  const left = dog.commandUses[command] ?? 0
  if (left <= 0) return false
  dog.commandUses[command] = left - 1
  return true
}

export function effectiveDefense(
  dog: FieldDog,
  howlActive: boolean,
  opts?: { foeHowlOwner?: PlayerId | null; ownerId?: PlayerId },
): number {
  const def = getDef(dog.cardId)
  let d = def.defense
  if (def.ability === 'silent') {
    return Math.max(0, d)
  }
  if (howlActive) {
    d -= 1
  } else if (
    opts?.foeHowlOwner != null &&
    opts.ownerId != null &&
    opts.ownerId === opponentOf(opts.foeHowlOwner)
  ) {
    d -= 1
  }
  return Math.max(0, d)
}

export function effectivePower(
  dog: FieldDog,
  owner: PlayerState,
): number {
  const def = getDef(dog.cardId)
  let bonus = 0
  for (const ally of owner.field) {
    if (ally.instanceId === dog.instanceId) continue
    if (getDef(ally.cardId).ability === 'cheer') bonus += 1
  }
  if (def.ability === 'sprint' || def.ability === 'gale') bonus += 1
  if (def.ability === 'aloof' && owner.field.length === 1) bonus += 1
  return def.power + bonus
}

export function hasGuard(player: PlayerState): boolean {
  return player.field.some((d) => getDef(d.cardId).ability === 'guard')
}

export function hasSpots(player: PlayerState): boolean {
  return player.field.some((d) => getDef(d.cardId).ability === 'spots')
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state)
}

export function opponentOf(p: PlayerId): PlayerId {
  return p === 0 ? 1 : 0
}

export function drawCards(
  player: PlayerState,
  n: number,
  log: string[],
  who: string,
): void {
  for (let i = 0; i < n; i++) {
    if (player.deck.length === 0) {
      log.push(`${who}の山札がなく、ドローできない`)
      break
    }
    if (player.hand.length >= 5) {
      const burned = player.deck.shift()!
      log.push(`${who}の手札が上限のため ${getDef(burned.cardId).name} を捨てた`)
      continue
    }
    const card = player.deck.shift()!
    player.hand.push(card)
    log.push(`${who}は ${getDef(card.cardId).name} を引いた`)
  }
}

export function startTurn(state: GameState): GameState {
  const s = cloneState(state)
  const p = s.players[s.activePlayer]
  const who = s.activePlayer === 0 ? 'P1' : 'P2'
  p.maxEnergy = Math.min(5, p.maxEnergy + 1)
  p.energy = p.maxEnergy
  for (const d of p.field) {
    d.summonedThisTurn = false
    d.hasChallenged = false
  }
  drawCards(p, 1, s.log, who)
  s.phase = 'main'
  s.pendingHerding = null
  return s
}

export function createGame(seed = Date.now() >>> 0): GameState {
  resetIdCounter(0)
  let s = seed
  const pool = makeDeck(DEAL_POOL)
  const shuffled = shuffle(pool, s)
  s = shuffled.seed
  const half = Math.floor(shuffled.arr.length / 2)
  const deckA = shuffled.arr.slice(0, half)
  const deckB = shuffled.arr.slice(half, half * 2)

  const state: GameState = {
    players: [emptyPlayer(deckA), emptyPlayer(deckB)],
    activePlayer: 0,
    turn: 1,
    phase: 'main',
    howlActive: false,
    foeHowlOwner: null,
    winner: null,
    log: ['Wanpl 開始！山札を配って公園勝負'],
    pendingHerding: null,
    rngSeed: s,
    fx: null,
  }

  // 後攻補正: 初期元気の土台 + 手札+1
  state.players[1].maxEnergy = 1

  drawCards(state.players[0], 3, state.log, 'P1')
  drawCards(state.players[1], 4, state.log, 'P2')
  return startTurn(state)
}

export function checkWinner(state: GameState): GameState {
  const s = cloneState(state)
  if (s.players[0].treats <= 0 && s.players[1].treats <= 0) {
    s.winner = s.activePlayer
    s.phase = 'ended'
    s.log.push('同時におやつ切れ！手番側の勝ち')
  } else if (s.players[0].treats <= 0) {
    s.winner = 1
    s.phase = 'ended'
    s.log.push('P2の勝ち！')
  } else if (s.players[1].treats <= 0) {
    s.winner = 0
    s.phase = 'ended'
    s.log.push('P1の勝ち！')
  }
  return s
}
