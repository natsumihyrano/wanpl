#!/usr/bin/env node
/**
 * スプライトシート（約1254x1254、上3x4コマ＋下部図鑑）から各フレームを切り出す。
 *
 * 均等グリッドだと隣コマの見切れが残るため:
 *  1) 投影で行・列の境界を推定
 *  2) セル内の最大連結成分だけ残してクロップ
 *
 * 使い方:
 *   node scripts/extract-dog-sprites.mjs golden src/assets/golden.png
 *   node scripts/extract-dog-sprites.mjs husky src/assets/hasky.png
 *   node scripts/extract-dog-sprites.mjs --all
 */
import fs from 'fs'
import path from 'path'
import { PNG } from 'pngjs'

const COLS = 4
const ROWS = 3
const FRAME_NAMES = [
  'front',
  'left',
  'right',
  'back',
  'walk0',
  'walk1',
  'walk2',
  'walk3',
  'bone',
  'happy',
  'sad',
  'hearts',
]

const SHEET_MAP = {
  akita: 'src/assets/akita.png',
  beagle: 'src/assets/beagle.png',
  border_collie: 'src/assets/border_collie.png',
  bulldog: 'src/assets/bulldog.png',
  chihuahua: 'src/assets/chihuahua.png',
  cocker: 'src/assets/cocker.png',
  collie: 'src/assets/collie.png',
  corgi: 'src/assets/corgi.png',
  dachshund: 'src/assets/dachshund.png',
  dalmatian: 'src/assets/dalmatian.png',
  flat_coated: 'src/assets/flat.png',
  french_bulldog: 'src/assets/french_bulldog.png',
  golden: 'src/assets/golden.png',
  greyhound: 'src/assets/greyhound.png',
  husky: 'src/assets/hasky.png',
  jack_russell: 'src/assets/jack_russell.png',
  labrador: 'src/assets/labrador.png',
  malamute: 'src/assets/malamute.png',
  mastiff: 'src/assets/mastiff.png',
  newfoundland: 'src/assets/newfoundland.png',
  pomeranian: 'src/assets/pomeranian.png',
  pug: 'src/assets/pug.png',
  samoyed: 'src/assets/samoyed.png',
  shepherd: 'src/assets/shepherd.png',
  shiba: 'src/assets/shiba.png',
  shih_tzu: 'src/assets/shih_tzu.png',
  st_bernard: 'src/assets/st_bernard.png',
  terrier: 'src/assets/terrier.png',
  whippet: 'src/assets/whippet.png',
}

const args = process.argv.slice(2)
if (args[0] === '--all') {
  for (const [id, file] of Object.entries(SHEET_MAP)) {
    if (!fs.existsSync(file)) {
      console.warn('skip missing', file)
      continue
    }
    extractBreed(id, file)
  }
  process.exit(0)
}

const [breedId, sheetPath] = args
if (!breedId || !sheetPath) {
  console.error(
    'Usage: node scripts/extract-dog-sprites.mjs <breedId> <sheet.png>\n' +
      '       node scripts/extract-dog-sprites.mjs --all',
  )
  process.exit(1)
}
extractBreed(breedId, sheetPath)

function extractBreed(breedId, sheetPath) {
  const outDir = path.join('src/assets/dogs', breedId)
  const png = PNG.sync.read(fs.readFileSync(sheetPath))
  const gridBottom = detectGridBottom(png)
  const rowBounds = detectRowBounds(png, gridBottom)

  fs.mkdirSync(outDir, { recursive: true })

  const colSummaries = []
  for (let row = 0; row < ROWS; row++) {
    // 行ごとに列境界が違う（walkは詰まり、frontは空きが大きい）
    const colBounds = detectColBoundsForRow(
      png,
      rowBounds[row],
      rowBounds[row + 1],
    )
    colSummaries.push(
      colBounds
        .map((v, i) => (i ? v - colBounds[i - 1] : v))
        .slice(1)
        .join('/'),
    )
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col
      // ガター中央からわずかに内側へ（隣コマを入れない）
      const gapL = col > 0 ? 4 : 1
      const gapR = col < COLS - 1 ? 4 : 1
      const x0 = colBounds[col] + gapL
      const x1 = colBounds[col + 1] - gapR
      const y0 = rowBounds[row] + (row > 0 ? 1 : 0)
      const y1 = rowBounds[row + 1] - (row < ROWS - 1 ? 1 : 0)
      const cw = Math.max(8, x1 - x0)
      const ch = Math.max(8, y1 - y0)
      const cell = cropRect(png, x0, y0, cw, ch)
      // 隣コマは白ギャップで分かれる想定。最大塊＋近傍の飾りだけ残す
      const main = keepLargestBlob(cell)
      const withExtras = keepNearbyIslands(cell, main, 28)
      const cleaned = stripBorderArtifacts(withExtras)
      const keyed = keyWhite(trimWhite(cleaned, 2))
      fs.writeFileSync(
        path.join(outDir, `${FRAME_NAMES[idx]}.png`),
        PNG.sync.write(keyed),
      )
    }
  }
  console.log(
    `Extracted ${FRAME_NAMES.length} -> ${outDir} (gridBottom=${gridBottom}, rows=${rowBounds.join('/')}, cols=${colSummaries.join(' | ')})`,
  )
}

function isContentPixel(data, w, x, y) {
  const i = (y * w + x) << 2
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  const a = data[i + 3]
  if (a < 20) return false
  // near-white background
  if (r > 245 && g > 245 && b > 245) return false
  return true
}

function detectGridBottom(png) {
  const { width: w, height: h, data } = png
  // 図鑑帯は下側。上から見て「ほぼ白の帯」が続く終端を探す
  const rowDark = new Array(h).fill(0)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isContentPixel(data, w, x, y)) rowDark[y]++
    }
  }
  // 900〜1100あたりで密度が落ちたあと再上昇する境界
  let best = Math.min(1000, h - 1)
  for (let y = 850; y < Math.min(1100, h - 40); y++) {
    const window = rowDark.slice(y, y + 12).reduce((a, b) => a + b, 0) / 12
    if (window < w * 0.04) {
      best = y
      break
    }
  }
  return best
}

function detectRowBounds(png, gridBottom) {
  const { width: w, data } = png
  const rowDark = new Array(gridBottom).fill(0)
  for (let y = 0; y < gridBottom; y++) {
    for (let x = 0; x < w; x++) {
      if (isContentPixel(data, w, x, y)) rowDark[y]++
    }
  }
  const thresh = w * 0.04
  const gutters = findLowBands(rowDark, thresh, 12)
  // 先頭の余白帯は除き、行間ガターを理想位置で2本選ぶ
  const mid = gutters.filter(([a, b]) => a > 80 && b < gridBottom - 40)

  let g0 = null
  let g1 = null
  if (mid.length >= 2) {
    const ideal0 = gridBottom / 3
    const ideal1 = (gridBottom * 2) / 3
    g0 = mid.reduce((best, g) =>
      Math.abs((g[0] + g[1]) / 2 - ideal0) <
      Math.abs((best[0] + best[1]) / 2 - ideal0)
        ? g
        : best,
    )
    g1 = mid
      .filter((g) => g !== g0)
      .reduce((best, g) =>
        Math.abs((g[0] + g[1]) / 2 - ideal1) <
        Math.abs((best[0] + best[1]) / 2 - ideal1)
          ? g
          : best,
      )
    if (g0[0] > g1[0]) [g0, g1] = [g1, g0]
  }

  if (g0 && g1) {
    // ガター開始＝前行の終端、ガター終端＋1＝次行の開始（影を残す）
    return [0, g0[0], g1[0], gridBottom]
  }

  return [
    0,
    Math.floor(gridBottom / 3),
    Math.floor((gridBottom * 2) / 3),
    gridBottom,
  ]
}

/** 1行分のコンテンツ投影から、列間の白ギャップ中央を境界にする */
function detectColBoundsForRow(png, y0, y1) {
  const { width: w, data } = png
  const ch = Math.max(1, y1 - y0)
  // 足元の影で隣と繋がることがあるので、上〜中腹だけ見る
  const bodyY0 = y0 + Math.floor(ch * 0.06)
  const bodyY1 = y0 + Math.floor(ch * 0.78)
  const colDark = new Array(w).fill(0)
  for (let y = bodyY0; y < bodyY1; y++) {
    for (let x = 0; x < w; x++) {
      if (isContentPixel(data, w, x, y)) colDark[x]++
    }
  }

  const gaps = findLowBands(colDark, 2, 5).filter(
    ([a, b]) => a > 60 && b < w - 60,
  )

  const ideals = [w / 4, w / 2, (3 * w) / 4]
  const maxDist = w * 0.14
  const splits = []
  const used = new Set()
  for (const ideal of ideals) {
    let best = null
    let bestScore = Infinity
    for (const g of gaps) {
      if (used.has(g)) continue
      const mid = (g[0] + g[1]) / 2
      const score = Math.abs(mid - ideal)
      if (score > maxDist) continue
      if (score < bestScore) {
        bestScore = score
        best = g
      }
    }
    if (best) {
      used.add(best)
      splits.push(Math.floor((best[0] + best[1]) / 2))
    } else {
      splits.push(findValley(colDark, ideal, Math.floor(w * 0.11)))
    }
  }
  splits.sort((a, b) => a - b)

  // 列幅が極端なら、理想位置付近の谷にフォールバック
  const bounds = [0, ...splits, w]
  let bad = false
  for (let i = 0; i < 4; i++) {
    const width = bounds[i + 1] - bounds[i]
    if (width < 180 || width > 420) bad = true
  }
  if (bad) {
    const forced = ideals.map((ideal) =>
      findValley(colDark, ideal, Math.floor(w * 0.12)),
    )
    forced.sort((a, b) => a - b)
    return [0, ...forced, w]
  }
  return bounds
}

function findValley(colDark, ideal, radius) {
  const w = colDark.length
  const a = Math.max(40, Math.floor(ideal - radius))
  const b = Math.min(w - 40, Math.floor(ideal + radius))
  let valley = Math.floor(ideal)
  let bv = Infinity
  // 平滑化した谷を探す
  for (let x = a; x < b; x++) {
    const v =
      (colDark[x - 2] +
        colDark[x - 1] +
        colDark[x] +
        colDark[x + 1] +
        colDark[x + 2]) /
      5
    if (v < bv) {
      bv = v
      valley = x
    }
  }
  return valley
}

function detectColBounds(png, gridBottom) {
  return detectColBoundsForRow(
    png,
    Math.floor(gridBottom * 0.05),
    Math.floor(gridBottom * 0.95),
  )
}

function pickBestSplits(candidates, n, idealGap) {
  if (candidates.length <= n) return candidates.slice(0, n)
  let best = null
  let bestScore = Infinity
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i]
      const b = candidates[j]
      const score =
        Math.abs(b - a - idealGap) +
        Math.abs(a - idealGap) * 0.3 +
        Math.abs(b - idealGap * 2) * 0.3
      if (score < bestScore) {
        bestScore = score
        best = [a, b]
      }
    }
  }
  return best ?? candidates.slice(0, n)
}

/** 細い橋を切るための侵食（4近傍が全部コンテンツの画素だけ残す） */
function erodeContent(png) {
  const { width: w, height: h, data } = png
  const out = new PNG({ width: w, height: h })
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) << 2
      if (!isContentPixel(data, w, x, y)) {
        out.data[o + 3] = 0
        continue
      }
      const ok =
        x > 0 &&
        x < w - 1 &&
        y > 0 &&
        y < h - 1 &&
        isContentPixel(data, w, x - 1, y) &&
        isContentPixel(data, w, x + 1, y) &&
        isContentPixel(data, w, x, y - 1) &&
        isContentPixel(data, w, x, y + 1)
      if (ok) {
        out.data[o] = data[o]
        out.data[o + 1] = data[o + 1]
        out.data[o + 2] = data[o + 2]
        out.data[o + 3] = data[o + 3]
      } else {
        out.data[o + 3] = 0
      }
    }
  }
  return out
}

/** mask で残った塊の近傍を、元画像から復元（輪郭を戻す） */
function restoreFromMask(original, mask) {
  const { width: w, height: h } = original
  const out = new PNG({ width: w, height: h })
  const keep = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    if (mask.data[(i << 2) + 3] > 20) keep[i] = 1
  }
  // dilate 3px（2回侵食分＋余裕）
  const dil = new Uint8Array(keep)
  for (let pass = 0; pass < 3; pass++) {
    const prev = dil.slice()
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (prev[y * w + x]) continue
        let near = false
        for (let dy = -1; dy <= 1 && !near; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
            if (prev[ny * w + nx]) {
              near = true
              break
            }
          }
        }
        if (near) dil[y * w + x] = 1
      }
    }
  }
  for (let i = 0; i < w * h; i++) {
    const o = i << 2
    if (dil[i] && isContentPixel(original.data, w, i % w, (i / w) | 0)) {
      out.data[o] = original.data[o]
      out.data[o + 1] = original.data[o + 1]
      out.data[o + 2] = original.data[o + 2]
      out.data[o + 3] = original.data[o + 3]
    } else {
      out.data[o + 3] = 0
    }
  }
  return out
}

/** 重心付近から塗れる画素だけ残す（浮いた見切れを落とす） */
function keepFloodFromCenter(png) {
  const { width: w, height: h, data } = png
  let sumX = 0
  let sumY = 0
  let n = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isContentPixel(data, w, x, y)) {
        sumX += x
        sumY += y
        n++
      }
    }
  }
  if (n === 0) return png
  let sx = Math.round(sumX / n)
  let sy = Math.round(sumY / n)
  // 重心が空なら近傍のコンテンツを探す
  if (!isContentPixel(data, w, sx, sy)) {
    let found = false
    for (let r = 1; r < Math.max(w, h) && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = sx + dx
          const y = sy + dy
          if (x < 0 || y < 0 || x >= w || y >= h) continue
          if (isContentPixel(data, w, x, y)) {
            sx = x
            sy = y
            found = true
            break
          }
        }
      }
    }
    if (!found) return png
  }

  const seen = new Uint8Array(w * h)
  const queue = [[sx, sy]]
  seen[sy * w + sx] = 1
  let qh = 0
  while (qh < queue.length) {
    const [cx, cy] = queue[qh++]
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const ni = ny * w + nx
      if (seen[ni]) continue
      seen[ni] = 1
      if (!isContentPixel(data, w, nx, ny)) continue
      queue.push([nx, ny])
    }
  }

  const out = new PNG({ width: w, height: h })
  for (let i = 0; i < w * h; i++) {
    const o = i << 2
    if (seen[i] && isContentPixel(data, w, i % w, (i / w) | 0)) {
      out.data[o] = data[o]
      out.data[o + 1] = data[o + 1]
      out.data[o + 2] = data[o + 2]
      out.data[o + 3] = data[o + 3]
    } else {
      out.data[o + 3] = 0
    }
  }
  return out
}

/** 左右端の細い見切れスジを落とす */
function stripEdgeSlivers(png) {
  const { width: w, height: h, data } = png
  const colCount = new Array(w).fill(0)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isContentPixel(data, w, x, y)) colCount[x]++
    }
  }
  const maxC = Math.max(1, ...colCount)

  // 端から「本体より明らかに細い列」を落とす
  let left = 0
  let right = w - 1
  while (left < w * 0.35 && colCount[left] < maxC * 0.12) left++
  while (right > w * 0.65 && colCount[right] < maxC * 0.12) right--

  // さらに外側2pxは、密度が低いなら強制クリア
  for (let x = 0; x < Math.min(3, w); x++) {
    if (colCount[x] < maxC * 0.2) {
      // mark for clear via left
      left = Math.max(left, x + 1)
    } else break
  }
  for (let x = w - 1; x >= Math.max(0, w - 3); x--) {
    if (colCount[x] < maxC * 0.2) {
      right = Math.min(right, x - 1)
    } else break
  }

  if (right <= left + 4) return png
  return cropRect(png, left, 0, right - left + 1, h)
}

function findLowBands(arr, thresh, minWidth) {
  const bands = []
  let inBand = false
  let start = 0
  for (let i = 0; i < arr.length; i++) {
    const low = arr[i] <= thresh
    if (low && !inBand) {
      inBand = true
      start = i
    } else if (!low && inBand) {
      if (i - start >= minWidth) bands.push([start, i - 1])
      inBand = false
    }
  }
  if (inBand && arr.length - start >= minWidth) {
    bands.push([start, arr.length - 1])
  }
  return bands
}

function movingAvg(arr, win) {
  const half = Math.floor(win / 2)
  const out = arr.slice()
  for (let i = 0; i < arr.length; i++) {
    let s = 0
    let n = 0
    for (let j = i - half; j <= i + half; j++) {
      if (j < 0 || j >= arr.length) continue
      s += arr[j]
      n++
    }
    out[i] = s / n
  }
  return out
}

function cropRect(png, x0, y0, cw, ch) {
  const { width: w, data } = png
  const out = new PNG({ width: cw, height: ch })
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const sx = x0 + x
      const sy = y0 + y
      const di = (y * cw + x) << 2
      if (sx < 0 || sy < 0 || sx >= w || sy >= png.height) {
        out.data[di + 3] = 0
        continue
      }
      const si = (sy * w + sx) << 2
      out.data[di] = data[si]
      out.data[di + 1] = data[si + 1]
      out.data[di + 2] = data[si + 2]
      out.data[di + 3] = data[si + 3]
    }
  }
  return out
}

/** セル内の最大連結成分以外を透明化（隣コマの見切れ除去） */
function keepLargestBlob(png) {
  const { width: w, height: h, data } = png
  const visited = new Uint8Array(w * h)
  const label = new Int32Array(w * h)
  let bestLabel = -1
  let bestSize = 0
  let nextLabel = 1

  const idxOf = (x, y) => y * w + x

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idxOf(x, y)
      if (visited[i]) continue
      if (!isContentPixel(data, w, x, y)) {
        visited[i] = 1
        continue
      }
      // BFS
      const queue = [[x, y]]
      visited[i] = 1
      label[i] = nextLabel
      let size = 0
      let qh = 0
      while (qh < queue.length) {
        const [cx, cy] = queue[qh++]
        size++
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx
          const ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const ni = idxOf(nx, ny)
          if (visited[ni]) continue
          visited[ni] = 1
          if (!isContentPixel(data, w, nx, ny)) continue
          label[ni] = nextLabel
          queue.push([nx, ny])
        }
      }
      if (size > bestSize) {
        bestSize = size
        bestLabel = nextLabel
      }
      nextLabel++
    }
  }

  const out = new PNG({ width: w, height: h })
  for (let i = 0; i < w * h; i++) {
    const o = i << 2
    if (label[i] === bestLabel) {
      out.data[o] = data[o]
      out.data[o + 1] = data[o + 1]
      out.data[o + 2] = data[o + 2]
      out.data[o + 3] = data[o + 3]
    } else {
      out.data[o + 3] = 0
    }
  }
  return out
}

/**
 * メイン塊のバウンディングボックス近傍にある小島（ハート・キラキラ・ほこり）を残す。
 * 隣コマ本体やセル端の見切れは除外する。
 */
function keepNearbyIslands(original, mainPng, maxDist) {
  const { width: w, height: h, data } = original
  const mainData = mainPng.data
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  let mainSize = 0
  const keep = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (mainData[(i << 2) + 3] > 20 && isContentPixel(mainData, w, x, y)) {
        keep[i] = 1
        mainSize++
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  if (mainSize === 0) return mainPng

  const visited = new Uint8Array(w * h)
  const maxIsland = Math.max(80, Math.floor(mainSize * 0.08))

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (visited[i] || keep[i]) continue
      if (!isContentPixel(data, w, x, y)) {
        visited[i] = 1
        continue
      }
      const queue = [[x, y]]
      visited[i] = 1
      const cells = [i]
      let qh = 0
      let bMinX = x
      let bMaxX = x
      let bMinY = y
      let bMaxY = y
      let touchLR = false
      while (qh < queue.length) {
        const [cx, cy] = queue[qh++]
        bMinX = Math.min(bMinX, cx)
        bMaxX = Math.max(bMaxX, cx)
        bMinY = Math.min(bMinY, cy)
        bMaxY = Math.max(bMaxY, cy)
        if (cx <= 1 || cx >= w - 2) touchLR = true
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx
          const ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const ni = ny * w + nx
          if (visited[ni] || keep[ni]) continue
          visited[ni] = 1
          if (!isContentPixel(data, w, nx, ny)) continue
          queue.push([nx, ny])
          cells.push(ni)
        }
      }
      if (cells.length > maxIsland) continue
      // セル左右端に触れる島＝隣コマの見切れ
      if (touchLR) continue
      const islandW = bMaxX - bMinX + 1
      const islandH = bMaxY - bMinY + 1
      // 1〜2px幅の縦スジは除外
      if (islandW <= 2 && islandH > 8) continue
      const dx = Math.max(0, bMinX - maxX, minX - bMaxX)
      const dy = Math.max(0, bMinY - maxY, minY - bMaxY)
      const dist = Math.hypot(dx, dy)
      if (dist > maxDist) continue
      for (const ni of cells) keep[ni] = 1
    }
  }

  const out = new PNG({ width: w, height: h })
  for (let i = 0; i < w * h; i++) {
    const o = i << 2
    if (keep[i]) {
      out.data[o] = data[o]
      out.data[o + 1] = data[o + 1]
      out.data[o + 2] = data[o + 2]
      out.data[o + 3] = data[o + 3]
    } else {
      out.data[o + 3] = 0
    }
  }
  return out
}

/** トリム後に左右端へ触れる細い塊・縦スジを落とす */
function stripBorderArtifacts(png) {
  const { width: w, height: h, data } = png
  const visited = new Uint8Array(w * h)
  const drop = new Uint8Array(w * h)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (visited[i]) continue
      if (!isContentPixel(data, w, x, y)) {
        visited[i] = 1
        continue
      }
      const queue = [[x, y]]
      visited[i] = 1
      const cells = [i]
      let qh = 0
      let bMinX = x
      let bMaxX = x
      let bMinY = y
      let bMaxY = y
      let touchL = false
      let touchR = false
      while (qh < queue.length) {
        const [cx, cy] = queue[qh++]
        bMinX = Math.min(bMinX, cx)
        bMaxX = Math.max(bMaxX, cx)
        bMinY = Math.min(bMinY, cy)
        bMaxY = Math.max(bMaxY, cy)
        if (cx === 0) touchL = true
        if (cx === w - 1) touchR = true
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx
          const ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const ni = ny * w + nx
          if (visited[ni]) continue
          visited[ni] = 1
          if (!isContentPixel(data, w, nx, ny)) continue
          queue.push([nx, ny])
          cells.push(ni)
        }
      }
      const bw = bMaxX - bMinX + 1
      const bh = bMaxY - bMinY + 1
      const size = cells.length
      const edgeHair =
        (touchL || touchR) &&
        (bw <= 4 || (size < 200 && bw < 12 && bh > bw * 2))
      const thinSliver = bw <= 2 && bh >= 10 && size < 80
      if (edgeHair || thinSliver) {
        for (const ni of cells) drop[ni] = 1
      }
    }
  }

  const out = new PNG({ width: w, height: h })
  for (let i = 0; i < w * h; i++) {
    const o = i << 2
    if (drop[i]) {
      out.data[o + 3] = 0
    } else {
      out.data[o] = data[o]
      out.data[o + 1] = data[o + 1]
      out.data[o + 2] = data[o + 2]
      out.data[o + 3] = data[o + 3]
    }
  }
  return out
}

function trimWhite(png, pad = 2) {
  const { width: w, height: h, data } = png
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isContentPixel(data, w, x, y)) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  if (maxX < minX) return png
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(w - 1, maxX + pad)
  maxY = Math.min(h - 1, maxY + pad)
  return cropRect(png, minX, minY, maxX - minX + 1, maxY - minY + 1)
}

function keyWhite(png) {
  const { width: w, height: h, data } = png
  const out = new PNG({ width: w, height: h })
  for (let i = 0; i < w * h; i++) {
    const o = i << 2
    const r = data[o]
    const g = data[o + 1]
    const b = data[o + 2]
    const a = data[o + 3]
    out.data[o] = r
    out.data[o + 1] = g
    out.data[o + 2] = b
    if (a < 20 || (r > 245 && g > 245 && b > 245)) out.data[o + 3] = 0
    else out.data[o + 3] = a
  }
  return out
}
