import type { CSSProperties } from 'react'
import type { PublicCommandView, PublicDogView } from '../engine'
import type { CommandId } from '../data/battle'
import { getDogSprite } from '../data/dogSprites'
import { ELEMENT_MAP } from '../data/battle'

interface Props {
  dog: PublicDogView
  commands: PublicCommandView[]
  onPick: (command: CommandId) => void
  onCancel?: () => void
}

export function CommandPicker({ dog, commands, onPick, onCancel }: Props) {
  const sprite = getDogSprite(dog.cardId, 'front')
  const el = ELEMENT_MAP[dog.element]

  return (
    <div className="command-panel">
      <div className="command-panel__dog">
        <div
          className="command-panel__face"
          style={{ '--hue': dog.hue } as CSSProperties}
        >
          {sprite ? (
            <img src={sprite} alt="" draggable={false} />
          ) : (
            <span
              className="command-panel__face-pixel"
              style={{ background: `hsl(${dog.hue} 42% 48%)` }}
            />
          )}
        </div>
        <div className="command-panel__info">
          <h3>
            {dog.name}
            <span className="command-panel__el" style={{ background: el.color }}>
              {el.name}
            </span>
          </h3>
          <p className="command-panel__stats">
            P{dog.power} / D{dog.defense} · 元気{dog.cost}
          </p>
          <p className="command-panel__ability">
            <strong>{dog.abilityName}</strong>
            {dog.abilityText}
          </p>
        </div>
      </div>

      <p className="command-panel__hint">コマンドを選ぼう</p>
      <div className="command-panel__grid">
        {commands.map((c) => {
          const empty = c.uses <= 0
          return (
            <button
              key={c.id}
              type="button"
              className={`command-btn ${empty ? 'is-empty' : ''}`}
              disabled={empty}
              onClick={() => onPick(c.id)}
            >
              <span className="command-btn__head">
                <strong>{c.name}</strong>
                <em>
                  {c.uses}/{c.maxUses}
                </em>
              </span>
              <span>{c.text}</span>
            </button>
          )
        })}
      </div>
      {onCancel && (
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          やめる
        </button>
      )}
    </div>
  )
}
