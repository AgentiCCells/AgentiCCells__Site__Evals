// Behind the scenes, from data.json written by scripts/build.mjs. Code Apache-2.0.
import { el } from '/core/v0.1/ui.js';
const d = await (await fetch('/behind-the-scenes/data.json')).json();
// A small, safe Markdown reader: headings, lists, paragraphs, inline code. Text only, never HTML.
const inline = (s) => s.split(/(`[^`]+`)/).map((p) => (p.startsWith('`') && p.endsWith('`') ? el('code', {}, p.slice(1, -1)) : p));
function md(text) {
  const out = []; let list = null;
  for (const line of text.split('\n')) {
    const h = line.match(/^(#{1,4}) (.*)/), li = line.match(/^\s*(?:[-*]|\d+\.) (.*)/);
    if (li) { if (!list) out.push(list = el('ul')); list.append(el('li', {}, ...inline(li[1]))); continue; }
    list = null;
    if (h) out.push(el(`h${Math.min(6, h[1].length + 2)}`, {}, ...inline(h[2])));
    else if (line.trim()) out.push(el('p', {}, ...inline(line)));
  }
  return out;
}
const root = document.getElementById('bts');
root.replaceChildren(
  el('h2', {}, 'The team'),
  el('ul', { class: 'cards' }, ...d.roles.map((r) => el('li', {}, el('h3', {}, r.agent), el('p', {}, r.purpose), el('p', {}, el('a', { href: `/policies/#team-${r.role}-json` }, 'Its policy'))))),
  el('h2', {}, 'The workflow'), ...md(d.workflow),
  el('h2', {}, 'Round reports'),
  ...(d.rounds.length ? d.rounds.map((r) => el('details', { class: 'panel', open: r === d.rounds.at(-1) }, el('summary', {}, `Round ${r.n}`), ...md(r.text))) : [el('p', {}, 'No rounds yet.')]),
  el('h2', {}, 'Commit timeline'),
  el('div', { class: 'tablewrap' }, el('table', {}, el('tr', {}, el('th', {}, 'When (UTC)'), el('th', {}, 'Commit'), el('th', {}, 'Agent'), el('th', {}, 'What')),
    ...d.timeline.map((c) => el('tr', {}, el('td', {}, c.date.replace('T', ' ').slice(0, 16)), el('td', {}, el('a', { href: `https://github.com/AgentiCCells/AgentiCCells__Site__Evals/commit/${c.sha}` }, c.sha.slice(0, 7))), el('td', {}, c.agent || 'none'), el('td', {}, c.subject))))),
  el('p', { class: 'muted' }, `Built ${d.built}.`));
