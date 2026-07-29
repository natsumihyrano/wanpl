import { useEffect, useMemo, useState } from 'react'
import {
  createGame,
  isLegal,
  onlyEndTurnLeft,
  reduce,
  toPublicState,
  type Action,
  type GameState,
  type PlayerId,
  type PublicDogView,
} from '../engine'
import { chooseCpuAction } from '../ai/simple'
import { DogCard } from './DogCard'
import { PlayerBoard } from './PlayerBoard'
import { CommandPicker } from './CommandPicker'
import { DogPeek } from './DogPeek'
import { ActiveEffectBar } from './ActiveEffectBar'
import { CombatFxBanner } from './CombatFxBanner'
import { getTurnHint, type SelectMode } from './turnGuide'
import type { CommandId } from '../data/battle'

export type PlayMode = 'local' | 'cpu'

interface Props {
  mode: PlayMode
  onExit: () => void
  onGameEnd?: (winner: PlayerId) => void
}

export function GameTable({ mode, onExit, onGameEnd }: Props) {
  const [state, setState] = useState<GameState>(() => createGame())
  const [passReady, setPassReady] = useState(mode === 'local')
  const [select, setSelect] = useState<SelectMode>({ kind: 'none' })
  const [flash, setFlash] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [autoEndNote, setAutoEndNote] = useState(false)
  const [walkingDogId, setWalkingDogId] = useState<string | null>(null)

  const viewer: PlayerId = mode === 'cpu' ? 0 : state.activePlayer
  const hideHands = mode === 'local' && passReady

  const pub = useMemo(
    () =>
      toPublicState(state, viewer, {
        revealHand: hideHands ? undefined : mode === 'local' ? viewer : 0,
      }),
    [state, viewer, hideHands, mode],
  )

  const myHand = pub.players[viewer].hand ?? []
  const pendingHerding =
    state.pendingHerding && state.pendingHerding.player === state.activePlayer
  const myTurn =
    state.activePlayer === viewer &&
    !(mode === 'cpu' && state.activePlayer === 1) &&
    !passReady
  const inMain = state.phase === 'main'
  const pickingCommand = select.kind === 'field'

  const hint = getTurnHint(state, viewer, select, {
    waitingOpponent: mode === 'cpu' && state.activePlayer === 1,
  })

  useEffect(() => {
    if (state.winner !== null) {
      onGameEnd?.(state.winner)
    }
  }, [state.winner, onGameEnd])

  useEffect(() => {
    if (!myTurn) return
    if (state.winner !== null) return
    if (!onlyEndTurnLeft(state)) return

    setAutoEndNote(true)
    let cancelled = false
    const t = window.setTimeout(() => {
      if (cancelled) return
      setState((current) => {
        if (current.activePlayer !== viewer) return current
        if (!onlyEndTurnLeft(current)) return current
        const next = reduce(current, { type: 'END_TURN' })
        setSelect({ kind: 'none' })
        setLastAction('END_TURN')
        setFlash('END_TURN')
        window.setTimeout(() => setFlash(null), 450)
        if (mode === 'local' && next.winner === null) {
          setPassReady(true)
        }
        return next
      })
      setAutoEndNote(false)
    }, 700)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [state, myTurn, mode, viewer])

  useEffect(() => {
    if (mode !== 'cpu') return
    if (state.winner !== null) return
    if (state.activePlayer !== 1) return

    let cancelled = false
    const t = window.setTimeout(() => {
      if (cancelled) return
      setState((current) => {
        if (current.activePlayer !== 1 || current.winner !== null) return current
        let action = chooseCpuAction(current)
        if (!isLegal(current, action)) {
          action = { type: 'END_TURN' }
        }
        if (!isLegal(current, action)) return current
        setSelect({ kind: 'none' })
        setLastAction(action.type)
        setFlash(action.type)
        if (action.type === 'REST') flashWalk(action.instanceId)
        else if (action.type === 'CHALLENGE') flashWalk(action.attackerInstanceId)
        window.setTimeout(() => setFlash(null), 450)
        return reduce(current, action)
      })
    }, 480)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [mode, state])

  function flashWalk(instanceId: string | null) {
    if (!instanceId) return
    setWalkingDogId(instanceId)
    window.setTimeout(() => setWalkingDogId(null), 520)
  }

  function actorFromAction(action: Action): string | null {
    if (action.type === 'REST') return action.instanceId
    if (action.type === 'CHALLENGE') return action.attackerInstanceId
    return null
  }

  function apply(action: Action) {
    if (!isLegal(state, action)) return

    const prevPlayer = state.activePlayer
    const next = reduce(state, action)
    setState(next)
    setSelect({ kind: 'none' })
    setLastAction(action.type)
    setFlash(action.type)
    flashWalk(actorFromAction(action))
    window.setTimeout(() => setFlash(null), 450)

    if (
      mode === 'local' &&
      next.winner === null &&
      next.activePlayer !== prevPlayer &&
      action.type === 'END_TURN'
    ) {
      setPassReady(true)
    }
  }

  function onCommandPick(command: CommandId) {
    if (select.kind !== 'field') return
    const dog = pub.players[viewer].field.find(
      (d) => d.instanceId === select.instanceId,
    )
    const cmd = dog?.commands.find((c) => c.id === command)
    if (!cmd || cmd.uses <= 0) return
    if (cmd.kind === 'rest') {
      apply({
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

  function trySummonLane(lane: number) {
    if (select.kind !== 'summon') return
    apply({
      type: 'SUMMON',
      instanceId: select.instanceId,
      lane,
    })
  }

  function tryChallengeLane(lane: number) {
    if (select.kind !== 'challenge') return
    apply({
      type: 'CHALLENGE',
      attackerInstanceId: select.attackerId,
      targetLane: lane,
      command: select.command,
    })
  }

  function onMyDogClick(dog: PublicDogView) {
    if (pendingHerding) return
    if (state.phase !== 'main') return
    if (state.activePlayer !== viewer) return
    if (!dog.canChallenge) return
    setSelect({ kind: 'field', instanceId: dog.instanceId })
  }

  function onOppDogClick(dog: PublicDogView) {
    if (pendingHerding) {
      apply({ type: 'HERDING_TARGET', targetInstanceId: dog.instanceId })
      return
    }
    if (select.kind === 'challenge') {
      apply({
        type: 'CHALLENGE',
        attackerInstanceId: select.attackerId,
        targetLane: dog.lane,
        command: select.command,
      })
    }
  }

  if (state.winner !== null) {
    const title =
      mode === 'cpu'
        ? state.winner === 0
          ? 'あなたの勝ち！'
          : 'CPUの勝ち…'
        : `P${state.winner + 1}の勝ち！`

    return (
      <div className="result-screen">
        <div className="result-card">
          <p className="result-eyebrow">Wanpl</p>
          <h1>{title}</h1>
          <p>公園は平和でいっぱい。また遊ぼう！</p>
          <button type="button" className="btn btn--primary" onClick={onExit}>
            タイトルへ
          </button>
        </div>
      </div>
    )
  }

  if (passReady && mode === 'local') {
    return (
      <div className="pass-overlay">
        <div className="pass-card">
          <p className="brand-mini">Wanpl</p>
          <h1>P{state.activePlayer + 1} の番です</h1>
          <p>端末を渡してからスタートしてください</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setPassReady(false)}
          >
            準備OK
          </button>
        </div>
      </div>
    )
  }

  const opp: PlayerId = viewer === 0 ? 1 : 0
  const selectedFieldId =
    select.kind === 'field'
      ? select.instanceId
      : select.kind === 'challenge'
        ? select.attackerId
        : null
  const pickingDog =
    select.kind === 'field'
      ? pub.players[viewer].field.find((d) => d.instanceId === select.instanceId)
      : null
  const summonDog =
    select.kind === 'summon'
      ? myHand.find((d) => d.instanceId === select.instanceId) ?? null
      : null
  const challengeDog =
    select.kind === 'challenge'
      ? pub.players[viewer].field.find((d) => d.instanceId === select.attackerId)
      : null
  const peekDog = summonDog ?? challengeDog

  return (
    <div
      className={`game-table ${flash ? `flash-${flash.toLowerCase()}` : ''} ${pickingCommand ? 'is-picking-command' : ''} ${peekDog ? 'has-peek' : ''}`}
    >
      <header className="table-top">
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          やめる
        </button>
        <div className="table-top__center">
          <span className="brand-mini">Wanpl</span>
          <span className="goal-pill">ゴール：相手のおやつを0に</span>
          <span className="turn-pill">
            ターン {state.turn} ·{' '}
            {state.activePlayer === viewer
              ? 'あなたの番'
              : mode === 'cpu'
                ? 'CPUの番'
                : `P${state.activePlayer + 1}の番`}
          </span>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={
            !myTurn ||
            !inMain ||
            !!state.pendingHerding ||
            autoEndNote ||
            pickingCommand
          }
          onClick={() => apply({ type: 'END_TURN' })}
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

      <div className={`banner ${autoEndNote ? 'banner--auto' : ''} ${pendingHerding ? 'banner--herding' : ''}`}>
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
        label={mode === 'cpu' ? 'CPU（おやつを守れ）' : `P${opp + 1}`}
        isActive={state.activePlayer === opp}
        isYou={false}
        highlightLanes={select.kind === 'challenge' && inMain}
        herdingMode={!!pendingHerding}
        selectableDogs={
          (!!pendingHerding || select.kind === 'challenge') && inMain
        }
        matchupFrom={
          select.kind === 'challenge' && challengeDog
            ? challengeDog.element
            : null
        }
        onLaneClick={tryChallengeLane}
        onDogClick={onOppDogClick}
        animKey={lastAction ?? undefined}
        walkingDogId={walkingDogId}
      />

      <div className="park-divider" aria-hidden>
        <span />
      </div>

      <PlayerBoard
        player={pub.players[viewer]}
        label={mode === 'cpu' ? 'あなた' : `P${viewer + 1}`}
        isActive={state.activePlayer === viewer}
        isYou
        highlightLanes={select.kind === 'summon' && inMain}
        emptyLaneHint="ここに配置"
        selectableDogs={
          state.activePlayer === viewer && !pendingHerding && inMain
        }
        selectedDogId={selectedFieldId}
        onLaneClick={trySummonLane}
        onDogClick={onMyDogClick}
        selectedLane={null}
        animKey={lastAction ?? undefined}
        walkingDogId={walkingDogId}
      />

      <div className="hand-dock">
        <div className="hand-dock__label">
          手札 — タップして場に出す（元気 {pub.players[viewer].energy}）
        </div>
        <div className="hand-row">
          {myHand.map((card) => {
            const canSummon =
              myTurn &&
              inMain &&
              !pendingHerding &&
              pub.players[viewer].energy >= card.cost &&
              pub.players[viewer].field.length < 3
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
                        setSelect({
                          kind: 'summon',
                          instanceId: card.instanceId,
                        })
                    : undefined
                }
              />
            )
          })}
          {myHand.length === 0 && <p className="hand-empty">手札なし</p>}
        </div>
      </div>

      <aside className="log-panel" aria-label="ログ">
        <h3>できごと</h3>
        <ul>
          {[...pub.log].reverse().map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
