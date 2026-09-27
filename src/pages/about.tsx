export default function About() {
  return (
    <div class="min-h-screen bg-gray-50 text-gray-900">
      <main class="mx-auto max-w-3xl space-y-4 px-6 py-8">
        <h1 class="text-2xl font-bold">この Playground について</h1>
        <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 class="mb-2 font-semibold">構成</h2>
          <ul class="list-disc space-y-1 pl-5 text-sm">
            <li>フロントエンド: Solid.js + vite-plugin-pages (このサイト)</li>
            <li>バックエンド: Node.js のローカル API サーバ (server/laya-server.mjs)</li>
            <li>推論: @receptron/laya (ONNX Runtime, PyTorch / Python 不要)</li>
            <li>開発時 Vite が /api を localhost:3001 にプロキシします</li>
          </ul>
        </section>
        <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 class="mb-2 font-semibold">起動手順</h2>
          <pre class="overflow-auto rounded bg-gray-900 p-3 font-mono text-xs text-green-200">
            {`pnpm install
pnpm run server   # http://localhost:3001 (初回は約1.7GBの重みを取得)
pnpm run dev      # http://localhost:3000`}
          </pre>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>Node.js 20 以上、RAM 約2GB + 余裕が必要です</li>
            <li>重みキャッシュ: ~/.cache/receptron-laya (LAYA_CACHE で変更可)</li>
            <li>オフライン/固定バンドルを使う場合は LAYA_MODEL_DIR を指定します</li>
          </ul>
        </section>
        <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 class="mb-2 font-semibold">質問タイプ</h2>
          <ul class="list-disc space-y-1 pl-5 text-sm">
            <li>choice: 名前付き選択肢から1つ選択 + 選択肢ごとの確率</li>
            <li>score: 順序付きルーブリックの期待値 (0〜レベル数-1) + 分布</li>
            <li>noul: 命題が真である確率 P(true)</li>
          </ul>
          <p class="mt-2 text-sm text-gray-600">
            制限: 各質問の選択肢は head_max_len (192 token) 以内、state は max_len (英語 ckpt で 512
            token) で切り詰められます。choice は20選択肢以下推奨です。
          </p>
        </section>
        <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 class="mb-2 font-semibold">API</h2>
          <ul class="list-disc space-y-1 pl-5 font-mono text-sm">
            <li>GET /api/health</li>
            <li>POST /api/system-one {'{ state, questions }'}</li>
          </ul>
          <p class="mt-2 text-sm text-gray-600">
            ローカル実行前提のため認証・レート制限はありません。公開する場合は別途付けてください。
          </p>
        </section>
      </main>
    </div>
  );
}
