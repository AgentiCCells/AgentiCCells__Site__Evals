// Self-test for the CI step "Take the security checks from anchor A": it runs that step's own script,
// read from .github/workflows/pages.yml, against throwaway repositories. The deployments API is faked
// by a stand-in curl on PATH, for this test only. Each refusal's reason is asserted.
// Code Apache-2.0. Written by conductor.evals@AgentiCCells.dinis, 2026-11-19.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const STEP = '- name: Take the security checks from anchor A (fail closed)';
function stepScript() {
  const lines = readFileSync(join(root, '.github/workflows/pages.yml'), 'utf8').split('\n');
  const at = lines.findIndex((l) => l.trim() === STEP);
  if (at < 0) throw new Error(`workflow has no step "${STEP}"`);
  const runAt = lines.findIndex((l, i) => i > at && /^\s+run: \|\s*$/.test(l));
  const indent = lines[runAt].search(/\S/);
  const body = [];
  for (let i = runAt + 1; i < lines.length && (lines[i].trim() === '' || lines[i].search(/\S/) > indent); i++) body.push(lines[i]);
  const strip = Math.min(...body.filter((l) => l.trim()).map((l) => l.search(/\S/)));
  return body.map((l) => l.slice(strip)).join('\n');
}

const dir = mkdtempSync(join(tmpdir(), 'acc-citest-'));
const repo = join(dir, 'repo'), bin = join(dir, 'bin'), apiDir = join(dir, 'api');
mkdirSync(bin); mkdirSync(apiDir);
// Fake curl: serves files from apiDir by URL path; exits 22 (like curl -f) when the file is missing.
writeFileSync(join(bin, 'curl'), `#!/usr/bin/env bash\nurl="\${@: -1}"; p="${apiDir}/\${url#*/repos/test/repo/}"; p="\${p//[?&=]/_}"; [ -f "$p" ] && cat "$p" || exit 22\n`);
chmodSync(join(bin, 'curl'), 0o755);
const apiFile = (path) => join(apiDir, path.replace(/[?&=]/g, '_'));
function deployments(list) { // list of [id, sha, state]
  rmSync(apiDir, { recursive: true, force: true }); mkdirSync(join(apiDir, 'deployments'), { recursive: true });
  if (list === null) return;
  writeFileSync(apiFile('deployments?environment=github-pages&per_page=30'), JSON.stringify(list.map(([id, sha]) => ({ id, sha }))));
  for (const [id, , state] of list) { mkdirSync(join(apiDir, 'deployments', String(id)), { recursive: true }); writeFileSync(apiFile(`deployments/${id}/statuses?per_page=1`), JSON.stringify([{ state }])); }
}
const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const commit = (msg) => { git('commit', '-q', '--allow-empty', '-m', msg); return git('rev-parse', 'HEAD'); };
const failures = [];
const script = join(dir, 'step.sh');
writeFileSync(script, stepScript());
function step(after) {
  const temp = mkdtempSync(join(dir, 'runner-')), envFile = join(temp, 'env');
  writeFileSync(envFile, '');
  try {
    execFileSync('bash', [script], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, AFTER: after, GITHUB_TOKEN: 'test-token', GITHUB_API_URL: 'https://api.invalid', GITHUB_REPOSITORY: 'test/repo', RUNNER_TEMP: temp, GITHUB_ENV: envFile } });
    return { ok: true, out: readFileSync(envFile, 'utf8'), temp };
  } catch (e) { return { ok: false, out: `${e.stdout}${e.stderr}`, temp }; } finally { rmSync(join(repo, '.ci-trusted'), { recursive: true, force: true }); }
}
function expect(name, r, wantOk, wantText) { if (r.ok !== wantOk || !r.out.includes(wantText)) failures.push(`${name}: wanted ${wantOk ? 'OK' : 'FAILED'} with "${wantText}", got ${r.ok ? 'OK' : 'FAILED'}: ${r.out.trim()}`); }

try {
  mkdirSync(join(repo, 'scripts'), { recursive: true });
  git('init', '-q');
  for (const [k, v] of [['user.name', 'test'], ['user.email', 'test@example.invalid'], ['commit.gpgsign', 'false']]) git('config', k, v);
  const noChecks = commit('before the checks existed');
  writeFileSync(join(repo, 'scripts/check-commits.mjs'), readFileSync(join(here, 'check-commits.mjs'), 'utf8'));
  for (const f of ['check-signatures.mjs', 'leak-scan.mjs']) writeFileSync(join(repo, 'scripts', f), `// trusted ${f}\n`);
  git('add', '-A'); git('commit', '-q', '-m', 'the checks', '-m', 'Agent: conductor.evals@AgentiCCells.dinis');
  const A = git('rev-parse', 'HEAD');
  git('commit', '-q', '--allow-empty', '-m', 'a dropped run, no trailer'); const dropped = git('rev-parse', 'HEAD');
  git('commit', '-q', '--allow-empty', '-m', 'BEFORE, checked by a run that never deployed', '-m', 'Agent: conductor.evals@AgentiCCells.dinis');
  const before = git('rev-parse', 'HEAD');
  git('tag', 'v0.1.99', before); // a pushed tag on an unverified commit
  git('commit', '-q', '--allow-empty', '-m', 'the push', '-m', 'Agent: conductor.evals@AgentiCCells.dinis'); const after = git('rev-parse', 'HEAD');

  deployments([[3, before, 'failure'], [2, A, 'success'], [1, noChecks, 'inactive']]);
  const r = step(after);
  expect('anchor is the last successful deployment, not BEFORE or a tag', r, true, `TRUSTED_START=${A}`);
  // All controls apply to every commit in A..AFTER: the dropped run's commit fails the trailer check from A.
  let out = '', ok = true;
  try { out = execFileSync('node', [join(r.temp, 'trusted/check-commits.mjs'), A, after], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { ok = false; out = `${e.stdout}${e.stderr}`; }
  if (ok || !out.includes(`${dropped.slice(0, 7)} a dropped run, no trailer: no readable Agent: trailer`)) failures.push(`a commit from a dropped run: wanted FAILED naming ${dropped.slice(0, 7)}, got ${ok ? 'OK' : 'FAILED'}: ${out.trim()}`);

  deployments([]); expect('no successful deployment (missing A)', step(after), false, 'no successful github-pages deployment');
  deployments([[3, before, 'failure']]); expect('only failed deployments', step(after), false, 'no successful github-pages deployment');
  deployments(null); expect('the deployments cannot be read', step(after), false, 'cannot read the deployments');
  deployments([[2, 'f'.repeat(40), 'success']]); expect('A not in history', step(after), false, 'is not in this history');
  git('checkout', '-q', '-b', 'side', noChecks); const side = commit('a force-pushed history');
  deployments([[2, A, 'success']]); expect('A not an ancestor of AFTER (force push)', step(side), false, 'not an ancestor of AFTER');
  deployments([[2, noChecks, 'success']]); expect('no checks at A (missing release copy)', step(side), false, 'at anchor A: refused');
  git('checkout', '-q', '-');
  writeFileSync(join(repo, 'scripts/check-signatures.mjs'), '// weakened in the push\n'); git('add', '-A'); const weak = commit('weaken');
  deployments([[2, A, 'success']]); const w = step(weak);
  if (!w.ok || readFileSync(join(w.temp, 'trusted/check-signatures.mjs'), 'utf8') !== '// trusted check-signatures.mjs\n') failures.push('the checks were not taken from A');
} finally { rmSync(dir, { recursive: true, force: true }); }
if (failures.length) { console.error(failures.join('\n')); console.error(`FAILED (${failures.length})`); process.exit(1); }
console.log('OK (9 CI anchor cases)');
