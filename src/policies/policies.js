// Renders the policy library from /policies/index.json. Code Apache-2.0.
import { el } from '/core/v0.1/ui.js';
import { validatePolicy } from '/core/v0.1/abp.js';
const lib = document.getElementById('lib');
const index = await (await fetch('/policies/index.json')).json();
lib.replaceChildren();
for (const [kind, title] of [['team', 'The evals team'], ['playground', 'Playground policies']]) {
  lib.append(el('h2', {}, title));
  for (const e of index.policies.filter((p) => p.kind === kind)) {
    const p = await (await fetch(`/policies/${e.path}`)).json();
    const v = validatePolicy(p);
    lib.append(el('section', { class: 'panel', id: e.path.replace(/[/.]/g, '-') },
      el('h3', {}, p.name), el('p', {}, el('code', {}, p.id), ' ', el('span', { class: v.ok ? 'acc-pass' : 'acc-fail' }, v.ok ? 'valid' : `invalid: ${v.errors.join('; ')}`)),
      el('p', {}, p.summary),
      el('details', {}, el('summary', {}, 'Instructions, tools and checks'),
        el('ul', {}, ...p.instructions.map((i) => el('li', {}, i))),
        el('p', {}, 'Tools allowed: ', p.tools.allow.join(', ') || 'none', '. Denied: ', (p.tools.deny || []).join(', ') || 'none', '.'),
        el('ul', {}, ...(p.checks || []).map((c) => el('li', {}, `${c.kind}${c.value !== undefined ? ` ${JSON.stringify(c.value)}` : ''}: ${c.why || ''}`)))),
      el('p', {}, el('a', { href: `/policies/${e.path}` }, 'JSON'))));
  }
}
