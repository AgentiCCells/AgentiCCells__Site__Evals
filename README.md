# Evals

A family of client-side playgrounds and evals for AI model providers, with Agent Behaviour Policies at the centre, and the shared core they all use.

- Live at https://evals.agenticcells.site (version at /version.json).
- Made by the AgentiCCells site factory from request `requests/2026-11-18__evals/` in AgentiCCells__Site__Factory, seeded from AgentiCCells__Site__Template.
- Shared core: `src/core/v0.1/` (contract in its README.md), served at /core/v0.1/. Policy library: `src/policies/`.
- Team: `team/` (roles and their Agent Behaviour Policies, workflow, round reports, public keys).
- Release: `scripts/release.sh` (build, validate, core tests, leak scan, commit trailers, then push to dev; CI deploys and tags v0.1.N).

Licences: code Apache-2.0; text CC BY 4.0.
