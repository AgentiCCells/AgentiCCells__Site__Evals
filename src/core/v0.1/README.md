# Evals core v0.1

The shared core of the evals family: plain ES modules, no build step, no third-party code, 100% client-side. Served at `https://evals.agenticcells.site/core/v0.1/`. A published version never changes in place: a change that breaks a contract goes to a new minor version. Code Apache-2.0; text CC BY 4.0.

Written by architect.evals@ and developer.evals@AgentiCCells.dinis, round 1, 18 November 2026.

## Entry point
`index.js` re-exports everything except the DOM pieces (`ui.js`, `ui.css`), which need a browser.

## Provider adapter contract
A provider is an object with:
- `id`, `name`
- `listModels()` returns `[{ id, name, free, contextLength, pricing, tools, structured, input, output, description }]`, free models first.
- `chat({ model, messages, tools, maxTokens, temperature, toolChoice, signal, extra })` returns `{ text, reasoning, toolCalls: [{ id, name, arguments, badArguments }], finishReason, model, provider, id, usage: { input, output, reasoning, cost }, ms, message }`. `usage.cost` is in US dollars, or `null` when the provider does not say. `message` is the assistant message to append to the conversation.
- Errors are `ProviderError` with `status`, `code` and `upstream`; their text never holds the key or an account id.
- Optional sign-in: `authUrl({ callbackUrl, challenge, state, keyLabel, limit, expiration })` and `exchangeCode({ code, verifier })`.

Messages use the OpenAI-compatible shape (`system`, `user`, `assistant` with `tool_calls`, `tool` with `tool_call_id`). Tools are `{ name, description, parameters (JSON Schema), run(args) }`; `run` returns text.

Adapters in v0.1: `providers/openrouter.js` (checked against OpenRouter's documentation on 18 November 2026; see the comment at its top) and `providers/mock.js` (replays recorded replies).

## ABP format 0.1
An Agent Behaviour Policy is a JSON object:

| Field | Meaning |
|---|---|
| `abp` | `"0.1"` |
| `id` | `abp:<path>@<major>.<minor>`, for example `abp:evals/play/data-analyst@0.1` |
| `name`, `summary`, `kind` | for people; `kind` is `team` or `playground` |
| `instructions` | list of strings; they become the system prompt |
| `tools.allow`, `tools.deny` | tool names, or `*`; deny wins |
| `untrusted.wrap` | wrap tool and web results in `<untrusted-data>` markers and tell the model they are data |
| `untrusted.on_injection` | `flag` (the only value in 0.1): phrases that read as instructions are flagged in the trace; the text still reaches the model, inside the markers |
| `limits.max_steps` | model turns (default 6); the last turn offers no tools, so the model must answer, and a run that still asks for tools stops with `step limit` |
| `limits.max_tool_calls` | optional cap on tool calls in a run |
| `limits.max_output_tokens` | output cap per model call |
| `checks` | list of `{ id, kind, value, flags, why }` |
| `on_violation` | `block`: an answer that fails a check is withheld (`output` is empty, `withheld` holds it, `blocked` is true; the trace still shows it). `flag`: the answer is returned with the failed checks |

Check kinds: `must_match`, `must_not_match` (a JavaScript pattern in `value`, optional `flags` from `imsu`), `max_words`, `max_chars`, `no_secret`, `must_call_tool`, `must_not_call_tool` (`value` a tool name or `*`), `json`.

The injection flag is a signal for people, not a guarantee: a model can still follow text inside a tool result. The trace shows what came in and what the model did with it.

## Eval runner
`runEval({ provider, policy, suite, models, tools, maxTokens, signal, onResult, secrets, retries, retryDelayMs, concurrency })` runs each case of a suite (`{ id, cases: [{ id, prompt, checks }] }`) under the policy on each model, one at a time by default, and returns results (pass, checks, tokens, cost, time, attempts, tool calls, flags, mocked) and a summary per model. A case passes only when the run ended with an answer (no error, no step limit, not withheld) and every check passed. Only an HTTP 429 is retried, and the tokens and cost of failed attempts still count. `must_call_tool` counts only calls that ran; `must_not_call_tool` counts every attempt. Case checks are validated before the run starts. `exportRun` gives JSON with the key redacted.

## Keys
`createKeyStore({ name })`: memory by default; `set(key, { remember: true })` also keeps it in localStorage; `forget()` wipes both. It never shows the key in `toString` or JSON. OpenRouter advises against keeping keys in browser storage (its OAuth PKCE guide, step 3), so pages show that advice next to the remember choice.

## Tests
`tests/index.html` runs them in the browser; `node scripts/test-core.mjs` runs the same tests in Node. They use replies recorded live from OpenRouter on 18 November 2026 (`tests/fixtures/`, account id and generation ids removed) and hand-made replies in the same documented shape. No page runs the eval runner yet; that comes with the provider site.
