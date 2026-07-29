import { getDef, onlyEndTurnLeft, type GameState, type PlayerId } from '../engine'
import type { CommandId } from '../data/battle'

export type SelectMode =
  | { kind: 'none' }
  | { kind: 'summon'; instanceId: string }
  | { kind: 'field'; instanceId: string }
  | { kind: 'challenge'; attackerId: string; command: CommandId }

export function getTurnHint(
  state: GameState,
  viewer: PlayerId,
  select: SelectMode,
  opts?: { waitingOpponent?: boolean },
): string {
  if (state.winner !== null) return ''
  if (opts?.waitingOpponent || state.activePlayer !== viewer) {
    return '相手の番です…'
  }

  if (state.pendingHerding?.player === viewer) {
    return '牧畜：相手の犬をタップして控えに戻そう'
  }

  if (select.kind === 'summon') {
    return '自分の空きレーンをタップして召喚'
  }
  if (select.kind === 'field') {
    return 'この犬のコマンドを選ぼう（残り回数に注意）'
  }
  if (select.kind === 'challenge') {
    return '相手のレーンをタップ（属性相性に注意！）'
  }

  if (onlyEndTurnLeft(state)) {
    return 'もう動ける手がありません → 自動でターン終了'
  }

  const me = state.players[viewer]
  const canSummon = me.hand.some(
    (c) => getDef(c.cardId).cost <= me.energy && me.field.length < 3,
  )
  const canAct = me.field.some(
    (d) =>
      !d.hasChallenged && Object.values(d.commandUses).some((n) => n > 0),
  )

  if (canSummon && canAct) {
    return '手札で召喚、または場の犬を選んでコマンド！'
  }
  if (canSummon) return '手札の犬を選んで空きレーンに出そう'
  if (canAct) return '場の犬を選んでからコマンド（回数制）'
  return 'ターン終了で相手に番を渡そう'
}
