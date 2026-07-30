/** 本番で API / WS を別ホストに分けるときのオリジン（末尾スラッシュなし） */
export function apiOrigin(): string {
  const fromEnv = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return location.origin
}

export function wsUrl(): string {
  const fromEnv = (import.meta.env.VITE_WS_URL as string | undefined)?.trim()
  if (fromEnv) return fromEnv

  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  if (import.meta.env.DEV) {
    const port = import.meta.env.VITE_WS_PORT ?? '8787'
    return `${proto}://${location.hostname}:${port}`
  }

  const base = apiOrigin()
  const u = new URL(base)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  u.pathname = '/ws'
  u.search = ''
  u.hash = ''
  return u.toString()
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * Render スリープ解除: /health をポーリングして起きてから true。
 * 失敗・タイムアウトは false（呼び出し側で WS リトライ継続可）。
 */
export async function waitUntilServerAwake(opts?: {
  aborted?: () => boolean
  timeoutMs?: number
}): Promise<boolean> {
  if (import.meta.env.DEV) return true

  const url = `${apiOrigin()}/health`
  const deadline = Date.now() + (opts?.timeoutMs ?? 90_000)

  while (Date.now() < deadline) {
    if (opts?.aborted?.()) return false
    try {
      const ctrl = new AbortController()
      const t = window.setTimeout(() => ctrl.abort(), 12_000)
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        signal: ctrl.signal,
      })
      window.clearTimeout(t)
      if (res.ok) return true
    } catch {
      /* コールドスタート中は失敗しがち */
    }
    await sleep(1400)
  }
  return false
}

/** タイトル表示中などに先回りで起こす（失敗は無視） */
export function pokeServerInBackground() {
  if (import.meta.env.DEV) return
  void fetch(`${apiOrigin()}/health`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
  }).catch(() => {})
}
