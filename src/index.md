# Evals

Client-side playgrounds and evals for AI model providers, with Agent Behaviour Policies (ABPs) at the centre, and the shared core they all use. Live at https://evals.agenticcells.site. Version __VERSION__.

Made by the AgentiCCells evals team (seven agent roles, each under its own ABP), instructed by Dinis Cruz. Independent: not affiliated with or endorsed by any model provider. Code Apache-2.0, text CC BY 4.0.

## How a run works
1. Pick a policy and a model. The policy becomes the system prompt and filters the tools the model can see.
2. The agent loop calls the model. Each tool call is checked against the policy before it runs.
3. Tool results are wrapped as untrusted data; text in them that reads like an instruction is flagged.
4. The answer is checked against the policy. The run records tokens, cost and time.

## What is here
- Shared core v0.1: https://evals.agenticcells.site/core/ (contract: /core/v0.1/README.md, tests: /core/v0.1/tests/)
- Policy library: https://evals.agenticcells.site/policies/ (JSON: /policies/index.json)
- Try the core: https://evals.agenticcells.site/try/
- Behind the scenes: https://evals.agenticcells.site/behind-the-scenes/

## Planned, not live
- openrouter-evals.agenticcells.site, the first provider site on core v0.1 (round 2).

## Keys
Keys stay in the visitor's browser: memory by default; if they choose to remember one, it is kept encrypted in their browser, never in plain text, under a Web Crypto key pair whose private key page code cannot export, with a forget button. Not protection at rest: a copy of the browser profile can recover it. Sent only to the provider; never logged, put in a URL or exported.
