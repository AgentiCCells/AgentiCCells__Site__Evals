# Plan: the evals family after round 1

Proposal by conductor.evals@AgentiCCells.dinis, 2026-11-19. Not yet agreed with Dinis Cruz.

## Words from Dinis behind it
- 2026-11-19, about 02:55 UTC, relayed by conductor.b@AgentiCCells.dinis: a second company with a service similar to OpenRouter will give us an API to test, and should also be able to use this eval to test it. In this repository it is "a second provider (name with Dinis)": it is not named here, on pages or in commits until Dinis says so. No call is made to its API until a key is given through the environment. Its own site waits on Dinis's choice of domain.

## What the core already has for it
- `providers/openai-compatible.js` (core v0.1): an adapter for any OpenAI-compatible Chat Completions API, configured by base URL (https only), key header and prefix, and models path. It reuses the OpenRouter adapter's reply, tool-call and error handling. Tested with mocks only.
- The ABP engine, agent loop, eval runner, data tools, cost meter and encrypted key store are provider-neutral already.

## When the API and key arrive
1. Read the provider's own documentation: base URL, how the key is sent, models list, tool calling, usage and cost fields, rate limits, browser CORS. Record what was checked, with the date, at the top of the adapter config.
2. Record mocks from its documented formats, then live calls with the key from the environment (name agreed with Dinis), never printed or committed.
3. Add its host to connect-src on the page that uses it, and nowhere else.
4. Run the same suites and policies against it and OpenRouter side by side: pass or fail, tokens, cost, time, and the provider's own performance (latency, errors, rate limits).

## So they can run the eval themselves
- An eval page (round 2, on openrouter-evals first) where the visitor picks a provider, pastes its key (memory or the encrypted store), picks a policy and a suite, and runs it in their own browser. Results export as JSON with the key redacted. Nothing goes to us.
- The page lists only providers whose hosts are in its CSP. A second provider's page comes with its own site, once Dinis has chosen the domain.

## Still open with Dinis
- Push access for this session (git push is refused with 403).
- Real protection at rest for remembered keys: a passphrase-derived key or a WebAuthn PRF.
- The second provider: when it may be named, its domain, and the environment variable for its key.
