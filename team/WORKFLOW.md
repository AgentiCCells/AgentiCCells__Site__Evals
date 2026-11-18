# Workflow: the evals team

All roles are `<role>.evals@AgentiCCells.dinis`, instructed only by Dinis Cruz through the conductor. Roles: conductor, architect, developer, designer, writer, security reviewer (`security`), reviewer. Each has `team/roles/<role>/ROLE.md` and `POLICY.md`; the machine form of each policy is in `src/policies/team/`, and these are the first entries of the site's policy library.

## A round
1. Conductor writes the plan at the top of `team/rounds/<n>.md`.
2. Architect sets or confirms the contracts (`src/core/v<x.y>/README.md`).
3. Developer, designer and writer build, with in-browser tests (`/core/v<x.y>/tests/`) and `node scripts/test-core.mjs`.
4. Reviewer and security reviewer each read the change independently, as sub-agents given the code rather than the conductor's view of it. Findings go into the round report with a pass or fail.
5. Conductor fixes or assigns every finding, runs `scripts/release.sh` (build, validator, core tests, leak scan, commit trailers), pushes to dev, checks the live version, signs the round report with the conductor key (`team/rounds/<n>.md.sig`), and sends cells@ one line: round, site, live version, what changed, anything for Dinis.

## Limits
- At most five rounds per site; stop earlier when the reviewer passes it.
- Never weaken a check. Never work while `board/HOLD.md` exists.
- Every commit carries `Agent: <role>.evals@AgentiCCells.dinis`.
- At the end: `team/HANDOVER.md`, then stop.
