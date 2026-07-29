import type { Action, FieldDog, GameState, PlayerId } from './types'
import {
  checkWinner,
  cloneState,
  critChance,
  drawCards,
  effectiveDefense,
  effectivePower,
  getDef,
  hasGuard,
  hasSpots,
  initialCommandUses,
  nextRng,
  opponentOf,
  spendCommandUse,
  startTurn,
  STARTING_TREATS,
} from './helpers'
import {
  COMMAND_MAP,
  ELEMENT_MAP,
  isChallengeCommand,
  isRestCommand,
  typeModifier,
  type CommandId,
} from '../data/battle'

function findHand(playerId: PlayerId, state: GameState, instanceId: string) {
  const p = state.players[playerId]
  const idx = p.hand.findIndex((c) => c.instanceId === instanceId)
  return { p, idx, card: idx >= 0 ? p.hand[idx] : null }
}

function findField(playerId: PlayerId, state: GameState, instanceId: string) {
  const p = state.players[playerId]
  const idx = p.field.findIndex((d) => d.instanceId === instanceId)
  return { p, idx, dog: idx >= 0 ? p.field[idx] : null }
}

function laneTaken(field: FieldDog[], lane: number) {
  return field.some((d) => d.lane === lane)
}

function applySummonEffects(
  state: GameState,
  playerId: PlayerId,
  dog: FieldDog,
): GameState {
  let s = state
  const def = getDef(dog.cardId)
  const who = playerId === 0 ? 'P1' : 'P2'
  const p = s.players[playerId]
  const oppId = opponentOf(playerId)
  const opp = s.players[oppId]

  if (def.ability === 'friendly' || def.ability === 'cozy') {
    p.treats += 1
    s.log.push(
      `${who}の${def.abilityName}: おやつ+1`,
    )
  }
  if (def.ability === 'swim') {
    p.treats += 2
    s.log.push(`${who}の救助: おやつ+2`)
  }
  if (def.ability === 'barrel') {
    p.treats += 1
    p.guardCharges = Math.max(p.guardCharges, 1)
    s.log.push(`${who}の樽のお酒: おやつ+1＆みきり構え`)
  }
  if (def.ability === 'nap') {
    p.energy = Math.min(5, p.energy + 1)
    s.log.push(`${who}のお昼寝: 元気+1`)
  }
  if (def.ability === 'howl') {
    s.howlActive = true
    s.foeHowlOwner = null
    s.log.push(`${who}の遠吠え: このターン守り-1`)
  }
  if (def.ability === 'blizzard') {
    s.foeHowlOwner = playerId
    s.howlActive = false
    s.log.push(`${who}の猛吹雪: 相手の犬だけ守り-1`)
  }
  if (def.ability === 'nibble') {
    opp.treats -= 1
    s.log.push(`${who}のかじる: 相手のおやつ-1（残り${opp.treats}）`)
  }
  if (def.ability === 'rally') {
    for (const ally of p.field) {
      ally.summonedThisTurn = false
      ally.hasChallenged = false
    }
    s.log.push(`${who}の号令: 味方全員がもう一度チャレンジ可能に！`)
  }
  if (def.ability === 'herding') {
    const heritable = opp.field.filter(
      (d) => {
        const a = getDef(d.cardId).ability
        return a !== 'stubborn' && a !== 'ward'
      },
    )
    if (heritable.length > 0) {
      s.pendingHerding = { player: playerId, corgiInstanceId: dog.instanceId }
      s.log.push(`${who}の牧畜: 相手の犬を選んで控えへ`)
    } else if (opp.field.length > 0) {
      s.log.push(`${who}の牧畜: 頑固な犬ばかりで効かなかった`)
    }
  }
  return checkWinner(s)
}

function removeFromField(
  state: GameState,
  playerId: PlayerId,
  instanceId: string,
  reason: string,
): { state: GameState; removed: FieldDog | null } {
  const s = cloneState(state)
  const p = s.players[playerId]
  const idx = p.field.findIndex((d) => d.instanceId === instanceId)
  if (idx < 0) return { state: s, removed: null }
  const [removed] = p.field.splice(idx, 1)
  const who = playerId === 0 ? 'P1' : 'P2'
  s.log.push(`${who}の ${getDef(removed.cardId).name} が${reason}`)
  if (reason === '退場した' && getDef(removed.cardId).ability === 'last_bark') {
    drawCards(p, 1, s.log, who)
  }
  return { state: s, removed }
}

function dealTreatDamage(
  state: GameState,
  targetPlayer: PlayerId,
  amount: number,
  fromSamoyedBlock: boolean,
): GameState {
  let s = cloneState(state)
  let dmg = amount
  if (fromSamoyedBlock && dmg > 0) {
    dmg = Math.max(0, dmg - 1)
    s.log.push('特技: おやつダメージを1防いだ')
  }
  s.players[targetPlayer].treats -= dmg
  if (dmg > 0) {
    s.log.push(
      `${targetPlayer === 0 ? 'P1' : 'P2'}のおやつが ${dmg} 減った（残り${s.players[targetPlayer].treats}）`,
    )
  }
  return checkWinner(s)
}

function resolveChallenge(
  state: GameState,
  attackerId: PlayerId,
  attacker: FieldDog,
  targetLane: number,
  command: CommandId,
): GameState {
  let s = cloneState(state)
  const defenderId = opponentOf(attackerId)
  const atkPlayer = s.players[attackerId]
  const defPlayer = s.players[defenderId]
  const atkDef = getDef(attacker.cardId)
  const who = attackerId === 0 ? 'P1' : 'P2'
  const foe = defenderId === 0 ? 'P1' : 'P2'
  const cmd = COMMAND_MAP[command]
  if (!cmd || cmd.effect.kind !== 'challenge') return state

  const atkLive = s.players[attackerId].field.find(
    (d) => d.instanceId === attacker.instanceId,
  )
  if (!atkLive || atkLive.hasChallenged) return state
  if (!atkDef.commands.includes(command)) return state
  if (!spendCommandUse(atkLive, command)) return state

  const target = defPlayer.field.find((d) => d.lane === targetLane) ?? null
  if (cmd.effect.onlyEmpty && target) return state
  if (cmd.effect.onlyDog && !target) return state

  let power = effectivePower(atkLive, atkPlayer)
  const powerBonus = cmd.effect.powerBonus ?? 0
  const emptyBonus = cmd.effect.emptyBonus ?? 0
  const pierce = cmd.effect.pierce ?? 0

  if (powerBonus > 0) {
    power += powerBonus
    s.log.push(`${who}の「${cmd.name}」: パワー+${powerBonus}`)
  }

  if (!target) {
    let dmg =
      atkDef.ability === 'silk' ? Math.max(1, power) : Math.max(1, power - 1)
    if (atkDef.ability === 'silk') {
      s.log.push(`${who}の流麗: 空きレーンにフルパワー`)
    }
    if (emptyBonus > 0) {
      dmg += emptyBonus
      s.log.push(`${who}の「${cmd.name}」: 空きレーンダメージ+${emptyBonus}`)
    }
    if (hasSpots(atkPlayer)) {
      dmg += 1
      s.log.push(`${who}のスポット: 空きレーン+1`)
    }
    if (hasGuard(defPlayer)) {
      dmg = Math.max(0, dmg - 1)
      s.log.push(`${foe}の番犬: 直接ダメージ-1`)
    }
    s.log.push(
      `${who}の ${atkDef.name} が空きレーンへチャレンジ（パワー${power}→${dmg}）`,
    )
    atkLive.hasChallenged = true

    s = dealTreatDamage(s, defenderId, dmg, false)

    if (atkDef.ability === 'loot' && dmg > 0 && s.winner === null) {
      s.players[attackerId].treats += 1
      s.log.push(`${who}のお宝掘り: おやつ+1`)
    }
    if (atkDef.ability === 'fetch' && s.winner === null) {
      drawCards(s.players[attackerId], 1, s.log, who)
    }
    if (atkDef.ability === 'snack' && s.winner === null) {
      s.players[attackerId].treats += 1
      s.log.push(`${who}のおかわり: おやつ+1`)
    }
    if (atkDef.ability === 'bounce' && s.winner === null) {
      const bounce = removeFromField(s, attackerId, attacker.instanceId, '手札に戻った')
      s = bounce.state
      if (bounce.removed && s.players[attackerId].hand.length < 5) {
        s.players[attackerId].hand.push({
          instanceId: bounce.removed.instanceId,
          cardId: bounce.removed.cardId,
          commandUses: { ...bounce.removed.commandUses },
        })
      }
    }
    return checkWinner(s)
  }

  const targetDef = getDef(target.cardId)
  const mod = typeModifier(atkDef.element, targetDef.element)
  if (mod !== 0) {
    power = Math.max(0, power + mod)
    const aName = ELEMENT_MAP[atkDef.element].name
    const dName = ELEMENT_MAP[targetDef.element].name
    s.log.push(
      mod > 0
        ? `属性有利！（${aName}→${dName}）パワー+1`
        : `属性不利…（${aName}→${dName}）パワー-1`,
    )
  }

  if (targetDef.ability === 'low_profile' && power <= 2) {
    s.log.push(`${foe}の低姿勢: パワー${power}のチャレンジを受け流した`)
    atkLive.hasChallenged = true
    return s
  }

  if (targetDef.ability === 'tsun' && target.tsunAvailable) {
    const tRef = s.players[defenderId].field.find(
      (d) => d.instanceId === target.instanceId,
    )
    if (tRef) tRef.tsunAvailable = false
    s.log.push(`${foe}のツン: チャレンジを無効化した！`)
    atkLive.hasChallenged = true
    return s
  }

  if (targetDef.ability === 'alert') {
    power = Math.max(0, power - 1)
  }

  let defense = effectiveDefense(target, s.howlActive, {
    foeHowlOwner: s.foeHowlOwner,
    ownerId: defenderId,
  })
  if (atkDef.ability === 'track' || atkDef.ability === 'gale') {
    defense = Math.max(0, defense - 1)
    if (atkDef.ability === 'gale') {
      s.log.push(`${who}の疾風: 守りを1無視`)
    }
  }
  if (pierce > 0) {
    defense = Math.max(0, defense - pierce)
    s.log.push(`${who}の「${cmd.name}」: 守りを${pierce}無視`)
  }
  if (defPlayer.guardCharges > 0) {
    defense += 1
    s.players[defenderId].guardCharges -= 1
    s.log.push(`${foe}の「みきり」: 守り+1`)
  }

  s.log.push(
    `${who}の ${atkDef.name}(P${power}) vs ${foe}の ${targetDef.name}(D${defense})`,
  )

  atkLive.hasChallenged = true

  const ghostTie = atkDef.ability === 'ghost' && power === defense
  let critical = false
  if (
    !ghostTie &&
    power < defense &&
    targetDef.ability !== 'gentle'
  ) {
    const deficit = defense - power
    const roll = nextRng(s.rngSeed)
    s.rngSeed = roll.seed
    if (roll.value < critChance(deficit)) {
      critical = true
    }
  }

  const challengeWins = power > defense || ghostTie || critical

  if (challengeWins) {
    let overflow = Math.max(0, power - defense)
    if (critical) {
      overflow = Math.max(1, overflow)
      s.fx = { kind: 'critical' }
      s.log.push('クリティカル！守りを突破した')
    } else if (ghostTie) {
      s.log.push(`${who}の灰の亡霊: 同点でも退場させた`)
    }
    const isSamoyed =
      targetDef.ability === 'fluffy' || targetDef.ability === 'ward'
    const rm = removeFromField(s, defenderId, target.instanceId, '退場した')
    s = rm.state
    if (atkDef.ability === 'dig') {
      overflow += 1
      s.log.push('掘る: 追加おやつ1')
    }
    if (atkDef.ability === 'trophy') {
      s.players[attackerId].treats += 1
      s.log.push(`${who}の漆黒の戦利品: おやつ+1`)
    }
    s = dealTreatDamage(s, defenderId, overflow, isSamoyed)

    if (atkDef.ability === 'fetch' && s.winner === null) {
      drawCards(s.players[attackerId], 1, s.log, who)
    }
    if (atkDef.ability === 'snack' && s.winner === null) {
      s.players[attackerId].treats += 1
      s.log.push(`${who}のおかわり: おやつ+1`)
    }
  } else {
    s.log.push('チャレンジ失敗…守りきられた')
    if (targetDef.ability === 'grit') {
      s.players[defenderId].treats += 1
      s.log.push(`${foe}の根性: おやつ+1`)
    }
    if (targetDef.ability === 'blue_tongue') {
      const atkSide = s.players[attackerId]
      if (atkSide.energy > 0) {
        atkSide.energy -= 1
        s.log.push(`${foe}の青舌: ${who}の元気-1（残り${atkSide.energy}）`)
      } else {
        s.log.push(`${foe}の青舌: 元気はもう0だった`)
      }
    }
    if (atkDef.ability === 'fight' && s.winner === null) {
      s = dealTreatDamage(s, defenderId, 1, false)
      s.log.push(`${who}の闘志: 失敗してもおやつ-1`)
    }
  }

  if (atkDef.ability === 'bounce' && s.winner === null) {
    const stillThere = s.players[attackerId].field.some(
      (d) => d.instanceId === attacker.instanceId,
    )
    if (stillThere) {
      const bounce = removeFromField(
        s,
        attackerId,
        attacker.instanceId,
        '手札に戻った',
      )
      s = bounce.state
      if (bounce.removed && s.players[attackerId].hand.length < 5) {
        s.players[attackerId].hand.push({
          instanceId: bounce.removed.instanceId,
          cardId: bounce.removed.cardId,
          commandUses: { ...bounce.removed.commandUses },
        })
      }
    }
  }

  return checkWinner(s)
}

export function reduce(state: GameState, action: Action): GameState {
  if (state.winner !== null || state.phase === 'ended') return state

  // 前アクションの演出をクリア
  if (state.fx) {
    state = { ...state, fx: null }
  }

  if (state.pendingHerding) {
    if (action.type === 'END_TURN') {
      let s = cloneState(state)
      s.pendingHerding = null
      s.log.push('牧畜できる相手がいなかった')
      s.howlActive = false
      s.foeHowlOwner = null
      const pid = s.activePlayer
      s.activePlayer = opponentOf(pid)
      if (s.activePlayer === 0) s.turn += 1
      s.log.push('—— ターン交代 ——')
      return startTurn(s)
    }
    if (action.type !== 'HERDING_TARGET') return state
    if (state.activePlayer !== state.pendingHerding.player) return state

    let s = cloneState(state)
    const herding = s.pendingHerding
    if (!herding) return state
    const oppId = opponentOf(herding.player)
    const target = s.players[oppId].field.find(
      (d) => d.instanceId === action.targetInstanceId,
    )
    if (!target) return state
    if (
      getDef(target.cardId).ability === 'stubborn' ||
      getDef(target.cardId).ability === 'ward'
    )
      return state
    const rm = removeFromField(s, oppId, target.instanceId, '控えに戻った')
    s = rm.state
    s.pendingHerding = null
    return s
  }

  if (action.type === 'HERDING_TARGET') return state

  const pid = state.activePlayer
  const who = pid === 0 ? 'P1' : 'P2'

  if (action.type === 'SUMMON') {
    let s = cloneState(state)
    const { p, idx, card } = findHand(pid, s, action.instanceId)
    if (!card || idx < 0) return state
    if (action.lane < 0 || action.lane > 2) return state
    if (laneTaken(p.field, action.lane)) return state
    if (p.field.length >= 3) return state
    const def = getDef(card.cardId)
    if (p.energy < def.cost) return state

    p.energy -= def.cost
    p.hand.splice(idx, 1)
    const dog: FieldDog = {
      instanceId: card.instanceId,
      cardId: card.cardId,
      lane: action.lane,
      summonedThisTurn: true,
      tsunAvailable: def.ability === 'tsun',
      hasChallenged: false,
      commandUses: initialCommandUses(card.cardId, card.commandUses),
    }
    p.field.push(dog)
    s.log.push(`${who}が ${def.name} をレーン${action.lane + 1}に召喚`)
    s = applySummonEffects(s, pid, dog)
    return checkWinner(s)
  }

  if (action.type === 'REST') {
    let s = cloneState(state)
    const { p, dog } = findField(pid, s, action.instanceId)
    if (!dog || dog.hasChallenged) return state
    const cmd = COMMAND_MAP[action.command]
    if (!cmd || !isRestCommand(action.command)) return state
    if (!getDef(dog.cardId).commands.includes(action.command)) return state
    if (!spendCommandUse(dog, action.command)) return state
    const def = getDef(dog.cardId)
    const effect = cmd.effect
    dog.hasChallenged = true
    s.log.push(`${who}の ${def.name} が「${cmd.name}」`)
    if (effect.kind === 'rest') {
      let treatsGain = effect.treats ?? 0
      let energyGain = effect.energy ?? 0
      const notes: string[] = []
      if (
        effect.elementTreatBonus &&
        def.element === effect.elementTreatBonus.element
      ) {
        treatsGain += effect.elementTreatBonus.treats
        notes.push(`${ELEMENT_MAP[def.element].name}ボーナス`)
      }
      if (
        effect.elementEnergyBonus &&
        def.element === effect.elementEnergyBonus.element
      ) {
        energyGain += effect.elementEnergyBonus.energy
        notes.push(`${ELEMENT_MAP[def.element].name}ボーナス`)
      }
      if (
        effect.behindTreats &&
        p.treats <= Math.floor(STARTING_TREATS / 2)
      ) {
        treatsGain += effect.behindTreats
        notes.push('踏ん張り')
      }
      if (def.ability === 'nurse' && (effect.treats ?? 0) > 0) {
        treatsGain += 1
        notes.push('もふケア')
      }
      if (
        def.ability === 'comeback' &&
        (effect.treats ?? 0) > 0 &&
        p.treats <= Math.floor(STARTING_TREATS / 2)
      ) {
        treatsGain += 1
        notes.push('救援')
      }
      if (treatsGain > 0) {
        p.treats += treatsGain
        s.log.push(
          `${who}の${cmd.name}: おやつ+${treatsGain}${notes.length ? `（${notes.join('・')}）` : ''}`,
        )
      }
      if (effect.guardCharges) {
        p.guardCharges = Math.max(p.guardCharges, effect.guardCharges)
        s.log.push(
          `${who}のみきり構え！（残${p.guardCharges}）`,
        )
      }
      if (energyGain > 0) {
        p.energy += energyGain
        s.log.push(
          `${who}の${cmd.name}: 元気+${energyGain}${notes.length && treatsGain === 0 ? `（${notes.join('・')}）` : ''}`,
        )
      }
      if (effect.clearHowl) {
        s.howlActive = false
        s.foeHowlOwner = null
        s.log.push(`${who}の${cmd.name}: 遠吠え・猛吹雪を打ち消した`)
      }
      if (effect.startHowl) {
        s.howlActive = true
        s.foeHowlOwner = null
        s.log.push(`${who}の${cmd.name}: 遠吠え！守り-1`)
      }
      if (effect.startFoeHowl) {
        s.howlActive = false
        s.foeHowlOwner = pid
        s.log.push(`${who}の${cmd.name}: 猛吹雪！相手の守り-1`)
      }
      if (effect.drainOppEnergy && effect.drainOppEnergy > 0) {
        const opp = s.players[opponentOf(pid)]
        const before = opp.energy
        opp.energy = Math.max(0, opp.energy - effect.drainOppEnergy)
        s.log.push(
          `${who}の${cmd.name}: 相手の元気-${before - opp.energy}（残り${opp.energy}）`,
        )
      }
      if (effect.draw && effect.draw > 0) {
        drawCards(p, effect.draw, s.log, who)
      }
    }
    return checkWinner(s)
  }

  if (action.type === 'CHALLENGE') {
    const { dog } = findField(pid, state, action.attackerInstanceId)
    if (!dog) return state
    if (dog.hasChallenged) return state
    if (action.targetLane < 0 || action.targetLane > 2) return state
    if (!isChallengeCommand(action.command)) return state
    return resolveChallenge(
      state,
      pid,
      dog,
      action.targetLane,
      action.command,
    )
  }

  if (action.type === 'END_TURN') {
    let s = cloneState(state)
    s.howlActive = false
    s.foeHowlOwner = null
    s.pendingHerding = null
    s.activePlayer = opponentOf(pid)
    if (s.activePlayer === 0) s.turn += 1
    s.log.push('—— ターン交代 ——')
    return startTurn(s)
  }

  return state
}
