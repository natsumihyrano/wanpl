import type { PublicState } from '../engine'

export interface ActiveEffectView {
  id: string
  label: string
  detail: string
  tone: 'howl' | 'guard' | 'aura' | 'charge'
}

/** 効果が切れるまで表示するパッシブ／一時効果 */
export function collectActiveEffects(pub: PublicState): ActiveEffectView[] {
  const effects: ActiveEffectView[] = []
  const you = pub.you
  const opp = (you === 0 ? 1 : 0) as 0 | 1

  if (pub.howlActive) {
    effects.push({
      id: 'howl',
      label: '遠吠え',
      detail: '全員の守り-1（ターン終了まで）',
      tone: 'howl',
    })
  }

  const myGuard = pub.players[you].guardCharges
  if (myGuard > 0) {
    effects.push({
      id: 'guard-you',
      label: 'みきり',
      detail: `次の被チャレンジで守り+1（残${myGuard}）`,
      tone: 'guard',
    })
  }
  const oppGuard = pub.players[opp].guardCharges
  if (oppGuard > 0) {
    effects.push({
      id: 'guard-opp',
      label: '相手のみきり',
      detail: `守り+1が残${oppGuard}`,
      tone: 'guard',
    })
  }

  for (const [pid, side] of [
    [you, '味方'] as const,
    [opp, '相手'] as const,
  ]) {
    for (const dog of pub.players[pid].field) {
      if (dog.tsunAvailable) {
        effects.push({
          id: `tsun-${dog.instanceId}`,
          label: `${dog.name}のツン`,
          detail: 'チャレンジ1回を無効（残1）',
          tone: 'charge',
        })
      }
      if (dog.ability === 'cheer') {
        effects.push({
          id: `cheer-${dog.instanceId}`,
          label: `${dog.name}の応援`,
          detail: `${side}の他犬パワー+1（場にいる間）`,
          tone: 'aura',
        })
      }
      if (dog.ability === 'guard') {
        effects.push({
          id: `watch-${dog.instanceId}`,
          label: `${dog.name}の番犬`,
          detail: '空きレーンダメージ-1（場にいる間）',
          tone: 'aura',
        })
      }
      if (dog.ability === 'low_profile') {
        effects.push({
          id: `low-${dog.instanceId}`,
          label: `${dog.name}の低姿勢`,
          detail: 'パワー2以下のチャレンジ無効（場にいる間）',
          tone: 'aura',
        })
      }
      if (dog.ability === 'alert') {
        effects.push({
          id: `alert-${dog.instanceId}`,
          label: `${dog.name}の${dog.abilityName}`,
          detail: '被チャレンジのパワー-1（場にいる間）',
          tone: 'aura',
        })
      }
      if (dog.ability === 'sprint') {
        effects.push({
          id: `sprint-${dog.instanceId}`,
          label: `${dog.name}の${dog.abilityName}`,
          detail: 'チャレンジのパワー+1（場にいる間）',
          tone: 'aura',
        })
      }
      if (dog.ability === 'track') {
        effects.push({
          id: `track-${dog.instanceId}`,
          label: `${dog.name}の嗅覚`,
          detail: 'チャレンジ時、守り1無視（場にいる間）',
          tone: 'aura',
        })
      }
      if (dog.ability === 'stubborn') {
        effects.push({
          id: `stub-${dog.instanceId}`,
          label: `${dog.name}の頑固`,
          detail: '牧畜で戻されない（場にいる間）',
          tone: 'aura',
        })
      }
      if (dog.ability === 'fluffy') {
        effects.push({
          id: `fluffy-${dog.instanceId}`,
          label: `${dog.name}のもふもふ`,
          detail: '退場時のおやつダメージを1防ぐ',
          tone: 'aura',
        })
      }
    }
  }

  return effects
}

interface Props {
  pub: PublicState
}

export function ActiveEffectBar({ pub }: Props) {
  const effects = collectActiveEffects(pub)
  if (effects.length === 0) return null

  return (
    <div className="effect-bar" aria-label="発動中の効果">
      {effects.map((e) => (
        <span
          key={e.id}
          className={`effect-chip effect-chip--${e.tone}`}
          title={e.detail}
        >
          <strong>{e.label}</strong>
          <em>{e.detail}</em>
        </span>
      ))}
    </div>
  )
}
