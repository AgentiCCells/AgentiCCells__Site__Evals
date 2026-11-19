#!/usr/bin/env bash
# Run every gate, then rebase on dev and push. Stops at the first failure. Never pipe a gate.
set -euo pipefail
cd "$(dirname "$0")/.."
# The signature check runs from the trusted base's copy, never from the tree being pushed.
trusted_signatures() {
  local t; t=$(mktemp -d)
  git show "origin/dev:scripts/check-signatures.mjs" > "$t/check.mjs" || { echo "no signature check at origin/dev" >&2; rm -rf "$t"; return 1; }
  node "$t/check.mjs" origin/dev HEAD; local rc=$?; rm -rf "$t"; return $rc
}
# Refuse during a hold (finding 3), with uncommitted changes (finding 4: the gates must check what is
# pushed), and check every commit's Agent: trailer before the push, while it can still be amended (finding 5).
[ -e board/HOLD.md ] && { echo "board/HOLD.md exists: no release while it does" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "uncommitted changes: commit or stash them first" >&2; exit 1; }
git fetch -q origin dev
node scripts/build.mjs
node scripts/validate.mjs
node scripts/test-core.mjs
node scripts/leak-scan.mjs
node scripts/check-commits.mjs origin/dev HEAD
node scripts/test-signatures.mjs
trusted_signatures
for i in 1 2 3 4 5; do
  git fetch -q origin dev
  git rebase -q origin/dev
  # One gate per line: under set -e a failure inside an && chain does not stop the script (specialist.code@ finding 1).
  node scripts/build.mjs >/dev/null
  node scripts/validate.mjs >/dev/null
  node scripts/test-core.mjs >/dev/null
  node scripts/leak-scan.mjs >/dev/null
  node scripts/check-commits.mjs origin/dev HEAD >/dev/null
  trusted_signatures >/dev/null
  if git -c push.negotiate=true push -q origin HEAD:dev; then echo "released $(git rev-parse --short HEAD) to dev"; exit 0; fi
  sleep $((i * 3))
done
echo "release failed after 5 attempts" >&2; exit 1
