import type { CSSProperties } from 'react'
import type { PublicDogView } from '../engine'
import { getDogSprite } from '../data/dogSprites'
import { ELEMENT_MAP } from '../data/battle'

/** 手札選択時など、顔＋特技全文を1行で見せる */
export function DogPeek({
  dog,
  label,
}: {
  dog: PublicDogView
  label?: string
}) {
  const sprite = getDogSprite(dog.cardId, 'front')
  const el = ELEMENT_MAP[dog.element]

  return (
    <div className="dog-peek" style={{ '--hue': dog.hue } as CSSProperties}>
      <div className="dog-peek__face">
        {sprite ? (
          <img src={sprite} alt="" draggable={false} />
        ) : (
          <span
            className="dog-peek__pixel"
            style={{ background: `hsl(${dog.hue} 42% 48%)` }}
          />
        )}
      </div>
      <div className="dog-peek__body">
        {label && <span className="dog-peek__label">{label}</span>}
        <strong>
          {dog.name}
          <span style={{ background: el.color }}>{el.name}</span>
          <em>
            P{dog.power}/D{dog.defense}
          </em>
        </strong>
        <p>
          <b>{dog.abilityName}</b>
          {dog.abilityText}
        </p>
      </div>
    </div>
  )
}
