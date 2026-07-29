import { useEffect, useState } from 'react'
import { getDogSprite } from '../data/dogSprites'
import { playSfx } from '../audio/sfx'

interface Props {
  title?: string
  detail?: string
  onCancel?: () => void
}

const WAKE_DOGS = ['corgi', 'shiba', 'pug', 'golden'] as const

/** Render スリープ解除など、サーバー待ちのつなぎ画面 */
export function ServerWakeScreen({
  title = 'サーバー起動中…',
  detail = '無料プランは最初だけ少し待ってね。わんこたちも準備中。',
  onCancel,
}: Props) {
  const [frame, setFrame] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const anim = window.setInterval(() => setFrame((f) => f + 1), 280)
    const clock = window.setInterval(() => setElapsedMs((ms) => ms + 250), 250)
    const boot = window.setInterval(() => playSfx('boot'), 4200)
    playSfx('boot')
    return () => {
      window.clearInterval(anim)
      window.clearInterval(clock)
      window.clearInterval(boot)
    }
  }, [])

  const dots = '.'.repeat((Math.floor(elapsedMs / 500) % 3) + 1)
  const tip =
    elapsedMs > 45000
      ? 'まだ起きてないみたい…もう少し待つか、あとでまた来てね。'
      : elapsedMs > 15000
        ? 'いまサーバーが目をこすってるところ…'
        : detail

  return (
    <div className="wake-screen">
      <div className="wake-sky" aria-hidden />
      <div className="wake-grass" aria-hidden />

      <main className="wake-card">
        <p className="brand-mini">Wanpl</p>
        <h1>
          {title}
          <span className="wake-dots" aria-hidden>
            {dots}
          </span>
        </h1>
        <p className="wake-detail">{tip}</p>

        <div className="wake-dogs" aria-hidden>
          {WAKE_DOGS.map((id, i) => {
            const pose = (`walk${(frame + i) % 4}` as 'walk0' | 'walk1' | 'walk2' | 'walk3')
            const src = getDogSprite(id, pose)
            if (!src) return null
            return (
              <img
                key={id}
                src={src}
                alt=""
                className="wake-dogs__dog"
                style={{ animationDelay: `${i * 0.12}s` }}
                draggable={false}
              />
            )
          })}
        </div>

        <div className="wake-bar" aria-hidden>
          <i style={{ width: `${Math.min(92, 12 + elapsedMs / 400)}%` }} />
        </div>

        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            タイトルへ戻る
          </button>
        )}
      </main>
    </div>
  )
}
