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

スターサーバーなどの共有レンタルでは WebSocket 常駐ができないため、オンライン込みは Render 向きです.

### かんたん（1サービス）

静的ファイルと WebSocket を同じ Web Service で配信します。

1. このリポジトリを GitHub に push
2. [Render](https://render.com) で **New → Web Service**（または Blueprint で `render.yaml`）
3. 設定例:
   - **Runtime**: Node
   - **Build**: `npm install && npm run build`
   - **Start**: `NODE_ENV=production npm start`
   - **Health Check Path**: `/health`
   - Node 20 以上（`.node-version` あり）
4. 本番の WS は `wss://そのドメイン/ws`

無料プランでスリープすると、**最初のページ表示自体**がブラウザ待ちになります（HTML が返るまで React の起動画面は出せません）。オンライン入室時は `/health` をポーリングして「サーバー起動中…」を出します。

### 推奨: フロントと API を分ける

タイトルをすぐ出して、起こし待ちは Wanpl の画面で見せたいとき。

| | Static Site（フロント） | Web Service（API） |
|---|---|---|
| 役割 | `dist` を配信 | `/health` + `/ws` のみ |
| スリープ | しにくい | 無料プランはする |
| 環境変数 | `VITE_API_ORIGIN=https://xxxx-api.onrender.com`（**ビルド時**） | `SERVE_STATIC=0` / `CORS_ORIGIN=https://フロントのURL` |

1. API 用 Web Service をデプロイ（Start: `NODE_ENV=production SERVE_STATIC=0 npm start`、Health: `/health`）
2. Static Site をデプロイ（Build: `npm install && npm run build`、Publish: `dist`）し、`VITE_API_ORIGIN` に API の URL を設定して **再ビルド**
3. API に `CORS_ORIGIN` をフロントの URL で設定

`vite` / `typescript` / `tsx` は dependencies に入れてあるので、Render で `NODE_ENV=production` が付いていてもビルドできます。
