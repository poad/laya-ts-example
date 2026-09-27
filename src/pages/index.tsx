import {
  PRESETS,
  buildSnippet,
  fetchHealth,
  newId,
  parseState,
  runSystemOne,
  type Answer,
  type ChoiceOption,
  type EditableQuestion,
  type HealthResponse,
  type QuestionType,
  type StateMode,
  type SystemOneResponse,
} from '../lib/laya';

import { For, Show, createSignal, onMount } from 'solid-js';

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none';
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500';
const btnPrimary =
  'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';
const btnGhost =
  'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50';
const cardCls = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm';

const clonePresetQuestions = (presetId: string): EditableQuestion[] => {
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  if (!preset) return [];
  return preset.questions.map((quest) => ({
    ...quest,
    id: newId(),
    options: quest.options.map((o: ChoiceOption) => ({ ...o })),
    levels: [...quest.levels],
  }));
};

function ProbBar(props: { name: string; value: number; highlight: boolean }) {
  const pct = (): string => `${(props.value * 100).toFixed(1)}%`;
  return (
    <div class="mb-1.5">
      <div class="flex items-center justify-between text-xs">
        <span class={`font-mono ${props.highlight ? 'font-bold text-blue-700' : 'text-gray-700'}`}>
          {props.name}
        </span>
        <span class="font-mono text-gray-600">{pct()}</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          class={`h-full rounded-full ${props.highlight ? 'bg-blue-600' : 'bg-gray-400'}`}
          style={{ width: pct() }}
        />
      </div>
    </div>
  );
}

function AnswerCard(props: { qkey: string; answer: Answer }) {
  return (
    <div class={cardCls}>
      <div class="mb-2 flex items-center gap-2">
        <span class="rounded bg-gray-900 px-2 py-0.5 font-mono text-xs text-white">
          {props.qkey}
        </span>
        <span class="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
          {props.answer.type}
        </span>
      </div>
      <Show when={props.answer.type === 'choice'}>
        <p class="mb-2 text-sm">
          選択:{' '}
          <span class="font-bold text-blue-700">{(props.answer as { choice: string }).choice}</span>
          <span class="ml-2 text-xs text-gray-500">
            confidence {(props.answer as { confidence: number }).confidence.toFixed(4)}
          </span>
        </p>
        <For
          each={Object.entries(
            (props.answer as { probabilities: Record<string, number> }).probabilities,
          )}
        >
          {([name, value]) => (
            <ProbBar
              name={name}
              value={value}
              highlight={name === (props.answer as { choice: string }).choice}
            />
          )}
        </For>
      </Show>
      <Show when={props.answer.type === 'score'}>
        <p class="mb-2 text-sm">
          スコア:{' '}
          <span class="font-bold text-blue-700">
            {(props.answer as { score: number }).score.toFixed(4)}
          </span>
          <span class="ml-2 text-xs text-gray-500">
            confidence {(props.answer as { confidence: number }).confidence.toFixed(4)}
          </span>
        </p>
        <For
          each={Object.entries(
            (props.answer as { probabilities: Record<string, number> }).probabilities,
          )}
        >
          {([level, value]) => {
            const legend = (props.answer as { legend: Record<string, string> }).legend[level] ?? '';
            return <ProbBar name={`${level}: ${legend}`} value={value} highlight={false} />;
          }}
        </For>
      </Show>
      <Show when={props.answer.type === 'noul'}>
        <p class="mb-2 text-sm">
          P(true):{' '}
          <span class="font-bold text-blue-700">
            {(props.answer as { noul: number }).noul.toFixed(4)}
          </span>
        </p>
        <ProbBar name="true" value={(props.answer as { noul: number }).noul} highlight={true} />
        <ProbBar
          name="false"
          value={1 - (props.answer as { noul: number }).noul}
          highlight={false}
        />
      </Show>
    </div>
  );
}

export default function Playground() {
  const initial = PRESETS[0];
  const [stateText, setStateText] = createSignal(initial?.state ?? '');
  const [stateMode, setStateMode] = createSignal<StateMode>(initial?.stateMode ?? 'json');
  const [questions, setQuestions] = createSignal<EditableQuestion[]>(
    clonePresetQuestions(initial?.id ?? ''),
  );
  const [presetId, setPresetId] = createSignal<string>(initial?.id ?? '');
  const [running, setRunning] = createSignal(false);
  const [result, setResult] = createSignal<SystemOneResponse | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [health, setHealth] = createSignal<HealthResponse | null>(null);
  const [copied, setCopied] = createSignal(false);

  const refreshHealth = async (): Promise<void> => {
    try {
      setHealth(await fetchHealth());
    } catch {
      setHealth(null);
    }
  };

  onMount(() => {
    void refreshHealth();
  });

  const applyPreset = (id: string): void => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setStateText(preset.state);
    setStateMode(preset.stateMode);
    setQuestions(clonePresetQuestions(id));
    setResult(null);
    setError(null);
  };

  const patchQuestion = (id: string, patch: Partial<EditableQuestion>): void => {
    setQuestions((prev) => prev.map((quest) => (quest.id === id ? { ...quest, ...patch } : quest)));
  };

  const addQuestion = (): void => {
    setQuestions((prev) => [
      ...prev,
      {
        id: newId(),
        key: `q${prev.length + 1}`,
        type: 'noul' as QuestionType,
        instructions: 'この状態は〜か?',
        options: [{ name: 'yes', description: '' }],
        levels: ['low', 'high'],
        trueHint: '',
        falseHint: '',
      },
    ]);
  };

  const handleRun = async (): Promise<void> => {
    setRunning(true);
    setError(null);
    try {
      const state = parseState(stateText(), stateMode());
      const res = await runSystemOne(state, questions());
      setResult(res);
      void refreshHealth();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = async (): Promise<void> => {
    const snippet = buildSnippet(parseState(stateText(), stateMode()), questions());
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('クリップボードへのコピーに失敗しました');
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 text-gray-900">
      <header class="border-b border-gray-200 bg-white px-6 py-4">
        <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <div>
            <h1 class="text-xl font-bold">Laya Playground (local)</h1>
            <p class="text-xs text-gray-500">
              state + 型付き質問 (choice / score / noul) を投げて、一括判定するローカル実行 UI
            </p>
          </div>
          <div class="ml-auto flex items-center gap-2 text-xs">
            <Show
              when={health()}
              fallback={<span class="rounded-full bg-gray-200 px-3 py-1">server: 不明</span>}
            >
              <span
                class={`rounded-full px-3 py-1 font-semibold ${
                  (health() as HealthResponse).loaded
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {(health() as HealthResponse).loaded
                  ? 'model: loaded'
                  : 'model: 未ロード (初回実行時に取得)'}
              </span>
            </Show>
            <button type="button" class={btnGhost} onClick={() => void refreshHealth()}>
              状態更新
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-6xl space-y-4 px-6 py-6">
        <section class={cardCls}>
          <p class={labelCls}>プリセット</p>
          <div class="flex flex-wrap gap-2">
            <For each={PRESETS}>
              {(preset) => (
                <button
                  type="button"
                  title={preset.description}
                  onClick={() => applyPreset(preset.id)}
                  class={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    presetId() === preset.id
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              )}
            </For>
          </div>
        </section>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-4">
            <section class={cardCls}>
              <div class="mb-2 flex items-center justify-between">
                <p class={labelCls}>State (判定対象)</p>
                <div class="flex gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setStateMode('text')}
                    class={`rounded px-2 py-1 ${stateMode() === 'text' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
                  >
                    text
                  </button>
                  <button
                    type="button"
                    onClick={() => setStateMode('json')}
                    class={`rounded px-2 py-1 ${stateMode() === 'json' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
                  >
                    json
                  </button>
                </div>
              </div>
              <textarea
                class={`${inputCls} h-40 font-mono`}
                value={stateText()}
                onInput={(e) => setStateText(e.currentTarget.value)}
                placeholder={
                  stateMode() === 'json'
                    ? '{"subject": "...", "body": "..."}'
                    : '判定したいテキスト'
                }
              />
              <p class="mt-1 text-xs text-gray-500">
                json モードはオブジェクトとして送り、壊れている場合はテキストとして送信します。
              </p>
            </section>

            <section class={cardCls}>
              <div class="mb-3 flex items-center justify-between">
                <p class={labelCls}>Questions ({questions().length})</p>
                <button type="button" class={btnGhost} onClick={addQuestion}>
                  + 追加
                </button>
              </div>
              <div class="space-y-3">
                <For each={questions()}>
                  {(quest) => (
                    <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div class="mb-2 grid grid-cols-3 gap-2">
                        <input
                          class={inputCls}
                          value={quest.key}
                          onInput={(e) => patchQuestion(quest.id, { key: e.currentTarget.value })}
                          placeholder="キー (例 department)"
                        />
                        <select
                          class={inputCls}
                          value={quest.type}
                          onChange={(e) =>
                            patchQuestion(quest.id, { type: e.currentTarget.value as QuestionType })
                          }
                        >
                          <option value="choice">choice</option>
                          <option value="score">score</option>
                          <option value="noul">noul</option>
                        </select>
                        <button
                          type="button"
                          class={btnGhost}
                          onClick={() =>
                            setQuestions((prev) => prev.filter((x) => x.id !== quest.id))
                          }
                        >
                          削除
                        </button>
                      </div>
                      <input
                        class={`${inputCls} mb-2`}
                        value={quest.instructions}
                        onInput={(e) =>
                          patchQuestion(quest.id, { instructions: e.currentTarget.value })
                        }
                        placeholder="instructions (例: どのチームが対応すべきか?)"
                      />
                      <Show when={quest.type === 'choice'}>
                        <div class="space-y-1">
                          <For each={quest.options}>
                            {(opt, idx) => (
                              <div class="grid grid-cols-5 gap-1">
                                <input
                                  class={`${inputCls} col-span-2 font-mono`}
                                  value={opt.name}
                                  onInput={(e) => {
                                    const next = quest.options.map((o, i) =>
                                      i === idx() ? { ...o, name: e.currentTarget.value } : o,
                                    );
                                    patchQuestion(quest.id, { options: next });
                                  }}
                                  placeholder="選択肢名"
                                />
                                <input
                                  class={`${inputCls} col-span-3`}
                                  value={opt.description}
                                  onInput={(e) => {
                                    const next = quest.options.map((o, i) =>
                                      i === idx()
                                        ? { ...o, description: e.currentTarget.value }
                                        : o,
                                    );
                                    patchQuestion(quest.id, { options: next });
                                  }}
                                  placeholder="説明 (空でも可)"
                                />
                              </div>
                            )}
                          </For>
                          <button
                            type="button"
                            class={btnGhost}
                            onClick={() =>
                              patchQuestion(quest.id, {
                                options: [...quest.options, { name: '', description: '' }],
                              })
                            }
                          >
                            選択肢を追加
                          </button>
                        </div>
                      </Show>
                      <Show when={quest.type === 'score'}>
                        <textarea
                          class={`${inputCls} font-mono`}
                          rows={2}
                          value={quest.levels.join('\n')}
                          onInput={(e) =>
                            patchQuestion(quest.id, { levels: e.currentTarget.value.split('\n') })
                          }
                          placeholder={'1行1レベル (例)\nnot urgent\nurgent\ncritical'}
                        />
                      </Show>
                      <Show when={quest.type === 'noul'}>
                        <div class="grid grid-cols-2 gap-2">
                          <input
                            class={inputCls}
                            value={quest.trueHint}
                            onInput={(e) =>
                              patchQuestion(quest.id, { trueHint: e.currentTarget.value })
                            }
                            placeholder="true の補足 (任意)"
                          />
                          <input
                            class={inputCls}
                            value={quest.falseHint}
                            onInput={(e) =>
                              patchQuestion(quest.id, { falseHint: e.currentTarget.value })
                            }
                            placeholder="false の補足 (任意)"
                          />
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </section>
          </div>

          <div class="space-y-4">
            <section class={cardCls}>
              <button
                type="button"
                class={btnPrimary}
                disabled={running()}
                onClick={() => void handleRun()}
              >
                {running() ? '推論中… (初回はモデル取得で数分かかります)' : 'Run Laya'}
              </button>
              <button type="button" class={`${btnGhost} ml-2`} onClick={() => void handleCopy()}>
                {copied() ? 'コピー済み' : 'TS コードをコピー'}
              </button>
              <Show when={error()}>
                <p class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error()}</p>
              </Show>
              <Show when={result()}>
                <div class="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span class="rounded bg-gray-100 px-2 py-1">
                    model: {(result() as SystemOneResponse).model}
                  </span>
                  <span class="rounded bg-gray-100 px-2 py-1">
                    input_tokens: {(result() as SystemOneResponse).usage.input_tokens}
                  </span>
                  <span class="rounded bg-gray-100 px-2 py-1">
                    elapsed: {(result() as SystemOneResponse).elapsedMs} ms
                  </span>
                </div>
              </Show>
            </section>

            <Show
              when={result()}
              fallback={
                <div class={`${cardCls} text-sm text-gray-500`}>まだ実行結果がありません。</div>
              }
            >
              <div class="space-y-3">
                <For each={Object.entries((result() as SystemOneResponse).answers)}>
                  {([qkey, answer]) => <AnswerCard qkey={qkey} answer={answer} />}
                </For>
                <details class={cardCls}>
                  <summary class="cursor-pointer text-sm font-semibold">Raw JSON</summary>
                  <pre class="mt-2 overflow-auto rounded bg-gray-900 p-3 font-mono text-xs text-green-200">
                    {JSON.stringify(result(), null, 2)}
                  </pre>
                </details>
                <details class={cardCls}>
                  <summary class="cursor-pointer text-sm font-semibold">
                    TypeScript スニペット
                  </summary>
                  <pre class="mt-2 overflow-auto rounded bg-gray-900 p-3 font-mono text-xs text-green-200">
                    {buildSnippet(parseState(stateText(), stateMode()), questions())}
                  </pre>
                </details>
              </div>
            </Show>
          </div>
        </div>
      </main>
    </div>
  );
}
