// Self-test for scripts/check-signatures.mjs, in a throwaway repository with throwaway keys.
// Every case asserts the reason, not only pass or fail, so a negative case cannot pass for the
// wrong reason. The test repository sets gpg.ssh.program=ssh-keygen itself: it must not inherit
// the environment's global signer. Prints OK or the failing case. Code Apache-2.0.
// Written by conductor.evals@AgentiCCells.dinis, 2026-11-19.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'acc-sigtest-'));
const repo = join(dir, 'repo');
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const git = (...a) => run('git', a).trim();
const failures = [];

function key(name) {
  const pem = join(dir, `${name}.pem`);
  const k = execFileSync('openssl', ['ecparam', '-name', 'prime256v1', '-genkey', '-noout']);
  writeFileSync(pem, execFileSync('openssl', ['pkcs8', '-topk8', '-nocrypt'], { input: k }));
  chmodSync(pem, 0o600);
  writeFileSync(`${pem}.pub`, execFileSync('ssh-keygen', ['-y', '-f', pem]));
  return { pem, pub: execFileSync('openssl', ['pkey', '-in', pem, '-pubout'], { encoding: 'utf8' }) };
}
const writeKeys = (list) => writeFileSync(join(repo, 'team/keys.json'), JSON.stringify({ keys: list.map(([agent, k]) => ({ agent, bundle: { sign: k.pub } })) }, null, 2));
const commit = (msg, signer) => git('-c', `user.signingkey=${signer ? signer.pem : ''}`, 'commit', '-q', ...(signer ? ['-S'] : ['--no-gpg-sign']), '--allow-empty', '-am', msg);
function check(name, wantOk, wantText, { from = null, base = '' } = {}) {
  let out = '', ok = true, script = 'scripts/check-signatures.mjs';
  if (from) { script = join(dir, 'trusted-check.mjs'); writeFileSync(script, git('show', `${from}:scripts/check-signatures.mjs`)); }
  try { out = run('node', [script, base, 'HEAD']); } catch (e) { ok = false; out = `${e.stdout}${e.stderr}`; }
  if (ok !== wantOk || !out.includes(wantText)) failures.push(`${name}: wanted ${wantOk ? 'OK' : 'FAILED'} with "${wantText}", got ${ok ? 'OK' : 'FAILED'}: ${out.trim()}`);
}

try {
  const a = key('a'), b = key('b');
  mkdirSync(join(repo, 'team'), { recursive: true }); mkdirSync(join(repo, 'scripts'));
  git('init', '-q');
  for (const [k, v] of [['user.name', 'test'], ['user.email', 'test@example.invalid'], ['gpg.format', 'ssh'], ['gpg.ssh.program', 'ssh-keygen'], ['commit.gpgsign', 'false']]) git('config', k, v);
  writeKeys([['a@AgentiCCells.test', a]]);
  git('add', '-A'); commit('a person publishes key a', null);
  // The checker pins the last unsigned commit; in this test repository that is the one just made.
  const pin = git('rev-parse', 'HEAD');
  const src = readFileSync(join(here, 'check-signatures.mjs'), 'utf8');
  if (!/const PINNED = '[0-9a-f]{40}';/.test(src)) throw new Error('the checker has no PINNED commit');
  writeFileSync(join(repo, 'scripts/check-signatures.mjs'), src.replace(/const PINNED = '[0-9a-f]{40}';/, `const PINNED = '${pin}';`));
  git('add', '-A'); commit('add the check, signed by a', a);
  check('signed by a listed key', true, 'OK (1 signed commits checked');

  commit('unsigned', null);
  check('unsigned commit', false, 'signature status N');
  git('reset', '-q', '--hard', 'HEAD~1');

  writeKeys([['a@AgentiCCells.test', a], ['b@AgentiCCells.test', b]]);
  commit('b adds itself and signs', b);
  check('a commit that adds its own key', false, "signature status U (want G: a good signature by a key in its parent's team/keys.json)");
  git('reset', '-q', '--hard', 'HEAD~1');

  writeKeys([['a@AgentiCCells.test', a], ['b@AgentiCCells.test', b]]);
  commit('a adds key b', a);
  commit('b signs after a listed it', b);
  check('a key added by a listed key', true, 'OK (3 signed commits checked');

  // (6) An orphan commit, even one signed by a listed key, merged in by a signed merge: refused.
  const main = git('rev-parse', 'HEAD');
  git('checkout', '-q', '--orphan', 'stray'); git('rm', '-rq', '--cached', '.');
  writeKeys([['a@AgentiCCells.test', a]]); git('add', 'team/keys.json'); commit('orphan with no parent', a);
  git('checkout', '-q', '-f', main); git('-c', `user.signingkey=${a.pem}`, 'merge', '-q', '-S', '--allow-unrelated-histories', '-X', 'ours', '-m', 'merge the orphan', 'stray');
  check('an orphan merged in', false, 'no parent: a root commit has no published key to check against');
  git('reset', '-q', '--hard', main); git('branch', '-q', '-D', 'stray');

  // (7) A push that replaces the checker with one that always passes: the pushed copy says OK, the
  // trusted base's copy (what release and CI run) still refuses the unsigned commit.
  writeFileSync(join(repo, 'scripts/check-signatures.mjs'), "console.log('OK (weakened)');\n");
  commit('weaken the checker, unsigned', null);
  check('the pushed checker is not to be trusted', true, 'OK (weakened)');
  check('the trusted base checker', false, 'signature status N', { from: main, base: main });
  git('reset', '-q', '--hard', main);

  // A shallow clone of the same history: refused before anything is checked.
  const shallow = join(dir, 'shallow');
  execFileSync('git', ['clone', '-q', '--depth', '1', `file://${repo}`, shallow]);
  let sOut = '', sOk = true;
  try { sOut = execFileSync('node', [join(repo, 'scripts/check-signatures.mjs'), '', 'HEAD'], { cwd: shallow, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { sOk = false; sOut = `${e.stdout}${e.stderr}`; }
  if (sOk || !sOut.includes('refused: this is a shallow checkout')) failures.push(`a shallow checkout: wanted FAILED with "refused: this is a shallow checkout", got ${sOk ? 'OK' : 'FAILED'}: ${sOut.trim()}`);

  git('-c', 'user.name=conductor.evals', '-c', 'user.email=conductor.evals@AgentiCCells.dinis', 'commit', '-q', '--no-gpg-sign', '--allow-empty', '-m', 'unsigned, with a trusted-looking author');
  check('no exemption by author', false, 'signature status N');
} finally { rmSync(dir, { recursive: true, force: true }); }

if (failures.length) { console.error(failures.join('\n')); console.error(`FAILED (${failures.length})`); process.exit(1); }
console.log('OK (11 signature check cases)');
