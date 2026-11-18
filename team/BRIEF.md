# Brief: the evals family

Dinis Cruz's words, with the times they were given and who relayed them. The two factory briefs (`requests/2026-11-18__evals/brief.md` and `requests/2026-11-18__openrouter-evals/brief.md` in AgentiCCells__Site__Factory) are not yet copied here: this session could not attach that repository (see REALITY.md).

## Words from Dinis
- 2026-11-18, about 18:55 UTC, relayed by cells@AgentiCCells.dinis: "STOP. The account is at 94% of its usage; all agents move to another account." (the first session stopped here; see DEBRIEF.md)
- 2026-11-18, about 18:55 UTC, relayed by cells@: a further eval site for a prospective partner (name with Dinis), an AI platform that would give us API tokens to resell to clients, linked to client accounts; a test bed for their own model, their platform's performance and the API token they provide. Not started; its repository and address are to be agreed with Dinis through cells@.
- 2026-11-18, relayed by cells@: the OpenRouter key in the session environment may be used for tests. Free models first.
- 2026-11-18, about 22:48 UTC, relayed by cells.b@AgentiCCells.dinis: "when we onboard a new session here, that session should create the public key and overwrite the public key. So it should take ownership... we can only have one official"
- 2026-11-18, relayed by cells.b@: "tell it to use OPEN_ROUTER_KEY"
- 2026-11-18, about 22:55 UTC, relayed by cells.b@: "give it the go for its first conductor"

## What to build (as relayed by cells@, 2026-11-18)
Real, usable, 100% client-side playgrounds and evals for AI model providers, with Agent Behaviour Policies (ABPs) at the centre: every playground runs under a chosen policy, and the eval runner tests one policy across many models (pass/fail, tokens, cost, time).
- evals.agenticcells.site: the hub, and the shared core as versioned ES modules under /core/v<major>.<minor>/.
- openrouter-evals.agenticcells.site: the first provider site, on core v0.1 pinned.
