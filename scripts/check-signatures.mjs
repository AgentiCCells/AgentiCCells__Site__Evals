// Every commit (merges too) from the one that added this file onwards must carry a good SSH signature
// by a key published in its PARENT's team/keys.json, never its own, so a commit cannot add a key and
// pass with it: a new key arrives in a commit signed by a key already listed, or from a person.
// No commit is exempted by author or committer name or address. Keys are published in team/keys.json (Dinis Cruz, 2026-11-19, relayed by cells.b@: "every then
// commit is signed by that key"). Older commits are skipped: history is never rewritten.
// Usage: node scripts/check-signatures.mjs <before> <after>   (as scripts/check-commits.mjs)
// Needs ssh-keygen. Prints OK or lists each failing commit and exits 1. Code Apache-2.0.
// Written by conductor.evals@AgentiCCells.dinis.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createPublicKey } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const tryGit = (...a) => { try { return git(...a); } catch { return null; } };
const lines = (s) => (s ? s.split('\n').filter(Boolean) : []);

// A P-256 public key in PEM (sgit's bundle.sign) as an OpenSSH "ecdsa-sha2-nistp256 ..." line.
function sshFromPem(pem) {
  const jwk = createPublicKey(pem).export({ format: 'jwk' });
  if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') throw new Error('only P-256 signing keys are supported');
  const b = (s) => Buffer.from(s, 'base64url');
  const str = (buf) => { const l = Buffer.alloc(4); l.writeUInt32BE(buf.length); return Buffer.concat([l, buf]); };
  const point = Buffer.concat([Buffer.from([4]), b(jwk.x), b(jwk.y)]);
  const blob = Buffer.concat([str(Buffer.from('ecdsa-sha2-nistp256')), str(Buffer.from('nistp256')), str(point)]);
  return `ecdsa-sha2-nistp256 ${blob.toString('base64')}`;
}

const [beforeArg, afterArg] = process.argv.slice(2);
const after = afterArg || 'HEAD';
const first = lines(git('log', '--format=%H', '--diff-filter=A', '--reverse', after, '--', 'scripts/check-signatures.mjs'))[0];
if (!first) { console.error('check-signatures: cannot find the commit that added scripts/check-signatures.mjs'); process.exit(1); }
const zero = /^0+$/;
const before = beforeArg && !zero.test(beforeArg) && tryGit('rev-parse', '--verify', '--quiet', `${beforeArg}^{commit}`);
const range = before ? [`${before}..${after}`] : [after];
const added = lines(git('rev-list', ...range));
const inScope = new Set([first, ...lines(git('rev-list', '--ancestry-path', `${first}..${after}`))]);

// Allowed signers for one commit: every key (active or superseded) in its first parent's team/keys.json.
const dir = mkdtempSync(join(tmpdir(), 'acc-signers-'));
function signersFile(commit) {
  const parent = tryGit('rev-parse', '--verify', '--quiet', `${commit}^1`);
  if (!parent) return { error: 'no parent: a root commit has no published key to check against' };
  const text = tryGit('show', `${parent}:team/keys.json`);
  if (!text) return { error: `its parent ${parent.slice(0, 7)} has no team/keys.json` };
  let keys;
  try { keys = JSON.parse(text).keys || []; } catch { return { error: `its parent's team/keys.json is not JSON` }; }
  const out = [];
  for (const k of keys) { if (!k.bundle?.sign) continue; try { out.push(`${k.agent} namespaces="git" ${sshFromPem(k.bundle.sign)}`); } catch { /* not a P-256 key: not a signer */ } }
  if (!out.length) return { error: `its parent's team/keys.json lists no signing key` };
  const file = join(dir, `allowed_signers_${parent}`);
  writeFileSync(file, out.join('\n') + '\n');
  return { file };
}

const errors = [];
let checked = 0;
try {
  for (const c of added) {
    if (!inScope.has(c)) continue;
    checked++;
    const subject = git('log', '-1', '--format=%s', c);
    const s = signersFile(c);
    if (s.error) { errors.push(`${c.slice(0, 7)} ${subject}: ${s.error}`); continue; }
    const status = git('-c', `gpg.ssh.allowedSignersFile=${s.file}`, 'log', '-1', '--format=%G?', c);
    if (status !== 'G') errors.push(`${c.slice(0, 7)} ${subject}: signature status ${status} (want G: a good signature by a key in its parent's team/keys.json)`);
  }
} finally { rmSync(dir, { recursive: true, force: true }); }
if (errors.length) { console.error(errors.join('\n')); console.error(`FAILED (${errors.length} of ${checked} commits checked)`); process.exit(1); }
console.log(`OK (${checked} signed commits checked, ${added.length - checked} older than the check skipped)`);
