const MUTE_KEY = 'wanpl-sfx-muted'

let ctx: AudioContext | null = null
let muted = readMuted()

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** 最初のタップで AudioContext を起こす */
export function unlockAudio() {
  ensureCtx()
}

export function isSfxMuted(): boolean {
  return muted
}

export function setSfxMuted(next: boolean) {
  muted = next
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function toggleSfxMuted(): boolean {
  setSfxMuted(!muted)
  return muted
}

type Tone = {
  freq: number
  dur: number
  type?: OscillatorType
  gain?: number
  delay?: number
  slideTo?: number
}

function beep(tones: Tone[]) {
  if (muted) return
  const ac = ensureCtx()
  if (!ac) return
  const now = ac.currentTime
  for (const t of tones) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = t.type ?? 'square'
    osc.frequency.setValueAtTime(t.freq, now + (t.delay ?? 0))
    if (t.slideTo != null) {
      osc.frequency.linearRampToValueAtTime(
        t.slideTo,
        now + (t.delay ?? 0) + t.dur,
      )
    }
    const vol = t.gain ?? 0.08
    g.gain.setValueAtTime(0.0001, now + (t.delay ?? 0))
    g.gain.exponentialRampToValueAtTime(vol, now + (t.delay ?? 0) + 0.01)
    g.gain.exponentialRampToValueAtTime(
      0.0001,
      now + (t.delay ?? 0) + Math.max(0.04, t.dur),
    )
    osc.connect(g)
    g.connect(ac.destination)
    osc.start(now + (t.delay ?? 0))
    osc.stop(now + (t.delay ?? 0) + t.dur + 0.02)
  }
}

export type SfxId =
  | 'ui'
  | 'summon'
  | 'rest'
  | 'challenge_hit'
  | 'challenge_miss'
  | 'critical'
  | 'turn'
  | 'win'
  | 'lose'
  | 'boot'

export function playSfx(id: SfxId) {
  switch (id) {
    case 'ui':
      beep([{ freq: 880, dur: 0.05, gain: 0.05 }])
      break
    case 'summon':
      beep([
        { freq: 392, dur: 0.08, gain: 0.07 },
        { freq: 523, dur: 0.1, delay: 0.07, gain: 0.07 },
        { freq: 659, dur: 0.12, delay: 0.14, gain: 0.06 },
      ])
      break
    case 'rest':
      beep([
        { freq: 330, dur: 0.1, type: 'triangle', gain: 0.06 },
        { freq: 440, dur: 0.12, delay: 0.08, type: 'triangle', gain: 0.05 },
      ])
      break
    case 'challenge_hit':
      beep([
        { freq: 220, dur: 0.09, type: 'sawtooth', gain: 0.07, slideTo: 140 },
        { freq: 440, dur: 0.06, delay: 0.05, gain: 0.05 },
      ])
      break
    case 'challenge_miss':
      beep([{ freq: 180, dur: 0.16, type: 'triangle', gain: 0.06, slideTo: 90 }])
      break
    case 'critical':
      beep([
        { freq: 523, dur: 0.07, gain: 0.07 },
        { freq: 659, dur: 0.07, delay: 0.06, gain: 0.07 },
        { freq: 784, dur: 0.07, delay: 0.12, gain: 0.07 },
        { freq: 1046, dur: 0.14, delay: 0.18, gain: 0.08 },
      ])
      break
    case 'turn':
      beep([{ freq: 600, dur: 0.06, gain: 0.045 }, { freq: 480, dur: 0.08, delay: 0.05, gain: 0.04 }])
      break
    case 'win':
      beep([
        { freq: 523, dur: 0.1, gain: 0.07 },
        { freq: 659, dur: 0.1, delay: 0.1, gain: 0.07 },
        { freq: 784, dur: 0.1, delay: 0.2, gain: 0.07 },
        { freq: 1046, dur: 0.22, delay: 0.3, gain: 0.08 },
      ])
      break
    case 'lose':
      beep([
        { freq: 392, dur: 0.14, type: 'triangle', gain: 0.06 },
        { freq: 311, dur: 0.16, delay: 0.12, type: 'triangle', gain: 0.05 },
        { freq: 247, dur: 0.22, delay: 0.26, type: 'triangle', gain: 0.05 },
      ])
      break
    case 'boot':
      beep([
        { freq: 260, dur: 0.08, gain: 0.04 },
        { freq: 320, dur: 0.08, delay: 0.2, gain: 0.035 },
      ])
      break
  }
}

/** 直前ステートとの差分から効果音を鳴らす */
export function playSfxForTransition(
  prev: { log: string[]; winner: 0 | 1 | null; activePlayer: 0 | 1 } | null,
  next: { log: string[]; winner: 0 | 1 | null; activePlayer: 0 | 1; fx?: { kind: string } | null },
  actionType?: string,
  opts?: { you?: 0 | 1 | null },
) {
  if (!prev) return

  if (next.winner !== null && prev.winner === null) {
    if (opts?.you === 0 || opts?.you === 1) {
      playSfx(next.winner === opts.you ? 'win' : 'lose')
    } else {
      playSfx('win')
    }
    return
  }

  const newLogs = next.log.slice(prev.log.length)
  const joined = newLogs.join('\n')
  if (joined.includes('クリティカル')) {
    playSfx('critical')
    return
  }

  if (actionType === 'SUMMON' || /に召喚/.test(joined)) {
    playSfx('summon')
    return
  }
  if (actionType === 'REST') {
    playSfx('rest')
    return
  }

  const combatLog =
    actionType === 'CHALLENGE' ||
    joined.includes('チャレンジ') ||
    /P\d+\) vs /.test(joined)

  if (combatLog) {
    if (
      joined.includes('失敗') ||
      joined.includes('守りきられた') ||
      joined.includes('受け流') ||
      joined.includes('無効')
    ) {
      playSfx('challenge_miss')
    } else {
      playSfx('challenge_hit')
    }
    return
  }

  if (actionType === 'END_TURN' || joined.includes('ターン交代')) {
    playSfx('turn')
  }
}
