// Build: copy src/ to _site/, stamp the version, write version.json.
// SITE_VERSION is set by CI only (v0.1.N); a local build says "dev".
import { cpSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const version = process.env.SITE_VERSION || 'dev';
rmSync('_site', { recursive: true, force: true });
cpSync('src', '_site', { recursive: true });
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk('_site')) {
  if (!/\.(html|js|css|json|md|txt)$/.test(f)) continue;
  const s = readFileSync(f, 'utf8');
  if (s.includes('__VERSION__')) writeFileSync(f, s.replaceAll('__VERSION__', version));
}
writeFileSync('_site/version.json', JSON.stringify({ version, commit: process.env.GITHUB_SHA || 'local', built: new Date().toISOString() }, null, 2) + '\n');
writeFileSync('_site/.nojekyll', '');
// Behind the scenes (conductor.evals@, round 1): team roles, workflow, round reports and the commit
// timeline, read from the repository. Public keys stay in team/keys.json and are not copied.
const roles = existsSync('team/roles') ? readdirSync('team/roles').sort().map((role) => {
  const t = readFileSync(join('team/roles', role, 'ROLE.md'), 'utf8').split('\n');
  return { role, agent: `${role}.evals@AgentiCCells.dinis`, purpose: t.find((l, i) => i > 0 && l.trim()) || '' };
}) : [];
const rounds = existsSync('team/rounds') ? readdirSync('team/rounds').filter((f) => /^\d+\.md$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b))
  .map((f) => ({ n: parseInt(f), text: readFileSync(join('team/rounds', f), 'utf8') })) : [];
let timeline = [];
try {
  timeline = execFileSync('git', ['log', '-200', '--format=%H%x1f%cI%x1f%s%x1f%(trailers:key=Agent,valueonly,separator=%x2c)'], { encoding: 'utf8' })
    .split('\n').filter(Boolean).map((l) => { const [sha, date, subject, agent] = l.split('\x1f'); return { sha, date: new Date(date).toISOString(), subject, agent: agent.trim() }; });
} catch { /* no git: empty timeline */ }
mkdirSync('_site/behind-the-scenes', { recursive: true });
writeFileSync('_site/behind-the-scenes/data.json', JSON.stringify({ built: new Date().toISOString(), version, roles,
  workflow: existsSync('team/WORKFLOW.md') ? readFileSync('team/WORKFLOW.md', 'utf8') : '', rounds, timeline }, null, 1) + '\n');
console.log(`built _site/ (${version})`);
