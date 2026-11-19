# REALITY.md: what exists now

Kept by conductor.evals@AgentiCCells.dinis. A thing not written here does not exist.

## Repository and site
- Seeded by the AgentiCCells site factory on 2026-11-18 from AgentiCCells/AgentiCCells__Site__Template@dev. Live at https://evals.agenticcells.site; CI deploys every push to dev and tags v0.1.N.
- Round 1 (2026-11-18, second account): the hub and core v0.1. See team/rounds/1.md for what was tested live and what against recorded mocks.

## What exists after round 1
- Core v0.1 under src/core/v0.1/ (served at /core/v0.1/): abp.js, agent.js, eval.js, providers/openrouter.js, providers/openai-compatible.js (any OpenAI-compatible provider; mocks only), providers/mock.js, tools/promptugal.js, cost.js, keys.js, vault.js (encrypted secret store), ui.js, ui.css, index.js, README.md (the contract), and in-browser tests (tests/, 22 tests; also run in Node by scripts/test-core.mjs, which the release script and CI now run).
- Policy library under src/policies/: seven team policies and two playground policies, ABP format 0.1.
- Hub pages: /, /core/, /policies/, /try/ (one run under a policy, recorded or live with the visitor's own OpenRouter key), /behind-the-scenes/ (built from team/ and git log), /llms.txt, /index.md, /share-card.png (1200x630). A meta CSP on every page.
- team/: BRIEF.md, WORKFLOW.md, roles/<role>/ROLE.md and POLICY.md for conductor, architect, developer, designer, writer, security, reviewer; keys.json (the conductor's public key bundle, active); rounds/1.md.

## What does not exist yet
- openrouter-evals.agenticcells.site content: the provider site is planned for round 2. That repository is not attached to this session.
- Five designs under /d/ with a chooser: planned for a later round.
- OAuth PKCE sign-in in a page: the core has the helpers (keys.js pkcePair, openrouter.js authUrl and exchangeCode, tested against the documented shape with mocks); no page uses them yet and they have not been tried live.
- Web search, image generation and side by side: not built.
- A page that runs the eval runner: not built (the runner is in the core and tested).
- The factory briefs (requests/2026-11-18__evals/brief.md and requests/2026-11-18__openrouter-evals/brief.md) are not copied into team/: the Factory repository could not be attached.
- The prospective partner eval site, and a second provider (name with Dinis): not started; see team/PLAN.md (a proposal). No call has been made to its API.

## Signing
- From the commit that adds scripts/check-signatures.mjs (2026-11-19), every commit is SSH-signed with the conductor's bundle.sign key, and the release script and CI check it against team/keys.json. The four round 1 commits before it are unsigned; history is not rewritten.

## Earlier
- team/DEBRIEF.md and team/NEXT-BRIEFING.md (2026-11-18): the first conductor session stopped before round 1; how to resume.
