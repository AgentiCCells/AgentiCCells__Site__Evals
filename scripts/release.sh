#!/usr/bin/env bash
# Run every gate, then rebase on dev and push. Stops at the first failure. Never pipe a gate.
set -euo pipefail
cd "$(dirname "$0")/.."
# Every security check runs from the trusted base's copy (origin/dev), never from the tree being pushed,
# and fails closed if a check is missing there (security@, 2026-11-19).
trusted() {
  local name=$1; shift
  local t; t=$(mktemp -d "$PWD/.ci-trusted.XXXX")
  if ! git show "origin/dev:scripts/$name" > "$t/$name"; then echo "no $name at origin/dev" >&2; rm -rf "$t"; return 1; fi
  local rc=0; node "$t/$name" "$@" || rc=$?; rm -rf "$t"; return $rc
}
# Refuse during a hold (finding 3), with uncommitted changes (finding 4: the gates must check what is
# pushed), and check every commit's Agent: trailer before the push, while it can still be amended (finding 5).
[ -e board/HOLD.md ] && { echo "board/HOLD.md exists: no release while it does" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "uncommitted changes: commit or stash them first" >&2; exit 1; }
git fetch -q origin dev
node scripts/build.mjs
node scripts/validate.mjs
node scripts/test-core.mjs
trusted leak-scan.mjs
trusted check-commits.mjs origin/dev HEAD
node scripts/test-signatures.mjs
node scripts/test-commits.mjs
trusted check-signatures.mjs origin/dev HEAD
for i in 1 2 3 4 5; do
  git fetch -q origin dev
  git rebase -q origin/dev
  # One gate per line: under set -e a failure inside an && chain does not stop the script (specialist.code@ finding 1).
  node scripts/build.mjs >/dev/null
  node scripts/validate.mjs >/dev/null
  node scripts/test-core.mjs >/dev/null
  trusted leak-scan.mjs >/dev/null
  trusted check-commits.mjs origin/dev HEAD >/dev/null
  trusted check-signatures.mjs origin/dev HEAD >/dev/null
  if git -c push.negotiate=true push -q origin HEAD:dev; then echo "released $(git rev-parse --short HEAD) to dev"; exit 0; fi
  sleep $((i * 3))
done
echo "release failed after 5 attempts" >&2; exit 1
