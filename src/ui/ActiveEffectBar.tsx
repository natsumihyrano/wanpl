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
  } else if (pub.foeHowlOwner !== null) {
    effects.push({
      id: 'blizzard',
      label: '猛吹雪',
      detail:
        pub.foeHowlOwner === you
          ? '相手の犬の守り-1（ターン終了まで）'
          : 'あなたの犬の守り-1（ターン終了まで）',
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
      if (dog.ability === 'sprint' || dog.ability === 'gale') {
        effects.push({
          id: `sprint-${dog.instanceId}`,
          label: `${dog.name}の${dog.abilityName}`,
          detail:
            dog.ability === 'gale'
              ? 'パワー+1＆守り1無視（場にいる間）'
              : 'チャレンジのパワー+1（場にいる間）',
          tone: 'aura',
        })
      }
      if (dog.ability === 'spots') {
        effects.push({
          id: `spots-${dog.instanceId}`,
          label: `${dog.name}のスポット`,
          detail: '空きレーンダメージ+1（場にいる間）',
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
      if (dog.ability === 'grit') {
        effects.push({
          id: `grit-${dog.instanceId}`,
          label: `${dog.name}の根性`,
          detail: '守りきるとおやつ+1（場にいる間）',
          tone: 'aura',
        })
      }
      if (dog.ability === 'loot') {
        effects.push({
          id: `loot-${dog.instanceId}`,
          label: `${dog.name}のお宝掘り`,
          detail: '空きレーン成功でおやつ+1',
          tone: 'aura',
        })
      }
      if (dog.ability === 'last_bark') {
        effects.push({
          id: `bark-${dog.instanceId}`,
          label: `${dog.name}のおかえり吠え`,
          detail: '退場時に手札+1',
          tone: 'aura',
        })
      }
      if (dog.ability === 'trophy') {
        effects.push({
          id: `trophy-${dog.instanceId}`,
          label: `${dog.name}の戦利品`,
          detail: '犬を退場させるとおやつ+1',
          tone: 'aura',
        })
      }
      if (dog.ability === 'ghost') {
        effects.push({
          id: `ghost-${dog.instanceId}`,
          label: `${dog.name}の灰の亡霊`,
          detail: '同点でもチャレンジ成功（ダメ0）',
          tone: 'aura',
        })
      }
      if (dog.ability === 'blue_tongue') {
        effects.push({
          id: `blue-${dog.instanceId}`,
          label: `${dog.name}の青舌`,
          detail: '守りきると相手の元気-1',
          tone: 'aura',
        })
      }
      if (dog.ability === 'silent') {
        effects.push({
          id: `silent-${dog.instanceId}`,
          label: `${dog.name}の無声`,
          detail: '遠吠え・猛吹雪の守り-1を受けない',
          tone: 'aura',
        })
      }
      if (dog.ability === 'silk') {
        effects.push({
          id: `silk-${dog.instanceId}`,
          label: `${dog.name}の流麗`,
          detail: '空きレーンにフルパワー',
          tone: 'aura',
        })
      }
      if (dog.ability === 'gentle') {
        effects.push({
          id: `gentle-${dog.instanceId}`,
          label: `${dog.name}のおっとり`,
          detail: 'クリティカル無効（場にいる間）',
          tone: 'aura',
        })
      }
      if (dog.ability === 'ward') {
        effects.push({
          id: `ward-${dog.instanceId}`,
          label: `${dog.name}の守護`,
          detail: '牧畜無効・退場ダメ-1',
          tone: 'aura',
        })
      }
      if (dog.ability === 'fight') {
        effects.push({
          id: `fight-${dog.instanceId}`,
          label: `${dog.name}の闘志`,
          detail: 'チャレンジ失敗でもおやつ-1',
          tone: 'aura',
        })
      }
      if (dog.ability === 'aloof') {
        effects.push({
          id: `aloof-${dog.instanceId}`,
          label: `${dog.name}の孤高`,
          detail: '単独ならパワー+1（場にいる間）',
          tone: 'aura',
        })
      }
      if (dog.ability === 'nurse') {
        effects.push({
          id: `nurse-${dog.instanceId}`,
          label: `${dog.name}のもふケア`,
          detail: '回復のおやつ+1',
          tone: 'aura',
        })
      }
      if (dog.ability === 'comeback') {
        effects.push({
          id: `comeback-${dog.instanceId}`,
          label: `${dog.name}の救援`,
          detail: 'おやつ半分以下で回復+1',
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
