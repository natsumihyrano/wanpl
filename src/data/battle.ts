export type ElementId = 'run' | 'smart' | 'fluffy' | 'wild'

export type CommandId =
  | 'strike'
  | 'rush'
  | 'pounce'
  | 'patrol'
  | 'raid'
  | 'pinch'
  | 'sneak'
  | 'leap'
  | 'sit'
  | 'feast'
  | 'guard'
  | 'breathe'
  | 'wag'
  | 'brace'
  | 'cuddle'
  | 'romp'
  | 'trot'
  | 'think'

export interface ElementDef {
  id: ElementId
  name: string
  beats: ElementId
  color: string
}

export type CommandEffect =
  | {
      kind: 'challenge'
      powerBonus?: number
      emptyBonus?: number
      /** 相手の守りを何無視するか */
      pierce?: number
    }
  | {
      kind: 'rest'
      treats?: number
      guardCharges?: number
      energy?: number
      /** 指定属性の犬なら追加おやつ */
      elementTreatBonus?: { element: ElementId; treats: number }
      /** 指定属性の犬なら追加元気 */
      elementEnergyBonus?: { element: ElementId; energy: number }
      /** おやつが初期の半分以下なら追加おやつ */
      behindTreats?: number
    }

export interface CommandDef {
  id: CommandId
  name: string
  text: string
  maxUses: number
  effect: CommandEffect
}

/** かけっこ → わんぱく → もふもふ → かしこい → かけっこ */
export const ELEMENTS: ElementDef[] = [
  { id: 'run', name: 'かけっこ', beats: 'wild', color: '#e07020' },
  { id: 'wild', name: 'わんぱく', beats: 'fluffy', color: '#c03050' },
  { id: 'fluffy', name: 'もふもふ', beats: 'smart', color: '#d4a0c8' },
  { id: 'smart', name: 'かしこい', beats: 'run', color: '#2a8878' },
]

export const ELEMENT_MAP = Object.fromEntries(
  ELEMENTS.map((e) => [e.id, e]),
) as Record<ElementId, ElementDef>

/** 属性ごとの「らしい回復」コマンド */
export const ELEMENT_REST: Record<ElementId, CommandId> = {
  fluffy: 'cuddle',
  wild: 'romp',
  run: 'trot',
  smart: 'think',
}

export const COMMANDS: CommandDef[] = [
  {
    id: 'strike',
    name: 'かけぬけ',
    text: 'ふつうにチャレンジ',
    maxUses: 8,
    effect: { kind: 'challenge' },
  },
  {
    id: 'rush',
    name: 'とっしん',
    text: 'チャレンジのパワー+1',
    maxUses: 5,
    effect: { kind: 'challenge', powerBonus: 1 },
  },
  {
    id: 'pounce',
    name: 'とびつき',
    text: 'チャレンジのパワー+2',
    maxUses: 2,
    effect: { kind: 'challenge', powerBonus: 2 },
  },
  {
    id: 'patrol',
    name: 'おまわり',
    text: '空きレーンへのダメージ+1',
    maxUses: 4,
    effect: { kind: 'challenge', emptyBonus: 1 },
  },
  {
    id: 'raid',
    name: 'つっぱしり',
    text: 'パワー+1、空きレーン+1',
    maxUses: 2,
    effect: { kind: 'challenge', powerBonus: 1, emptyBonus: 1 },
  },
  {
    id: 'pinch',
    name: 'かみつき',
    text: '相手の守りを1無視してチャレンジ',
    maxUses: 3,
    effect: { kind: 'challenge', pierce: 1 },
  },
  {
    id: 'sneak',
    name: 'こそこそ',
    text: '空きレーンへのダメージ+2',
    maxUses: 3,
    effect: { kind: 'challenge', emptyBonus: 2 },
  },
  {
    id: 'leap',
    name: 'ジャンプ',
    text: 'パワー+1、空きレーン+1（やや多め）',
    maxUses: 3,
    effect: { kind: 'challenge', powerBonus: 1, emptyBonus: 1 },
  },
  {
    id: 'sit',
    name: 'おすわり',
    text: 'おやつ+1。少ないときさらに+1',
    maxUses: 5,
    effect: { kind: 'rest', treats: 1, behindTreats: 1 },
  },
  {
    id: 'feast',
    name: 'ごちそう',
    text: 'おやつ+2',
    maxUses: 3,
    effect: { kind: 'rest', treats: 2 },
  },
  {
    id: 'guard',
    name: 'みきり',
    text: '受けるチャレンジ1回、守り+1',
    maxUses: 3,
    effect: { kind: 'rest', guardCharges: 1 },
  },
  {
    id: 'breathe',
    name: 'ひとやすみ',
    text: '元気+1',
    maxUses: 3,
    effect: { kind: 'rest', energy: 1 },
  },
  {
    id: 'wag',
    name: 'しっぽふり',
    text: 'おやつ+1、元気+1',
    maxUses: 2,
    effect: { kind: 'rest', treats: 1, energy: 1 },
  },
  {
    id: 'brace',
    name: 'ふんばる',
    text: 'みきり構え＋おやつ+1',
    maxUses: 2,
    effect: { kind: 'rest', guardCharges: 1, treats: 1 },
  },
  {
    id: 'cuddle',
    name: 'すりすり',
    text: 'おやつ+1。もふもふならさらに+1',
    maxUses: 4,
    effect: {
      kind: 'rest',
      treats: 1,
      elementTreatBonus: { element: 'fluffy', treats: 1 },
    },
  },
  {
    id: 'romp',
    name: 'はしゃぐ',
    text: 'おやつ+1。わんぱくならさらに+1',
    maxUses: 4,
    effect: {
      kind: 'rest',
      treats: 1,
      elementTreatBonus: { element: 'wild', treats: 1 },
    },
  },
  {
    id: 'trot',
    name: 'さんぽ',
    text: 'おやつ+1。かけっこなら元気+1',
    maxUses: 4,
    effect: {
      kind: 'rest',
      treats: 1,
      elementEnergyBonus: { element: 'run', energy: 1 },
    },
  },
  {
    id: 'think',
    name: 'かんがえる',
    text: '元気+1。かしこいならおやつ+1',
    maxUses: 4,
    effect: {
      kind: 'rest',
      energy: 1,
      elementTreatBonus: { element: 'smart', treats: 1 },
    },
  },
]

export const COMMAND_MAP = Object.fromEntries(
  COMMANDS.map((c) => [c.id, c]),
) as Record<CommandId, CommandDef>

export function isChallengeCommand(id: CommandId): boolean {
  return COMMAND_MAP[id].effect.kind === 'challenge'
}

export function isRestCommand(id: CommandId): boolean {
  return COMMAND_MAP[id].effect.kind === 'rest'
}

/** 攻撃側属性が防御側に有利なら +1、不利なら -1 */
export function typeModifier(
  attacker: ElementId,
  defender: ElementId,
): number {
  if (attacker === defender) return 0
  if (ELEMENT_MAP[attacker].beats === defender) return 1
  if (ELEMENT_MAP[defender].beats === attacker) return -1
  return 0
}
