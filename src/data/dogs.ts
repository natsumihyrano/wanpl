import type { CommandId, ElementId } from './battle'

export type AbilityId =
  | 'tsun'
  | 'herding'
  | 'friendly'
  | 'low_profile'
  | 'howl'
  | 'sprint'
  | 'guard'
  | 'fetch'
  | 'nap'
  | 'dig'
  | 'cheer'
  | 'fluffy'
  | 'alert'
  | 'swim'
  | 'track'
  | 'bounce'
  | 'nibble'
  | 'stubborn'
  | 'rally'
  | 'snack'
  /** 疾風: パワー+1かつ守り1無視 */
  | 'gale'
  /** スポット: 空きレーンダメージ+1（場にいる間） */
  | 'spots'
  /** おかえり吠え: 退場時に手札+1 */
  | 'last_bark'
  /** 戦利品: 犬を退場させたときおやつ+1 */
  | 'trophy'
  /** ぬくぬく: 召喚時おやつ+1 */
  | 'cozy'
  /** お宝掘り: 空きレーン成功時おやつ+1 */
  | 'loot'
  /** 根性: 守りきったときおやつ+1 */
  | 'grit'
  /** 樽: 召喚時おやつ+1＆みきり構え */
  | 'barrel'
  /** 猛吹雪: 相手の犬だけ守り-1（このターン） */
  | 'blizzard'
  /** 灰の亡霊: パワー＝守りでもチャレンジ成功（おやつダメ0） */
  | 'ghost'
  /** 青舌: 守りきったとき相手の元気-1 */
  | 'blue_tongue'
  /** 無声: 遠吠え・猛吹雪の守り-1を受けない */
  | 'silent'
  /** 流麗: 空きレーンのおやつダメがパワーと同じ（−1しない） */
  | 'silk'
  /** おっとり: この犬へのクリティカルは発生しない */
  | 'gentle'
  /** 守護: 牧畜無効＆退場時のおやつダメ-1 */
  | 'ward'
  /** 闘志: 犬へのチャレンジ失敗時、相手のおやつ-1 */
  | 'fight'
  /** 孤高: 味方に他の犬がいないときパワー+1 */
  | 'aloof'
  /** もふケア: 回復コマンドのおやつ+1 */
  | 'nurse'
  /** 救援: おやつ半分以下のとき、回復のおやつさらに+1 */
  | 'comeback'

export type DogRole =
  | 'assassin'
  | 'bruiser'
  | 'tank'
  | 'lane'
  | 'support'
  | 'tempo'
  | 'value'

export type DogCommands = readonly [CommandId, CommandId, CommandId, CommandId]

export interface DogDef {
  id: string
  name: string
  cost: number
  power: number
  defense: number
  ability: AbilityId
  abilityName: string
  abilityText: string
  hue: number
  element: ElementId
  role: DogRole
  /** この犬が覚えるコマンド（4つ・回数制限あり） */
  commands: DogCommands
}

/**
 * ロール＋特技ユニーク化。
 * 攻撃3+回復1（タンクは守備多め可）。コストはステ＋特技の強さに合わせる。
 */
export const DOGS: DogDef[] = [
  {
    id: 'shiba',
    name: '柴犬',
    role: 'bruiser',
    cost: 2,
    power: 2,
    defense: 2,
    ability: 'tsun',
    abilityName: 'ツン',
    abilityText: 'この犬へのチャレンジを1度だけ無効にする',
    hue: 25,
    element: 'smart',
    commands: ['side_eye', 'rush', 'tackle', 'think'],
  },
  {
    id: 'corgi',
    name: 'コーギー',
    role: 'tempo',
    cost: 3,
    power: 2,
    defense: 2,
    ability: 'herding',
    abilityName: '牧畜',
    abilityText: '召喚時、相手の犬1体を控えに戻す',
    hue: 35,
    element: 'smart',
    commands: ['patrol', 'sneak', 'hound', 'think'],
  },
  {
    id: 'golden',
    name: 'ゴールデン',
    role: 'support',
    cost: 2,
    power: 1,
    defense: 2,
    ability: 'nurse',
    abilityName: 'もふケア',
    abilityText: '回復コマンドのおやつ+1（攻撃は控えめ）',
    hue: 40,
    element: 'fluffy',
    commands: ['feast', 'cuddle', 'sit', 'strike'],
  },
  {
    id: 'dachshund',
    name: 'ダックス',
    role: 'lane',
    cost: 1,
    power: 1,
    defense: 2,
    ability: 'low_profile',
    abilityName: '低姿勢',
    abilityText: 'パワー2以下からのチャレンジを受けない',
    hue: 20,
    element: 'wild',
    commands: ['tunnel', 'hound', 'sneak', 'romp'],
  },
  {
    id: 'husky',
    name: 'ハスキー',
    role: 'support',
    cost: 3,
    power: 3,
    defense: 2,
    ability: 'howl',
    abilityName: '遠吠え',
    abilityText: '召喚時、すべての犬の守り-1（このターン）',
    hue: 210,
    element: 'run',
    commands: ['bay', 'pounce', 'raid', 'rush'],
  },
  {
    id: 'greyhound',
    name: 'グレーハウンド',
    role: 'assassin',
    cost: 3,
    power: 3,
    defense: 1,
    ability: 'sprint',
    abilityName: '疾走',
    abilityText: 'チャレンジのパワー+1',
    hue: 200,
    element: 'run',
    commands: ['blitz', 'pounce', 'leap', 'trot'],
  },
  {
    id: 'mastiff',
    name: 'マスティフ',
    role: 'tank',
    cost: 4,
    power: 2,
    defense: 5,
    ability: 'guard',
    abilityName: '番犬',
    abilityText: 'この犬がいる間、直接チャレンジのおやつダメージ-1',
    hue: 15,
    element: 'wild',
    commands: ['wall', 'rush', 'tackle', 'romp'],
  },
  {
    id: 'labrador',
    name: 'ラブラドール',
    role: 'value',
    cost: 2,
    power: 2,
    defense: 2,
    ability: 'fetch',
    abilityName: 'レトリーブ',
    abilityText: 'チャレンジ成功時、手札を1枚引く',
    hue: 30,
    element: 'smart',
    commands: ['fetch_cmd', 'rush', 'pinch', 'strike'],
  },
  {
    id: 'pug',
    name: 'パグ',
    role: 'tempo',
    cost: 1,
    power: 1,
    defense: 1,
    ability: 'nap',
    abilityName: 'お昼寝',
    abilityText: '召喚時、元気+1',
    hue: 50,
    element: 'fluffy',
    commands: ['snore', 'sneak', 'patrol', 'strike'],
  },
  {
    id: 'terrier',
    name: 'テリア',
    role: 'assassin',
    cost: 2,
    power: 3,
    defense: 1,
    ability: 'dig',
    abilityName: '掘る',
    abilityText: 'チャレンジで犬を退場させたとき、追加でおやつ1',
    hue: 45,
    element: 'wild',
    commands: ['tunnel', 'pounce', 'snap', 'romp'],
  },
  {
    id: 'pomeranian',
    name: 'ポメラニアン',
    role: 'support',
    cost: 1,
    power: 1,
    defense: 1,
    ability: 'cheer',
    abilityName: '応援',
    abilityText: '味方の他の犬のパワー+1（場にいる間）',
    hue: 5,
    element: 'wild',
    commands: ['rush', 'strike', 'patrol', 'romp'],
  },
  {
    id: 'samoyed',
    name: 'サモエド',
    role: 'tank',
    cost: 3,
    power: 1,
    defense: 4,
    ability: 'fluffy',
    abilityName: 'もふもふ',
    abilityText: '退場するとき、おやつダメージを1防ぐ',
    hue: 0,
    element: 'fluffy',
    commands: ['strike', 'tackle', 'guard', 'cuddle'],
  },
  {
    id: 'shepherd',
    name: 'シェパード',
    role: 'bruiser',
    cost: 3,
    power: 2,
    defense: 3,
    ability: 'alert',
    abilityName: '警戒',
    abilityText: 'この犬へのチャレンジはパワー-1として扱う',
    hue: 55,
    element: 'smart',
    commands: ['rush', 'pinch', 'tackle', 'think'],
  },
  {
    id: 'newfoundland',
    name: 'ニューファン',
    role: 'tank',
    cost: 4,
    power: 2,
    defense: 4,
    ability: 'barrel',
    abilityName: '浮き袋',
    abilityText: '召喚時、おやつ+1＆みきり構え',
    hue: 220,
    element: 'fluffy',
    commands: ['rush', 'strike', 'guard', 'cuddle'],
  },
  {
    id: 'beagle',
    name: 'ビーグル',
    role: 'bruiser',
    cost: 2,
    power: 2,
    defense: 2,
    ability: 'track',
    abilityName: '嗅覚',
    abilityText: 'チャレンジ時、相手の守りを1無視する',
    hue: 28,
    element: 'run',
    commands: ['scent', 'rush', 'hound', 'trot'],
  },
  {
    id: 'border_collie',
    name: 'ボーダーコリー',
    role: 'tempo',
    cost: 3,
    power: 2,
    defense: 2,
    ability: 'bounce',
    abilityName: '機敏',
    abilityText: 'チャレンジ後、この犬を手札に戻す',
    hue: 240,
    element: 'smart',
    commands: ['patrol', 'sneak', 'hound', 'think'],
  },
  {
    id: 'chihuahua',
    name: 'チワワ',
    role: 'tempo',
    cost: 1,
    power: 2,
    defense: 1,
    ability: 'nibble',
    abilityName: 'かじる',
    abilityText: '召喚時、相手のおやつ-1',
    hue: 12,
    element: 'wild',
    commands: ['yap', 'pounce', 'raid', 'romp'],
  },
  {
    id: 'akita',
    name: '秋田',
    role: 'tank',
    cost: 3,
    power: 2,
    defense: 4,
    ability: 'stubborn',
    abilityName: '頑固',
    abilityText: '牧畜で控えに戻されない',
    hue: 18,
    element: 'wild',
    commands: ['rush', 'tackle', 'guard', 'romp'],
  },
  {
    id: 'bulldog',
    name: 'ブルドッグ',
    role: 'bruiser',
    cost: 2,
    power: 2,
    defense: 3,
    ability: 'grit',
    abilityName: '根性',
    abilityText: 'この犬がチャレンジを守りきったとき、おやつ+1',
    hue: 8,
    element: 'wild',
    commands: ['rush', 'pinch', 'tackle', 'romp'],
  },
  {
    id: 'shih_tzu',
    name: 'シーズー',
    role: 'value',
    cost: 2,
    power: 1,
    defense: 2,
    ability: 'snack',
    abilityName: 'おかわり',
    abilityText: 'チャレンジ成功時、自分のおやつ+1',
    hue: 48,
    element: 'fluffy',
    commands: ['strike', 'rush', 'patrol', 'cuddle'],
  },
  {
    id: 'dalmatian',
    name: 'ダルメシアン',
    role: 'lane',
    cost: 3,
    power: 3,
    defense: 2,
    ability: 'spots',
    abilityName: 'スポット',
    abilityText: 'この犬がいる間、空きレーンへのダメージ+1',
    hue: 0,
    element: 'run',
    commands: ['zoom', 'leap', 'sneak', 'trot'],
  },
  {
    id: 'st_bernard',
    name: 'セントバーナード',
    role: 'support',
    cost: 3,
    power: 1,
    defense: 4,
    ability: 'comeback',
    abilityName: '救援',
    abilityText: 'おやつが半分以下のとき、回復コマンドのおやつさらに+1',
    hue: 22,
    element: 'fluffy',
    commands: ['sit', 'feast', 'brace', 'strike'],
  },
  {
    id: 'whippet',
    name: 'ウィペット',
    role: 'assassin',
    cost: 3,
    power: 3,
    defense: 1,
    ability: 'gale',
    abilityName: '疾風',
    abilityText: 'チャレンジのパワー+1、かつ守りを1無視',
    hue: 195,
    element: 'run',
    commands: ['pounce', 'leap', 'snap', 'trot'],
  },
  {
    id: 'french_bulldog',
    name: 'フレブル',
    role: 'support',
    cost: 1,
    power: 1,
    defense: 2,
    ability: 'cozy',
    abilityName: 'ぬくぬく',
    abilityText: '召喚時、自分のおやつ+1',
    hue: 320,
    element: 'fluffy',
    commands: ['snore', 'rush', 'sneak', 'strike'],
  },
  {
    id: 'malamute',
    name: 'マラミュート',
    role: 'support',
    cost: 3,
    power: 2,
    defense: 3,
    ability: 'blizzard',
    abilityName: '猛吹雪',
    abilityText: '召喚時、相手の犬だけ守り-1（このターン）',
    hue: 215,
    element: 'run',
    commands: ['snow_call', 'pounce', 'raid', 'rush'],
  },
  {
    id: 'jack_russell',
    name: 'ジャックラッセル',
    role: 'lane',
    cost: 2,
    power: 3,
    defense: 1,
    ability: 'loot',
    abilityName: 'お宝掘り',
    abilityText: '空きレーンへのチャレンジ成功時、おやつ+1',
    hue: 42,
    element: 'wild',
    commands: ['zoom', 'sneak', 'hound', 'romp'],
  },
  {
    id: 'collie',
    name: 'コリー',
    role: 'support',
    cost: 3,
    power: 2,
    defense: 2,
    ability: 'rally',
    abilityName: '号令',
    abilityText: '召喚時、味方全員がもう一度チャレンジ可能に',
    hue: 250,
    element: 'smart',
    commands: ['patrol', 'rush', 'hound', 'think'],
  },
  {
    id: 'cocker',
    name: 'コッカー',
    role: 'value',
    cost: 2,
    power: 2,
    defense: 2,
    ability: 'last_bark',
    abilityName: 'おかえり吠え',
    abilityText: 'この犬が退場したとき、手札を1枚引く',
    hue: 32,
    element: 'smart',
    commands: ['rush', 'pinch', 'strike', 'think'],
  },
  {
    id: 'flat_coated',
    name: 'フラットコーテッド',
    role: 'value',
    cost: 3,
    power: 2,
    defense: 3,
    ability: 'trophy',
    abilityName: '漆黒の戦利品',
    abilityText: 'チャレンジで犬を退場させたとき、おやつ+1',
    hue: 260,
    element: 'smart',
    commands: ['rush', 'leap', 'tackle', 'think'],
  },
  {
    id: 'weimaraner',
    name: 'ワイマラナー',
    role: 'bruiser',
    cost: 3,
    power: 3,
    defense: 2,
    ability: 'ghost',
    abilityName: '灰の亡霊',
    abilityText: 'パワーが守りと同じでもチャレンジ成功（おやつダメージは0）',
    hue: 210,
    element: 'smart',
    commands: ['shade', 'pounce', 'hound', 'trot'],
  },
  {
    id: 'chow_chow',
    name: 'チャウチャウ',
    role: 'bruiser',
    cost: 3,
    power: 2,
    defense: 3,
    ability: 'blue_tongue',
    abilityName: '青舌',
    abilityText: 'この犬がチャレンジを守りきったとき、相手の元気-1',
    hue: 18,
    element: 'fluffy',
    commands: ['glare', 'rush', 'tackle', 'pinch'],
  },
  {
    id: 'basenji',
    name: 'バセンジー',
    role: 'tempo',
    cost: 2,
    power: 2,
    defense: 2,
    ability: 'silent',
    abilityName: '無声',
    abilityText: '遠吠え・猛吹雪による守り-1を受けない',
    hue: 28,
    element: 'wild',
    commands: ['hush', 'sneak', 'rush', 'patrol'],
  },
  {
    id: 'afghan_hound',
    name: 'アフガンハウンド',
    role: 'assassin',
    cost: 3,
    power: 3,
    defense: 1,
    ability: 'silk',
    abilityName: '流麗',
    abilityText: '空きレーンへのおやつダメージがパワーと同じ（−1しない）',
    hue: 38,
    element: 'run',
    commands: ['flutter', 'pounce', 'leap', 'trot'],
  },
  {
    id: 'great_dane',
    name: 'グレートデン',
    role: 'bruiser',
    cost: 4,
    power: 3,
    defense: 3,
    ability: 'gentle',
    abilityName: 'おっとり',
    abilityText: 'この犬へのクリティカルは発生しない',
    hue: 210,
    element: 'smart',
    commands: ['stomp', 'rush', 'pinch', 'trot'],
  },
  {
    id: 'tibetan_mastiff',
    name: 'チベタンマスティフ',
    role: 'tank',
    cost: 4,
    power: 2,
    defense: 6,
    ability: 'ward',
    abilityName: '守護',
    abilityText: '牧畜で控えに戻されない。退場するときおやつダメージを1防ぐ',
    hue: 25,
    element: 'wild',
    commands: ['plateau', 'rush', 'tackle', 'guard'],
  },
  {
    id: 'tosa',
    name: '土佐犬',
    role: 'bruiser',
    cost: 3,
    power: 3,
    defense: 2,
    ability: 'fight',
    abilityName: '闘志',
    abilityText: '犬へのチャレンジに失敗したとき、相手のおやつ-1',
    hue: 12,
    element: 'wild',
    commands: ['clash', 'rush', 'pounce', 'romp'],
  },
  {
    id: 'borzoi',
    name: 'ボルゾイ',
    role: 'assassin',
    cost: 3,
    power: 3,
    defense: 1,
    ability: 'aloof',
    abilityName: '孤高',
    abilityText: '味方に他の犬がいないとき、チャレンジのパワー+1',
    hue: 220,
    element: 'run',
    commands: ['course', 'pounce', 'leap', 'trot'],
  },
]

export const DOG_MAP = Object.fromEntries(DOGS.map((d) => [d.id, d])) as Record<
  string,
  DogDef
>

/**
 * 対戦開始時にシャッフルして 10 枚ずつ配る共有プール。
 * 固定の「P2だけ強い」偏りを避ける。
 */
export const DEAL_POOL: string[] = [
  'pug',
  'french_bulldog',
  'dachshund',
  'chihuahua',
  'pomeranian',
  'shiba',
  'bulldog',
  'labrador',
  'cocker',
  'flat_coated',
  'whippet',
  'greyhound',
  'beagle',
  'terrier',
  'jack_russell',
  'shih_tzu',
  'husky',
  'malamute',
  'corgi',
  'collie',
  'samoyed',
  'akita',
  'shepherd',
  'border_collie',
  'golden',
  'mastiff',
  'newfoundland',
  'st_bernard',
  'dalmatian',
  'weimaraner',
  'chow_chow',
  'basenji',
  'afghan_hound',
  'great_dane',
  'tibetan_mastiff',
  'tosa',
  'borzoi',
]

/** 互換用: プール前半/後半の目安（実際の対戦は DEAL_POOL を分流） */
export const DECK_A: string[] = DEAL_POOL.slice(0, 10)
export const DECK_B: string[] = DEAL_POOL.slice(10, 20)
