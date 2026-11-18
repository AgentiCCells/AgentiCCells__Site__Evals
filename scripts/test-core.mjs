// Runs the core's in-browser tests in Node, from src/ (no build needed). Prints OK or the failures.
// Every core version under src/core/ is tested. Code Apache-2.0.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
let failed = 0, total = 0;
for (const v of readdirSync('src/core').filter((d) => /^v\d+\.\d+$/.test(d))) {
  const dir = join('src/core', v, 'tests');
  if (!existsSync(join(dir, 'tests.js'))) { console.error(`${v}: no tests`); failed++; continue; }
  const { runTests } = await import(pathToFileURL(join(dir, 'tests.js')).href);
  const results = await runTests({
    load: async (p) => JSON.parse(readFileSync(join(dir, p), 'utf8')),
    policies: async (p) => JSON.parse(readFileSync(join('src/policies', p), 'utf8')),
  });
  for (const r of results) { total++; if (!r.pass) { failed++; console.error(`${v} FAIL ${r.name}: ${r.error}`); } }
}
if (failed) { console.error(`FAILED: ${failed} of ${total}`); process.exit(1); }
console.log(`OK (${total} core tests)`);
