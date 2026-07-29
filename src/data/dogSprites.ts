export type DogPose =
  | 'front'
  | 'happy'
  | 'sad'
  | 'walk0'
  | 'walk1'
  | 'walk2'
  | 'walk3'

type Sheet = Partial<Record<DogPose, string>>

const WALK_POSES: DogPose[] = ['walk0', 'walk1', 'walk2', 'walk3']

/**
 * `src/assets/dogs/<犬種ID>/{front,happy,sad,walk*}.png` を自動収集。
 * シート追加後:
 *   node scripts/extract-dog-sprites.mjs <id> src/assets/<file>.png
 */
const modules = import.meta.glob('../assets/dogs/*/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const DOG_SPRITES: Record<string, Sheet> = {}

for (const [path, url] of Object.entries(modules)) {
  const m = path.match(/\/dogs\/([^/]+)\/([^/]+)\.png$/)
  if (!m) continue
  const [, breedId, pose] = m
  if (
    pose !== 'front' &&
    pose !== 'happy' &&
    pose !== 'sad' &&
    pose !== 'walk0' &&
    pose !== 'walk1' &&
    pose !== 'walk2' &&
    pose !== 'walk3'
  ) {
    continue
  }
  if (!DOG_SPRITES[breedId]) DOG_SPRITES[breedId] = {}
  DOG_SPRITES[breedId][pose as DogPose] = url
}

export function getDogSprite(
  cardId: string,
  pose: DogPose = 'front',
): string | null {
  const sheet = DOG_SPRITES[cardId]
  if (!sheet) return null
  return sheet[pose] ?? sheet.front ?? null
}

export function getWalkSprites(cardId: string): string[] {
  const sheet = DOG_SPRITES[cardId]
  if (!sheet) return []
  return WALK_POSES.map((p) => sheet[p]).filter((u): u is string => Boolean(u))
}

export function hasDogSprite(cardId: string): boolean {
  return Boolean(DOG_SPRITES[cardId]?.front)
}

export function listSpriteBreeds(): string[] {
  return Object.keys(DOG_SPRITES).sort()
}
