## Laya Playground (local)

Solid.js + vite-plugin-pages のサンプルを、[laya](https://laya-ai.com/runtimes/nodejs)
(`@receptron/laya`, ONNX Runtime) を使うためのローカル実行 Playground に書き換えたものです。

ブラウザから直接 ONNX は動かないため、構成は次の2層です。

- フロントエンド: Solid.js の Playground UI (`src/pages/index.tsx`, `/about`)
- バックエンド: Node.js の薄い API サーバ (`server/laya-server.mjs`) が `Laya.load()` を保持し、`POST /api/system-one` を `laya.systemOne()` に渡す

ローカル実行前提・セキュリティ最低限 (CORS 全許可、認証なし) です。公開する場合は認証等を付けてください。

### 必要条件

- Node.js 20 以上
- RAM 約2GB + 余裕 (ONNX 重み約1.7GBを初回に Hugging Face から取得)

### 起動

```bash
pnpm install
pnpm run server   # http://localhost:3001 (初回は重み取得で数分かかります)
pnpm run dev      # http://localhost:3000 (Vite が /api を :3001 にプロキシ)
```

### 環境変数 (サーバ側)

| 変数                                             | 意味                                                      |
| ------------------------------------------------ | --------------------------------------------------------- |
| `PORT`                                           | 待受ポート (既定 3001)                                    |
| `LAYA_MODEL_DIR`                                 | ローカルの ONNX バンドル配置 (指定時はダウンロードしない) |
| `LAYA_CACHE`                                     | ダウンロードキャッシュ (既定 `~/.cache/receptron-laya`)   |
| `LAYA_REPO` / `LAYA_SUBFOLDER` / `LAYA_REVISION` | Hugging Face 取得先の上書き                               |
| `HF_TOKEN`                                       | プライベートリポジトリ用トークン                          |

### API

- `GET /api/health` → `{ ok, loaded, modelDir, config }`
- `POST /api/system-one` → `{ state, questions }` を受けて `systemOne` 結果に `elapsedMs` を付けて返す

### 遊び方

1. プリセット (サポート振り分け / モデルルーティング / ガードレール / RAG / モデレーション / フィッシング) を選ぶ
2. State と Questions を編集する (choice / score / noul)
3. `Run Laya` で確率付きの判定結果・Raw JSON・TS スニペットを確認する
