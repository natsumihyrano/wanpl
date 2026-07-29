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

同一ポートで静的ファイルと WebSocket（`/ws`）を配信します。

## デプロイ（Render）

1. GitHub にリポジトリを作成して push
2. [Render](https://render.com) で **New → Blueprint**、または Web Service を作成
3. Build: `npm ci && npm run build` / Start: `NODE_ENV=production npm start`
4. 公開 URL でローカル・CPU・オンラインが動きます

`render.yaml` を置いてあるので Blueprint でも可です。
