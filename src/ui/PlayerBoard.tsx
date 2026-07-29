import type { PublicDogView, PublicPlayerView } from '../engine'
import { STARTING_TREATS } from '../engine'
import { DogCard } from './DogCard'

interface Props {
  player: PublicPlayerView
  label: string
  isActive: boolean
  isYou: boolean
  selectedLane?: number | null
  selectedDogId?: string | null
  highlightLanes?: boolean
  /** 空きレーン強調時の文言（召喚＝配置、チャレンジ＝直接攻撃） */
  emptyLaneHint?: string
  selectableDogs?: boolean
  herdingMode?: boolean
  onLaneClick?: (lane: number) => void
  onDogClick?: (dog: PublicDogView) => void
  animKey?: string
  walkingDogId?: string | null
}

export function PlayerBoard({
  player,
  label,
  isActive,
  isYou,
  selectedLane,
  selectedDogId,
  highlightLanes,
  emptyLaneHint = '直接チャレンジ',
  selectableDogs,
  herdingMode,
  onLaneClick,
  onDogClick,
  animKey,
  walkingDogId,
}: Props) {
  const byLane = [0, 1, 2].map(
    (lane) => player.field.find((d) => d.lane === lane) ?? null,
  )

  return (
    <section
      className={`board-side ${isActive ? 'is-active' : ''} ${isYou ? 'is-you' : ''}`}
    >
      <header className="board-side__header">
        <h2>{label}</h2>
        <div className="meters">
          <div className="meter meter--treats" title="おやつ">
            <span className="meter__label">おやつ</span>
            <div className="meter__bar">
              <div
                className="meter__fill"
                style={{
                  width: `${Math.min(100, (player.treats / STARTING_TREATS) * 100)}%`,
                }}
              />
            </div>
            <span className="meter__val">{player.treats}</span>
          </div>
          <div className="meter meter--energy" title="元気">
            <span className="meter__label">元気</span>
            <span className="meter__pips">
              {Array.from({ length: 5 }, (_, i) => (
                <i
                  key={i}
                  className={i < player.energy ? 'on' : i < player.maxEnergy ? 'max' : ''}
                />
              ))}
            </span>
          </div>
          <div className="deck-count">山札 {player.deckCount}</div>
        </div>
      </header>

      <div className="lanes" data-anim={animKey}>
        {byLane.map((dog, lane) => (
          <div
            key={lane}
            className={[
              'lane',
              highlightLanes ? 'lane--targetable' : '',
              selectedLane === lane ? 'lane--selected' : '',
              !dog && highlightLanes ? 'lane--empty-face' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (highlightLanes && onLaneClick) onLaneClick(lane)
            }}
          >
            <span className="lane__num">{lane + 1}</span>
            {dog ? (
              <DogCard
                dog={dog}
                compact
                selected={selectedDogId === dog.instanceId}
                walking={walkingDogId === dog.instanceId}
                pulse={dog.canChallenge && isYou && isActive}
                onClick={
                  selectableDogs || herdingMode
                    ? () => onDogClick?.(dog)
                    : undefined
                }
              />
            ) : (
              <div className="lane__empty">
                {highlightLanes ? emptyLaneHint : '空き'}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
