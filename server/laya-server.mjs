/**
 * Laya Playground 用のローカル API サーバ.
 * ブラウザからは onnxruntime-node が動かないため、Node 側で @receptron/laya を保持し、
 * フロントエンドからの POST /api/system-one をそのまま laya.systemOne() に渡す.
 *
 * ローカル実行前提・セキュリティ最低限: CORS 全許可、認証なし.
 *
 * 起動: `node server/laya-server.mjs` (PORT 既定 3001)
 * 環境変数:
 *   PORT            - 待受ポート (既定 3001)
 *   LAYA_MODEL_DIR  - ローカルの ONNX バンドル配置 (指定時はダウンロードしない)
 *   LAYA_CACHE      - ダウンロードキャッシュ (既定 ~/.cache/receptron-laya)
 *   LAYA_REPO       - Hugging Face リポジトリ (既定 receptron/laya-onnx)
 *   LAYA_SUBFOLDER  - チェックポイント派生 (例 multilingual)
 *   LAYA_REVISION   - ピン留め用コミットハッシュ
 *   HF_TOKEN        - プライベートリポジトリ用トークン
 */
import http from 'node:http';
import os from 'node:os';

const PORT = Number(process.env.PORT ?? 3001);

let layaPromise = null;
let loadedModelDir = null;
let loadedConfig = null;

async function getLaya() {
  if (!layaPromise) {
    layaPromise = (async () => {
      const { Laya } = await import('@receptron/laya');
      const options = {};
      if (process.env.LAYA_MODEL_DIR) options.modelDir = process.env.LAYA_MODEL_DIR;
      if (process.env.LAYA_CACHE) options.cacheDir = process.env.LAYA_CACHE;
      if (process.env.LAYA_REPO) options.repo = process.env.LAYA_REPO;
      if (process.env.LAYA_SUBFOLDER) options.subfolder = process.env.LAYA_SUBFOLDER;
      if (process.env.LAYA_REVISION) options.revision = process.env.LAYA_REVISION;
      if (process.env.HF_TOKEN) options.token = process.env.HF_TOKEN;
      options.onProgress = ({ file, received, total }) => {
        if (total) {
          process.stderr.write(`\r[laya] ${file}: ${((received / total) * 100).toFixed(0)}%   `);
        } else {
          process.stderr.write(`\r[laya] ${file}: ${received} bytes   `);
        }
      };
      console.log('[laya-server] loading model...', {
        modelDir: options.modelDir ?? '(download)',
        repo: options.repo ?? 'default',
        subfolder: options.subfolder ?? 'default',
      });
      const laya = await Laya.load(options);
      loadedModelDir = laya.modelDir;
      loadedConfig = laya.config;
      console.log('\n[laya-server] model loaded:', loadedModelDir, loadedConfig);
      return laya;
    })().catch((err) => {
      // 次回リクエストで再試行できるようリセット
      layaPromise = null;
      throw err;
    });
  }
  return layaPromise;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(payload);
}

function readBody(req, limitBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) {
        reject(new Error(`request body too large (>${limitBytes} bytes)`));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      loaded: loadedModelDir !== null,
      modelDir: loadedModelDir,
      config: loadedConfig,
      hostname: os.hostname(),
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/system-one') {
    try {
      const raw = await readBody(req);
      const parsed = raw ? JSON.parse(raw) : {};
      const { state, questions } = parsed;
      if (
        questions === undefined ||
        questions === null ||
        typeof questions !== 'object' ||
        Object.keys(questions).length === 0
      ) {
        sendJson(res, 400, { error: 'questions が空です. 1件以上の質問を指定してください.' });
        return;
      }
      const laya = await getLaya();
      const t0 = performance.now();
      const result = await laya.systemOne(state ?? '', questions);
      const elapsedMs = Math.round(performance.now() - t0);
      sendJson(res, 200, { ...result, elapsedMs });
    } catch (err) {
      console.error('[laya-server] /api/system-one error:', err);
      const message = err instanceof Error ? err.message : String(err);
      // モデル由来の制限エラー (head_max_len 等) は 400、それ以外は 500 扱い
      const status = /head_max_len|at least one question|options/i.test(message) ? 400 : 500;
      sendJson(res, status, { error: message });
    }
    return;
  }

  sendJson(res, 404, { error: `not found: ${url.pathname}` });
});

server.listen(PORT, () => {
  console.log(`[laya-server] listening on http://localhost:${PORT}`);
  console.log(`[laya-server] health: http://localhost:${PORT}/api/health`);
});
