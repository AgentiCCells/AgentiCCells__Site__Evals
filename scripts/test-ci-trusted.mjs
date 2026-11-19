// Self-test for the CI step "Take the security checks from BEFORE": it runs that step's own script,
// read from .github/workflows/pages.yml, against throwaway repositories, and asserts the reason for
// each refusal. Code Apache-2.0. Written by conductor.evals@AgentiCCells.dinis, 2026-11-19.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const STEP = '- name: Take the security checks from BEFORE (fail closed)';
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
const repo = join(dir, 'repo');
const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const commit = (msg) => { git('commit', '-q', '--allow-empty', '-m', msg); return git('rev-parse', 'HEAD'); };
const failures = [];
const script = join(dir, 'step.sh');
writeFileSync(script, stepScript());
function run(name, before, after, wantOk, wantText) {
  const temp = mkdtempSync(join(dir, 'runner-')), envFile = join(temp, 'env');
  writeFileSync(envFile, '');
  let out = '', ok = true;
  try { execFileSync('bash', [script], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, BEFORE: before, AFTER: after, VERSION_BASE: '0.1', RUNNER_TEMP: temp, GITHUB_ENV: envFile } }); out = readFileSync(envFile, 'utf8'); }
  catch (e) { ok = false; out = `${e.stdout}${e.stderr}`; }
  if (ok !== wantOk || !out.includes(wantText)) failures.push(`${name}: wanted ${wantOk ? 'OK' : 'FAILED'} with "${wantText}", got ${ok ? 'OK' : 'FAILED'}: ${out.trim()}`);
  rmSync(join(repo, '.ci-trusted'), { recursive: true, force: true });
}

try {
  mkdirSync(join(repo, 'scripts'), { recursive: true });
  git('init', '-q');
  for (const [k, v] of [['user.name', 'test'], ['user.email', 'test@example.invalid'], ['commit.gpgsign', 'false']]) git('config', k, v);
  const noChecks = commit('before the checks existed');
  for (const f of ['check-commits.mjs', 'check-signatures.mjs', 'leak-scan.mjs']) writeFileSync(join(repo, 'scripts', f), `// trusted ${f}\n`);
  git('add', '-A'); const tagged = commit('the checks'); git('tag', 'v0.1.0');
  const before = commit('released state');
  const after = commit('the push');

  run('a normal push', before, after, true, `TRUSTED_START=${tagged}`);
  run('no BEFORE (new branch or manual run)', '', after, false, 'no BEFORE commit');
  run('BEFORE is zero', '0'.repeat(40), after, false, 'BEFORE is zero');
  run('BEFORE not in history', 'f'.repeat(40), after, false, 'is not in this history');
  git('checkout', '-q', '-b', 'side', tagged); const side = commit('a force-pushed history');
  run('BEFORE not an ancestor of AFTER (force push)', before, side, false, 'not an ancestor of AFTER');
  git('checkout', '-q', '-'); git('tag', 'v0.1.9', side);
  run('a tag that is not an ancestor of BEFORE does not count', before, after, true, `TRUSTED_START=${tagged}`);
  git('checkout', '-q', '-b', 'old', noChecks); const old2 = commit('still no checks');
  run('BEFORE has no copy of the checks (missing release copy)', noChecks, old2, false, 'at BEFORE: refused');
  git('checkout', '-q', '-');
  // The copies come from BEFORE, not from the pushed tree.
  writeFileSync(join(repo, 'scripts/check-signatures.mjs'), '// weakened in the push\n'); git('add', '-A'); const weak = commit('weaken');
  const temp = mkdtempSync(join(dir, 'runner-')); writeFileSync(join(temp, 'env'), '');
  execFileSync('bash', [script], { cwd: repo, stdio: 'ignore', env: { ...process.env, BEFORE: after, AFTER: weak, VERSION_BASE: '0.1', RUNNER_TEMP: temp, GITHUB_ENV: join(temp, 'env') } });
  if (readFileSync(join(temp, 'trusted/check-signatures.mjs'), 'utf8') !== '// trusted check-signatures.mjs\n') failures.push('the checker was not taken from BEFORE');
} finally { rmSync(dir, { recursive: true, force: true }); }
if (failures.length) { console.error(failures.join('\n')); console.error(`FAILED (${failures.length})`); process.exit(1); }
console.log('OK (8 CI trusted-copy cases)');
