import { useEffect, useState, type CSSProperties } from 'react'
import type { PublicDogView } from '../engine'
import { getDogSprite, getWalkSprites } from '../data/dogSprites'
import { ELEMENT_MAP } from '../data/battle'

interface Props {
  dog: PublicDogView
  selected?: boolean
  dimmed?: boolean
  pulse?: boolean
  onClick?: () => void
  /** 場・手札向け。顔と名前を優先し、説明は短く／ホバーで全文 */
  compact?: boolean
  /** 行動時に walk スプライトを一瞬オーバーレイ */
  walking?: boolean
  pose?: 'front' | 'happy' | 'sad'
}

function PixelDog({ hue }: { hue: number }) {
  const body = `hsl(${hue} 42% 38%)`
  const ear = `hsl(${hue} 40% 28%)`
  const belly = `hsl(${hue} 35% 72%)`
  return (
    <svg
      viewBox="0 0 16 12"
      className="dog-card__svg"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <rect x="3" y="11" width="10" height="1" fill="#000" opacity="0.2" />
      <rect x="3" y="1" width="2" height="3" fill={ear} />
      <rect x="11" y="1" width="2" height="3" fill={ear} />
      <rect x="4" y="2" width="8" height="5" fill={body} />
      <rect x="5" y="4" width="1" height="1" fill="#1a2018" />
      <rect x="10" y="4" width="1" height="1" fill="#1a2018" />
      <rect x="7" y="5" width="2" height="1" fill="#1a2018" />
      <rect x="3" y="6" width="10" height="4" fill={body} />
      <rect x="5" y="7" width="6" height="2" fill={belly} />
      <rect x="4" y="9" width="2" height="2" fill={ear} />
      <rect x="10" y="9" width="2" height="2" fill={ear} />
      <rect x="13" y="6" width="2" height="2" fill={ear} />
    </svg>
  )
}

export function DogCard({
  dog,
  selected,
  dimmed,
  pulse,
  onClick,
  compact = false,
  walking = false,
  pose = 'front',
}: Props) {
  const sprite = getDogSprite(dog.cardId, pose)
  const walks = getWalkSprites(dog.cardId)
  const [walkFrame, setWalkFrame] = useState(0)
  const el = ELEMENT_MAP[dog.element]
  const abilityTitle = `${dog.abilityName}：${dog.abilityText}`
  const showWalk = walking && walks.length > 0

  useEffect(() => {
    if (!showWalk) {
      setWalkFrame(0)
      return
    }
    setWalkFrame(0)
    const t = window.setInterval(() => {
      setWalkFrame((f) => (f + 1) % walks.length)
    }, 90)
    return () => window.clearInterval(t)
  }, [showWalk, walks.length])

  return (
    <button
      type="button"
      className={[
        'dog-card',
        compact ? 'dog-card--compact' : 'dog-card--full',
        selected ? 'is-selected' : '',
        dimmed ? 'is-dimmed' : '',
        pulse ? 'is-pulse' : '',
        onClick ? 'is-clickable' : '',
        sprite ? 'dog-card--art' : '',
        showWalk ? 'is-walking' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          '--hue': dog.hue,
          '--el': el.color,
        } as CSSProperties
      }
      onClick={onClick}
      disabled={!onClick}
      title={compact ? abilityTitle : undefined}
    >
      <div className="dog-card__cost">{dog.cost}</div>
      <div className="dog-card__element" title={el.name}>
        {el.name}
      </div>
      <div className="dog-card__sil">
        {sprite ? (
          <img
            src={sprite}
            alt=""
            className="dog-card__art"
            draggable={false}
          />
        ) : (
          <PixelDog hue={dog.hue} />
        )}
        {showWalk && (
          <div className="dog-card__walk" aria-hidden>
            <img src={walks[walkFrame]} alt="" draggable={false} />
          </div>
        )}
      </div>
      <div className="dog-card__name" title={dog.name}>
        {dog.name}
      </div>
      <div className="dog-card__stats">
        <span title="パワー">P{dog.power}</span>
        <span title="守り">D{dog.defense}</span>
      </div>
      <div className="dog-card__ability" title={abilityTitle}>
        <strong>{dog.abilityName}</strong>
        {!compact && <span>{dog.abilityText}</span>}
      </div>
    </button>
  )
}
