import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  createGame,
  isLegal,
  onlyEndTurnLeft,
  reduce,
  type Action,
  type GameState,
  type PlayerId,
} from '../src/engine/index.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 8787)
const isProd = process.env.NODE_ENV === 'production'

interface Client {
  ws: WebSocket
  playerId: PlayerId
}

interface Room {
  code: string
  state: GameState | null
  clients: Client[]
}

const rooms = new Map<string, Room>()

function codeGen(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

function send(ws: WebSocket, msg: object) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
}

function broadcastState(room: Room) {
  if (!room.state) return
  for (const c of room.clients) {
    send(c.ws, { type: 'state', state: room.state })
  }
}

/** 行動後、動ける手がなければ自動でターンを進める */
function applyAndAutoPass(room: Room, action: Action) {
  if (!room.state) return
  room.state = reduce(room.state, action)
  let guard = 0
  while (
    room.state.winner === null &&
    onlyEndTurnLeft(room.state) &&
    guard < 6
  ) {
    room.state = reduce(room.state, { type: 'END_TURN' })
    guard += 1
  }
}

function findRoomByWs(ws: WebSocket): { room: Room; client: Client } | null {
  for (const room of rooms.values()) {
    const client = room.clients.find((c) => c.ws === ws)
    if (client) return { room, client }
  }
  return null
}

const app = express()

const corsOrigin = process.env.CORS_ORIGIN?.replace(/\/$/, '')
const serveStatic = isProd && process.env.SERVE_STATIC !== '0'

/** 静的サイトと API を分けたときの CORS（/health 用） */
app.use((req, res, next) => {
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin)
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }
  }
  next()
})

/** Render スリープ解除・疎通確認用（静的配信より先に登録） */
app.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ ok: true, service: 'wanpl' })
})

if (serveStatic) {
  const dist = path.join(__dirname, '../dist')
  app.use(express.static(dist))
  app.get('/{*path}', (req, res, next) => {
    if (req.path === '/ws' || req.path === '/health') return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

const server = createServer(app)
const wss = new WebSocketServer({ server, path: isProd ? '/ws' : undefined })

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg: { type: string; code?: string; action?: Action }
    try {
      msg = JSON.parse(String(raw))
    } catch {
      send(ws, { type: 'error', message: '不正なメッセージ' })
      return
    }

    if (msg.type === 'create') {
      let code = codeGen()
      while (rooms.has(code)) code = codeGen()
      const room: Room = {
        code,
        state: null,
        clients: [{ ws, playerId: 0 }],
      }
      rooms.set(code, room)
      send(ws, { type: 'room_created', code, playerId: 0 })
      send(ws, { type: 'waiting' })
      return
    }

    if (msg.type === 'join') {
      const code = (msg.code ?? '').toUpperCase()
      const room = rooms.get(code)
      if (!room) {
        send(ws, { type: 'error', message: '部屋が見つかりません' })
        return
      }
      if (room.clients.length >= 2) {
        send(ws, { type: 'error', message: '部屋が満員です' })
        return
      }
      room.clients.push({ ws, playerId: 1 })
      room.state = createGame()
      // 開始時点で動けない場合の保険
      let guard = 0
      while (
        room.state.winner === null &&
        onlyEndTurnLeft(room.state) &&
        guard < 6
      ) {
        room.state = reduce(room.state, { type: 'END_TURN' })
        guard += 1
      }
      send(ws, { type: 'joined', code, playerId: 1 })
      broadcastState(room)
      return
    }

    if (msg.type === 'action') {
      const found = findRoomByWs(ws)
      if (!found || !found.room.state || !msg.action) {
        send(ws, { type: 'error', message: '部屋がありません' })
        return
      }
      const { room, client } = found
      if (room.state.winner !== null) return
      if (room.state.activePlayer !== client.playerId) {
        send(ws, { type: 'error', message: 'あなたの番ではありません' })
        return
      }
      if (!isLegal(room.state, msg.action)) {
        send(ws, { type: 'error', message: 'その行動はできません' })
        return
      }
      applyAndAutoPass(room, msg.action)
      broadcastState(room)
      return
    }
  })

  ws.on('close', () => {
    const found = findRoomByWs(ws)
    if (!found) return
    const { room } = found
    for (const c of room.clients) {
      if (c.ws !== ws) send(c.ws, { type: 'opponent_left' })
    }
    rooms.delete(room.code)
  })
})

server.listen(PORT, () => {
  console.log(`Wanpl server on http://localhost:${PORT}`)
})
