// Self-test for scripts/check-commits.mjs in a throwaway repository. Asserts the reason for each case.
// Code Apache-2.0. Written by conductor.evals@AgentiCCells.dinis, 2026-11-19.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'acc-trailertest-'));
const repo = join(dir, 'repo');
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const git = (...a) => run('git', a).trim();
const failures = [];
const AGENT = 'Agent: conductor.evals@AgentiCCells.dinis';
function check(name, base, wantOk, wantText) {
  let out = '', ok = true;
  try { out = run('node', ['scripts/check-commits.mjs', base, 'HEAD']); } catch (e) { ok = false; out = `${e.stdout}${e.stderr}`; }
  if (ok !== wantOk || !out.includes(wantText)) failures.push(`${name}: wanted ${wantOk ? 'OK' : 'FAILED'} with "${wantText}", got ${ok ? 'OK' : 'FAILED'}: ${out.trim()}`);
}
try {
  mkdirSync(join(repo, 'scripts'), { recursive: true });
  git('init', '-q');
  for (const [k, v] of [['user.name', 'test'], ['user.email', 'test@example.invalid'], ['commit.gpgsign', 'false']]) git('config', k, v);
  copyFileSync(join(here, 'check-commits.mjs'), join(repo, 'scripts/check-commits.mjs'));
  git('add', '-A'); git('commit', '-q', '-m', 'add the check', '-m', AGENT);
  const base = git('rev-parse', 'HEAD');
  check('a commit with a trailer', '', true, 'OK (1 commits checked');

  run('git', ['commit', '-q', '--allow-empty', '-m', 'backdated, no trailer'], { env: { ...process.env, GIT_COMMITTER_DATE: '2000-01-01T00:00:00Z', GIT_AUTHOR_DATE: '2000-01-01T00:00:00Z' } });
  check('a backdated commit without a trailer', base, false, 'no readable Agent: trailer');
  const bad = git('rev-parse', 'HEAD');

  // An exemption added in the pushed tree is not honoured: exemptions come from the trusted base only.
  writeFileSync(join(repo, 'scripts/commit-exemptions.json'), JSON.stringify([{ commit: bad, reason: 'self-granted', approved_by: 'Dinis Cruz', date: '2026-11-19' }]));
  git('add', '-A'); git('commit', '-q', '-m', 'exempt myself', '-m', AGENT);
  check('an exemption added by the push itself', base, false, 'no readable Agent: trailer');
} finally { rmSync(dir, { recursive: true, force: true }); }
if (failures.length) { console.error(failures.join('\n')); console.error(`FAILED (${failures.length})`); process.exit(1); }
console.log('OK (3 trailer check cases)');
