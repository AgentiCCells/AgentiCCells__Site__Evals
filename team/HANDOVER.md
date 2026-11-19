# Hand-over: conductor for the evals family

Written by conductor.evals@AgentiCCells.dinis on 2026-11-19, about 14:20 UTC, at the end of session https://claude.ai/code/session_01Kw9UwFVMs4VBhWFNm8Fa9B (second account). Holding at conductor.b@'s request (14:14 UTC): nothing new starts until Dinis Cruz gives his word.

## Live
- https://evals.agenticcells.site, v0.1.9 (commit b958081). Round 1 is done: the hub and core v0.1, both reviewed and released at Dinis's word ("Yes release to dev", 2026-11-19). See team/rounds/1.md and REALITY.md.
- openrouter-evals.agenticcells.site: not touched.

## What exists
- Core v0.1 (src/core/v0.1/): the ABP engine, agent loop and eval runner; adapters for OpenRouter, any OpenAI-compatible API, and a mock; data tools over data.promptugal.news; a cost meter; key and PKCE helpers; the encrypted key vault; UI pieces. 22 tests run in Node and in the browser.
- The policy library (src/policies/), with the seven team ABPs and two playground ABPs; team/ holds the roles, workflow, brief record and plan.
- Signing: every commit after f37f615 is SSH-signed with the conductor's bundle.sign key, which is published in team/keys.json. The private key's PEM is in a 600 file outside the repository (~/.agenticcells/), and so is its passphrase; neither is ever committed or printed.
- Release gates: build, validator, core tests, leak scan, Agent trailers and signatures. CI runs the security checks from BEFORE and fails closed. Self-tests: scripts/test-signatures.mjs (11 cases), test-commits.mjs (3 cases), test-ci-trusted.mjs (8 cases).

## Decided by Dinis
- Visitors may keep their key in browser storage. It is kept encrypted under a Web Crypto key pair whose private key cannot be exported, and it is tied to the browser profile (2026-11-19).
- Commits are signed with the published key, and the session id is recorded (2026-11-19).

## Open, for Dinis
1. Branch protection on dev for this repository (asked through conductor.b@). Until it exists, the workflow file itself comes from the pushed tree.
2. Round 2: attach AgentiCCells__Site__OpenRouter-Evals (push) and AgentiCCells__Site__Factory (read; the original briefs are not yet copied into team/).
3. The second provider (name with Dinis): when it may be named, its domain, and the environment variable for its key. See team/PLAN.md, a proposal. No call has been made to its API.
4. The prospective partner's eval site: its repository and address.

## For the next conductor
- Read team/NEXT-BRIEFING.md, then this file, REALITY.md and team/rounds/1.md.
- Release only with scripts/release.sh, from a full (not shallow) clone, with the repo-local signing settings (gpg.format ssh, gpg.ssh.program ssh-keygen, user.signingkey pointing at your own key, commit.gpgsign true). If you take ownership with a new key, add it in a commit signed by the current key, or ask a person to add it; the check reads keys from the parent commit.
- Round 2 starts the provider site on core v0.1, pinned. Verify every feature against OpenRouter's current documentation first.
