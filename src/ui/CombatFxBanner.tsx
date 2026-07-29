import { useEffect, useState } from 'react'
import type { CombatFx } from '../engine'

interface Props {
  fx: CombatFx | null
}

/** チャレンジ結果の大演出（クリティカルなど） */
export function CombatFxBanner({ fx }: Props) {
  const [show, setShow] = useState<CombatFx | null>(null)

  useEffect(() => {
    if (!fx) return
    setShow(fx)
    const t = window.setTimeout(() => setShow(null), 1400)
    return () => window.clearTimeout(t)
  }, [fx])

  if (!show) return null

  if (show.kind === 'critical') {
    return (
      <div className="combat-fx combat-fx--critical" role="status" aria-live="polite">
        <span className="combat-fx__label">クリティカル！</span>
      </div>
    )
  }

  return null
}
