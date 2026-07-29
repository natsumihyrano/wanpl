import { useMemo, useState, type CSSProperties } from 'react'
import { DOGS, type DogDef, type DogRole } from '../data/dogs'
import {
  COMMAND_MAP,
  ELEMENT_MAP,
  ELEMENTS,
  type ElementId,
} from '../data/battle'
import { getDogSprite } from '../data/dogSprites'

const ROLE_LABELS: Record<DogRole, string> = {
  assassin: 'アタッカー',
  bruiser: 'ファイター',
  tank: 'タンク',
  lane: 'レーン',
  support: 'サポート',
  tempo: 'テンポ',
  value: 'バリュー',
}

interface Props {
  onBack: () => void
  /** 対戦中に開くとき、対戦を残したまま前面に出す */
  overlay?: boolean
}

type Filter = 'all' | ElementId

export function DogCatalog({ onBack, overlay = false }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const dogs = useMemo(() => {
    const list =
      filter === 'all' ? DOGS : DOGS.filter((d) => d.element === filter)
    return [...list].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name, 'ja'))
  }, [filter])

  return (
    <div className={`dog-catalog${overlay ? ' dog-catalog--overlay' : ''}`}>
      <header className="dog-catalog__top">
        <button type="button" className="btn btn--ghost btn--table" onClick={onBack}>
          戻る
        </button>
        <div className="dog-catalog__heading">
          <p className="brand-mini">Wanpl</p>
          <h1>犬図鑑</h1>
          <p>{dogs.length}ひき / ぜんぶで {DOGS.length}ひき</p>
        </div>
        <span className="dog-catalog__spacer" />
      </header>

      <div className="dog-catalog__filters" role="tablist" aria-label="属性で絞り込み">
        <button
          type="button"
          className={filter === 'all' ? 'is-on' : ''}
          onClick={() => setFilter('all')}
        >
          すべて
        </button>
        {ELEMENTS.map((el) => (
          <button
            key={el.id}
            type="button"
            className={filter === el.id ? 'is-on' : ''}
            style={{ '--el': el.color } as CSSProperties}
            onClick={() => setFilter(el.id)}
          >
            {el.name}
          </button>
        ))}
      </div>

      <ul className="dog-catalog__list">
        {dogs.map((dog) => (
          <li key={dog.id}>
            <DogCatalogCard dog={dog} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function DogCatalogCard({ dog }: { dog: DogDef }) {
  const sprite = getDogSprite(dog.id, 'front')
  const el = ELEMENT_MAP[dog.element]
  const roleLabel = ROLE_LABELS[dog.role]

  return (
    <article
      className="dex-card"
      style={{ '--hue': dog.hue, '--el': el.color } as CSSProperties}
    >
      <div className="dex-card__face">
        {sprite ? (
          <img src={sprite} alt="" draggable={false} />
        ) : (
          <span
            className="dex-card__placeholder"
            style={{ background: `hsl(${dog.hue} 42% 48%)` }}
          />
        )}
      </div>

      <div className="dex-card__main">
        <header className="dex-card__head">
          <h2>{dog.name}</h2>
          <span className="dex-card__el">{el.name}</span>
          <span className="dex-card__role">{roleLabel}</span>
          <span className="dex-card__cost" title="元気コスト">
            元気 {dog.cost}
          </span>
        </header>

        <p className="dex-card__stats">
          <span>パワー {dog.power}</span>
          <span>守り {dog.defense}</span>
        </p>

        <div className="dex-card__ability">
          <strong>特技 · {dog.abilityName}</strong>
          <p>{dog.abilityText}</p>
        </div>

        <ul className="dex-card__commands">
          {dog.commands.map((id) => {
            const cmd = COMMAND_MAP[id]
            return (
              <li key={id}>
                <strong>{cmd.name}</strong>
                <em>
                  {cmd.maxUses}回
                </em>
                <span>{cmd.text}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </article>
  )
}
