import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  isLegal,
  onlyEndTurnLeft,
  toPublicState,
  type Action,
  type GameState,
  type PlayerId,
  type PublicDogView,
} from '../engine'
import { playSfxForTransition, unlockAudio } from '../audio/sfx'
import { DogCard } from './DogCard'
import { PlayerBoard } from './PlayerBoard'
import { CommandPicker } from './CommandPicker'
import { DogPeek } from './DogPeek'
import { ActiveEffectBar } from './ActiveEffectBar'
import { CombatFxBanner } from './CombatFxBanner'
import { ServerWakeScreen } from './ServerWakeScreen'
import { getTurnHint, type SelectMode } from './turnGuide'
import type { CommandId } from '../data/battle'

type NetMsg =
  | { type: 'room_created'; code: string; playerId: PlayerId }
  | { type: 'joined'; code: string; playerId: PlayerId }
  | { type: 'state'; state: GameState }
  | { type: 'error'; message: string }
  | { type: 'opponent_left' }
  | { type: 'waiting' }

interface Props {
  mode: 'create' | 'join'
  onExit: () => void
}

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const host = location.hostname
  const port = import.meta.env.VITE_WS_PORT ?? '8787'
  if (import.meta.env.DEV) return `${proto}://${host}:${port}`
  return `${proto}://${location.host}/ws`
}

/** Render スリープ解除用に HTTP で起こしてから WS 接続する */
async function pokeServer(): Promise<void> {
  if (import.meta.env.DEV) return
  try {
    await fetch(`${location.origin}/`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
    })
  } catch {
    /* コールドスタート中は失敗しがち。WS リトライに任せる */
  }
}

export function OnlineGame({ mode, onExit }: Props) {
  const [codeInput, setCodeInput] = useState('')
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<PlayerId | null>(null)
  const [state, setState] = useState<GameState | null>(null)
  const [status, setStatus] = useState('サーバー起動中…')
  const [error, setError] = useState<string | null>(null)
  const [select, setSelect] = useState<SelectMode>({ kind: 'none' })
  const [walkingDogId, setWalkingDogId] = useState<string | null>(null)
  const [waking, setWaking] = useState(true)
  const [connected, setConnected] = useState(false)
  const [fatalDisconnect, setFatalDisconnect] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const prevStateRef = useRef<GameState | null>(null)
  const cancelledRef = useRef(false)
  const sessionRef = useRef({ hasRoom: false })

  const send = useCallback((payload: object) => {
    wsRef.current?.send(JSON.stringify(payload))
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    sessionRef.current.hasRoom = false
    unlockAudio()
    let retryTimer: number | undefined
    let attempt = 0

    function attach(ws: WebSocket) {
      wsRef.current = ws
      ws.onopen = () => {
        if (cancelledRef.current) {
          ws.close()
          return
        }
        setWaking(false)
        setConnected(true)
        setError(null)
        setStatus('接続しました')
        if (mode === 'create') {
          send({ type: 'create' })
        }
      }
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as NetMsg
        if (msg.type === 'room_created') {
          sessionRef.current.hasRoom = true
          setRoomCode(msg.code)
          setPlayerId(msg.playerId)
          setStatus('相手の入室待ち…')
        } else if (msg.type === 'joined') {
          sessionRef.current.hasRoom = true
          setRoomCode(msg.code)
          setPlayerId(msg.playerId)
          setStatus('入室しました')
        } else if (msg.type === 'waiting') {
          setStatus('相手の入室待ち…')
        } else if (msg.type === 'state') {
          sessionRef.current.hasRoom = true
          setState(msg.state)
          setStatus('対戦中')
          setSelect({ kind: 'none' })
        } else if (msg.type === 'error') {
          setError(msg.message)
        } else if (msg.type === 'opponent_left') {
          setError('相手が退出しました')
          setStatus('終了')
        }
      }
      ws.onerror = () => {
        /* onclose でリトライ */
      }
      ws.onclose = () => {
        if (cancelledRef.current) return
        setConnected(false)
        if (sessionRef.current.hasRoom) {
          setStatus('切断')
          setError('接続が切れました。タイトルからやり直してください')
          setWaking(false)
          setFatalDisconnect(true)
          return
        }
        setWaking(true)
        setStatus('サーバー起動中…')
        attempt += 1
        const wait = Math.min(8000, 900 + attempt * 700)
        retryTimer = window.setTimeout(() => {
          void connect()
        }, wait)
      }
    }

    async function connect() {
      if (cancelledRef.current) return
      setWaking(true)
      await pokeServer()
      if (cancelledRef.current) return
      try {
        const ws = new WebSocket(wsUrl())
        attach(ws)
      } catch {
        attempt += 1
        const wait = Math.min(8000, 900 + attempt * 700)
        retryTimer = window.setTimeout(() => {
          void connect()
        }, wait)
      }
    }

    void connect()

    return () => {
      cancelledRef.current = true
      if (retryTimer) window.clearTimeout(retryTimer)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [mode, send])

  useEffect(() => {
    if (!state) return
    playSfxForTransition(prevStateRef.current, state, undefined, {
      you: playerId ?? undefined,
    })
    prevStateRef.current = state
  }, [state, playerId])

  function join() {
    const code = codeInput.trim().toUpperCase()
    if (code.length < 4) {
      setError('部屋コードを入力してください')
      return
    }
    setError(null)
    send({ type: 'join', code })
  }

  function flashWalk(instanceId: string | null) {
    if (!instanceId) return
    setWalkingDogId(instanceId)
    window.setTimeout(() => setWalkingDogId(null), 520)
  }

  function dispatch(action: Action) {
    if (!state || playerId === null) return
    if (state.activePlayer !== playerId) return
    if (!isLegal(state, action)) return
    if (action.type === 'REST') flashWalk(action.instanceId)
    else if (action.type === 'CHALLENGE') flashWalk(action.attackerInstanceId)
    send({ type: 'action', action })
  }

  useEffect(() => {
    if (!state || playerId === null) return
    if (state.activePlayer !== playerId) return
    if (state.winner !== null) return
    if (!onlyEndTurnLeft(state)) return
    const t = window.setTimeout(() => {
      if (!state || playerId === null) return
      if (!onlyEndTurnLeft(state)) return
      if (state.activePlayer !== playerId) return
      send({ type: 'action', action: { type: 'END_TURN' } })
    }, 700)
    return () => window.clearTimeout(t)
  }, [state, playerId, send])

  const pub = useMemo(() => {
    if (!state || playerId === null) return null
    return toPublicState(state, playerId, { revealHand: playerId })
  }, [state, playerId])

  if (!fatalDisconnect && (waking || !connected)) {
    return <ServerWakeScreen onCancel={onExit} />
  }

  if (fatalDisconnect) {
    return (
      <div className="lobby">
        <h1>オンライン対戦</h1>
        <p className="lobby-status">{status}</p>
        {error && <p className="error">{error}</p>}
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          戻る
        </button>
      </div>
    )
  }

  if (mode === 'join' && playerId === null) {
    return (
      <div className="lobby">
        <h1>部屋に入る</h1>
        <p className="lobby-status">{status}</p>
        <input
          className="code-input"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          placeholder="部屋コード"
          maxLength={6}
        />
        <button type="button" className="btn btn--primary" onClick={join}>
          入室
        </button>
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          戻る
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    )
  }

  if (!state || playerId === null || !pub) {
    return (
      <div className="lobby">
        <h1>オンライン対戦</h1>
        <p className="lobby-status">{status}</p>
        {roomCode && (
          <div className="room-code">
            <span>部屋コード</span>
            <strong>{roomCode}</strong>
            <p>友だちにこのコードを伝えてください</p>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          戻る
        </button>
      </div>
    )
  }

  if (state.winner !== null) {
    return (
      <div className="result-screen">
        <div className="result-card">
          <p className="result-eyebrow">Wanpl</p>
          <h1>{state.winner === playerId ? 'あなたの勝ち！' : '相手の勝ち…'}</h1>
          <button type="button" className="btn btn--primary" onClick={onExit}>
            タイトルへ
          </button>
        </div>
      </div>
    )
  }

  const view = pub
  const me = playerId
  const opp: PlayerId = me === 0 ? 1 : 0
  const myHand = view.players[me].hand ?? []
  const pendingHerding =
    state.pendingHerding && state.pendingHerding.player === me
  const myTurn = state.activePlayer === me
  const inMain = state.phase === 'main'
  const pickingCommand = select.kind === 'field'
  const hint = getTurnHint(state, me, select)

  function onCommandPick(command: CommandId) {
    if (select.kind !== 'field') return
    const dog = view.players[me].field.find(
      (d) => d.instanceId === select.instanceId,
    )
    const cmd = dog?.commands.find((c) => c.id === command)
    if (!cmd || cmd.uses <= 0) return
    if (cmd.kind === 'rest') {
      dispatch({
        type: 'REST',
        instanceId: select.instanceId,
        command,
      })
      return
    }
    setSelect({
      kind: 'challenge',
      attackerId: select.instanceId,
      command,
    })
  }

  const selectedFieldId =
    select.kind === 'field'
      ? select.instanceId
      : select.kind === 'challenge'
        ? select.attackerId
        : null
  const pickingDog =
    select.kind === 'field'
      ? view.players[me].field.find((d) => d.instanceId === select.instanceId)
      : null
  const summonDog =
    select.kind === 'summon'
      ? myHand.find((d) => d.instanceId === select.instanceId) ?? null
      : null
  const challengeDog =
    select.kind === 'challenge'
      ? view.players[me].field.find((d) => d.instanceId === select.attackerId)
      : null
  const peekDog = summonDog ?? challengeDog

  return (
    <div className={`game-table ${pickingCommand ? 'is-picking-command' : ''} ${peekDog ? 'has-peek' : ''}`}>
      <header className="table-top">
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          やめる
        </button>
        <div className="table-top__center">
          <span className="brand-mini">Wanpl</span>
          <span className="goal-pill">ゴール：相手のおやつを0に</span>
          <span className="turn-pill">
            部屋 {roomCode} · {myTurn ? 'あなたの番' : '相手の番'}
          </span>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!myTurn || !inMain || !!state.pendingHerding || pickingCommand}
          onClick={() => dispatch({ type: 'END_TURN' })}
        >
          ターン終了
        </button>
      </header>

      {pickingCommand && pickingDog && (
        <CommandPicker
          dog={pickingDog}
          commands={pickingDog.commands}
          onPick={onCommandPick}
          onCancel={() => setSelect({ kind: 'none' })}
        />
      )}

      <div
        className={`banner ${pendingHerding ? 'banner--herding' : ''} ${onlyEndTurnLeft(state) && myTurn ? 'banner--auto' : ''}`}
      >
        {hint}
      </div>

      <ActiveEffectBar pub={pub} />
      <CombatFxBanner fx={pub.fx} />

      {peekDog && (
        <DogPeek
          dog={peekDog}
          label={
            select.kind === 'summon'
              ? '召喚する犬'
              : 'チャレンジする犬'
          }
        />
      )}

      <PlayerBoard
        player={pub.players[opp]}
        label="相手（おやつを奪え）"
        isActive={state.activePlayer === opp}
        isYou={false}
        highlightLanes={select.kind === 'challenge' && inMain}
        herdingMode={!!pendingHerding}
        selectableDogs={(!!pendingHerding || select.kind === 'challenge') && inMain}
        matchupFrom={
          select.kind === 'challenge' && challengeDog
            ? challengeDog.element
            : null
        }
        onLaneClick={(lane) => {
          if (select.kind === 'challenge') {
            dispatch({
              type: 'CHALLENGE',
              attackerInstanceId: select.attackerId,
              targetLane: lane,
              command: select.command,
            })
          }
        }}
        onDogClick={(dog: PublicDogView) => {
          if (pendingHerding) {
            dispatch({ type: 'HERDING_TARGET', targetInstanceId: dog.instanceId })
          } else if (select.kind === 'challenge') {
            dispatch({
              type: 'CHALLENGE',
              attackerInstanceId: select.attackerId,
              targetLane: dog.lane,
              command: select.command,
            })
          }
        }}
        walkingDogId={walkingDogId}
      />

      <div className="park-divider" aria-hidden>
        <span />
      </div>

      <PlayerBoard
        player={pub.players[playerId]}
        label="あなた"
        isActive={myTurn}
        isYou
        highlightLanes={select.kind === 'summon' && inMain}
        emptyLaneHint="ここに配置"
        selectableDogs={myTurn && !pendingHerding && inMain}
        selectedDogId={selectedFieldId}
        walkingDogId={walkingDogId}
        onLaneClick={(lane) => {
          if (select.kind === 'summon') {
            dispatch({
              type: 'SUMMON',
              instanceId: select.instanceId,
              lane,
            })
          }
        }}
        onDogClick={(dog) => {
          if (dog.canChallenge && myTurn && inMain) {
            setSelect({ kind: 'field', instanceId: dog.instanceId })
          }
        }}
      />

      <div className="hand-dock">
        <div className="hand-dock__label">
          手札 — タップして場に出す（元気 {pub.players[playerId].energy}）
        </div>
        <div className="hand-row">
          {myHand.map((card) => {
            const canSummon =
              myTurn &&
              inMain &&
              !pendingHerding &&
              pub.players[playerId].energy >= card.cost &&
              pub.players[playerId].field.length < 3
            return (
              <DogCard
                key={card.instanceId}
                dog={card}
                compact
                selected={
                  select.kind === 'summon' && select.instanceId === card.instanceId
                }
                dimmed={!canSummon}
                onClick={
                  canSummon
                    ? () =>
                        setSelect({ kind: 'summon', instanceId: card.instanceId })
                    : undefined
                }
              />
            )
          })}
        </div>
      </div>

      <aside className="log-panel">
        <h3>できごと</h3>
        <ul>
          {[...pub.log].reverse().map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ul>
      </aside>

      {error && <p className="error floating-error">{error}</p>}
    </div>
  )
}
