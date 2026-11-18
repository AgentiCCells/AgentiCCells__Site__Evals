// Runs the core v0.1 tests in the browser. Code Apache-2.0.
import { runTests } from './tests.js';
const results = await runTests({
  load: async (p) => (await fetch(new URL(p, import.meta.url))).json(),
  policies: async (p) => (await fetch(`/policies/${p}`)).json(),
});
const ol = document.getElementById('results');
for (const r of results) {
  const li = document.createElement('li');
  li.className = r.pass ? 'acc-pass' : 'acc-fail';
  li.textContent = `${r.pass ? 'Pass' : 'Fail'}: ${r.name}${r.error ? `: ${r.error}` : ''} (${r.ms} ms)`;
  ol.append(li);
}
const failed = results.filter((r) => !r.pass).length;
const s = document.getElementById('summary');
s.textContent = failed ? `${failed} of ${results.length} tests failed.` : `All ${results.length} tests passed.`;
s.className = failed ? 'acc-fail' : 'acc-pass';
document.documentElement.dataset.tests = failed ? 'failed' : 'passed';
