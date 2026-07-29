# Wanpl（わんぷれ）

犬種の特技で遊ぶ、平和なカード対戦ゲーム。God Field 風の場出し＋チャレンジを、公園のおやつ勝負に置き換えた Web ゲームです。

## 遊び方

```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- WebSocket: ws://localhost:8787

## モード

- **ローカル対戦** — 同じ画面を交代（ホットシート）
- **CPU対戦** — 簡易 AI
- **オンライン** — 部屋コード共有（ゲスト、DBなし）

## 本番ビルド

```bash
npm run build
NODE_ENV=production PORT=8787 npm start
```

同一ポートで静的ファイル（`dist`）と WebSocket（`/ws`）を配信します。

## デプロイ（Render）

スターサーバーなどの共有レンタルでは WebSocket 常駐ができないため、オンライン込みは Render 向きです。

1. このリポジトリを GitHub に push
2. [Render](https://render.com) で **New → Web Service**（または Blueprint で `render.yaml`）
3. 設定例:
   - **Runtime**: Node
   - **Build**: `npm ci && npm run build`
   - **Start**: `NODE_ENV=production npm start`
   - **Health Check Path**: `/`
   - Node 20 以上（`.node-version` あり）
4. デプロイ後の URL でローカル・CPU・オンラインが動きます（本番の WS は `wss://そのドメイン/ws`）

`vite` / `typescript` / `tsx` は dependencies に入れてあるので、Render で `NODE_ENV=production` が付いていてもビルドできます。
