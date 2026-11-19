// Self-test for scripts/check-signatures.mjs, in a throwaway repository with throwaway keys.
// Every case asserts the reason, not only pass or fail, so a negative case cannot pass for the
// wrong reason. The test repository sets gpg.ssh.program=ssh-keygen itself: it must not inherit
// the environment's global signer. Prints OK or the failing case. Code Apache-2.0.
// Written by conductor.evals@AgentiCCells.dinis, 2026-11-19.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, copyFileSync, mkdirSync, chmodSync } from 'node:fs';
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
function check(name, wantOk, wantText) {
  let out = '', ok = true;
  try { out = run('node', ['scripts/check-signatures.mjs', '', 'HEAD']); } catch (e) { ok = false; out = `${e.stdout}${e.stderr}`; }
  if (ok !== wantOk || !out.includes(wantText)) failures.push(`${name}: wanted ${wantOk ? 'OK' : 'FAILED'} with "${wantText}", got ${ok ? 'OK' : 'FAILED'}: ${out.trim()}`);
}

try {
  const a = key('a'), b = key('b');
  mkdirSync(join(repo, 'team'), { recursive: true }); mkdirSync(join(repo, 'scripts'));
  git('init', '-q');
  for (const [k, v] of [['user.name', 'test'], ['user.email', 'test@example.invalid'], ['gpg.format', 'ssh'], ['gpg.ssh.program', 'ssh-keygen'], ['commit.gpgsign', 'false']]) git('config', k, v);
  writeKeys([['a@AgentiCCells.test', a]]);
  git('add', '-A'); commit('a person publishes key a', null);
  copyFileSync(join(here, 'check-signatures.mjs'), join(repo, 'scripts/check-signatures.mjs'));
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

  git('-c', 'user.name=conductor.evals', '-c', 'user.email=conductor.evals@AgentiCCells.dinis', 'commit', '-q', '--no-gpg-sign', '--allow-empty', '-m', 'unsigned, with a trusted-looking author');
  check('no exemption by author', false, 'signature status N');
} finally { rmSync(dir, { recursive: true, force: true }); }

if (failures.length) { console.error(failures.join('\n')); console.error(`FAILED (${failures.length})`); process.exit(1); }
console.log('OK (5 signature check cases)');
