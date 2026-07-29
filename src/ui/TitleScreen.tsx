import { getDogSprite } from '../data/dogSprites'

interface Props {
  onLocal: () => void
  onCpu: () => void
  onOnlineCreate: () => void
  onOnlineJoin: () => void
  onCatalog: () => void
  onHelp: () => void
}

/** タイトル背景：色がはっきりした犬の walk だけ（白い犬は切り抜きが粗い） */
const PARK_DOGS: Array<{
  id: string
  pose: 'walk0' | 'walk1' | 'walk2' | 'walk3'
  slot: string
}> = [
  { id: 'corgi', pose: 'walk0', slot: 'a' },
  { id: 'shiba', pose: 'walk1', slot: 'b' },
  { id: 'golden', pose: 'walk2', slot: 'c' },
  { id: 'pug', pose: 'walk0', slot: 'd' },
  { id: 'dachshund', pose: 'walk3', slot: 'e' },
  { id: 'shepherd', pose: 'walk1', slot: 'f' },
  { id: 'terrier', pose: 'walk2', slot: 'g' },
  { id: 'french_bulldog', pose: 'walk1', slot: 'h' },
]

function TitleParkDogs() {
  return (
    <div className="title-park" aria-hidden>
      {PARK_DOGS.map((dog, i) => {
        const src = getDogSprite(dog.id, dog.pose)
        if (!src) return null
        return (
          <img
            key={dog.id}
            src={src}
            alt=""
            className={`title-park__dog title-park__dog--${dog.slot}`}
            style={{ animationDelay: `${(i % 4) * 0.18}s` }}
            draggable={false}
          />
        )
      })}
    </div>
  )
}

export function TitleScreen({
  onLocal,
  onCpu,
  onOnlineCreate,
  onOnlineJoin,
  onCatalog,
  onHelp,
}: Props) {
  return (
    <div className="title-screen">
      <div className="title-sky" aria-hidden />
      <div className="title-grass" aria-hidden />
      <TitleParkDogs />

      <main className="title-hero">
        <h1 className="title-brand">Wanpl</h1>
        <p className="title-kana">わんぷれ</p>
        <p className="title-tag">犬種の特技で、公園のなかよし勝負</p>

        <div className="title-actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={onLocal}>
            ローカル対戦
          </button>
          <button type="button" className="btn btn--secondary btn--lg" onClick={onCpu}>
            CPU対戦
          </button>
          <button type="button" className="btn btn--secondary btn--lg" onClick={onOnlineCreate}>
            オンライン（部屋を作る）
          </button>
          <button type="button" className="btn btn--ghost btn--lg" onClick={onOnlineJoin}>
            オンライン（部屋に入る）
          </button>
          <button type="button" className="btn btn--secondary btn--lg btn--span" onClick={onCatalog}>
            犬図鑑
          </button>
        </div>

        <button type="button" className="help-link" onClick={onHelp}>
          あそびかた
        </button>
      </main>
    </div>
  )
}
