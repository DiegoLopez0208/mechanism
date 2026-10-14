#!/usr/bin/env node
// make-react-sample.mjs - evidence for examples/react: what the REAL React DOM does to the DOM when a keyed list changes.
// React 18.3.1 and jsdom (tools/react-evidence, install with "npm install" there) render a list, apply an update, and a MutationObserver records every node that was
// removed and added in that commit. A node that is both removed and added in one commit is a MOVE (React calls insertBefore on a node that already exists); a node only
// added is an INSERT; only removed, a DELETE. The film's model (kit/react-reconcile.js) is written from the published description of the algorithm and has to predict
// exactly these sets. Recorded in examples/react/data.js.
//
//   node scripts/make-react-sample.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), req = createRequire(path.join(root, 'tools/react-evidence/package.json'));
let React, ReactDOMClient, ReactDOM, JSDOM;
try { React = req('react'); ReactDOMClient = req('react-dom/client'); ReactDOM = req('react-dom'); ({ JSDOM } = req('jsdom')); } catch (e) { console.error('install the evidence tools first:  cd tools/react-evidence && npm install\n' + e.message); process.exit(1); }
const dom = new JSDOM('<!doctype html><div id="root"></div>'); globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = false;
const h = React.createElement, version = req('react/package.json').version;

// each scenario: the old list, the new list, and whether the items carry their own key (a stable identity) or use their position as the key
const SCENARIOS = [
  { id: 'last-to-front', title: 'The last item goes to the front', old: ['A', 'B', 'C', 'D'], next: ['D', 'A', 'B', 'C'], keyed: true },
  { id: 'first-to-end', title: 'The first item goes to the end', old: ['A', 'B', 'C', 'D'], next: ['B', 'C', 'D', 'A'], keyed: true },
  { id: 'reverse', title: 'The list is reversed', old: ['A', 'B', 'C', 'D'], next: ['D', 'C', 'B', 'A'], keyed: true },
  { id: 'swap-ends', title: 'The two ends swap places', old: ['A', 'B', 'C', 'D'], next: ['D', 'B', 'C', 'A'], keyed: true },
  { id: 'insert-middle', title: 'A new item is inserted in the middle', old: ['A', 'B', 'C', 'D'], next: ['A', 'B', 'E', 'C', 'D'], keyed: true },
  { id: 'remove-one', title: 'One item is removed', old: ['A', 'B', 'C', 'D'], next: ['A', 'C', 'D'], keyed: true },
  { id: 'mixed', title: 'One removed, one inserted, one moved', old: ['A', 'B', 'C', 'D', 'E'], next: ['E', 'A', 'F', 'C', 'D'], keyed: true },
  { id: 'index-keys', title: 'The last item goes to the front, but the key is the position', old: ['A', 'B', 'C', 'D'], next: ['D', 'A', 'B', 'C'], keyed: false },
];

function run(sc) {
  const container = document.createElement('div'); document.body.appendChild(container); const rootR = ReactDOMClient.createRoot(container);
  const list = (labels) => h('ul', null, labels.map((l, i) => h('li', { key: sc.keyed ? l : 'p' + i, 'data-label': l }, l)));
  ReactDOM.flushSync(() => rootR.render(list(sc.old)));
  const before = new Map([...container.querySelectorAll('li')].map((n) => [n, n.dataset.label]));
  const obs = new dom.window.MutationObserver(() => {}); obs.observe(container, { childList: true, subtree: true, characterData: true });
  obs.takeRecords();
  ReactDOM.flushSync(() => rootR.render(list(sc.next)));
  const recs = obs.takeRecords(), added = [], removed = []; let textUpdates = 0;
  recs.forEach((r) => {
    if (r.type === 'characterData') textUpdates++;
    else if (r.type === 'childList') {
      r.addedNodes.forEach((n) => { if (n.nodeName === 'LI') added.push(n); else if (n.nodeType === 3 && r.target.nodeName === 'LI') textUpdates++; });
      r.removedNodes.forEach((n) => { if (n.nodeName === 'LI') removed.push(n); });
    }
  });
  obs.disconnect();
  // a node that appears in both lists was moved; the key it carried is its label before the update (the same DOM node)
  const label = (n) => before.get(n) || n.dataset.label, moved = added.filter((n) => removed.includes(n)).map(label), inserted = added.filter((n) => !removed.includes(n)).map(label), deleted = removed.filter((n) => !added.includes(n)).map(label);
  const finalOrder = [...container.querySelectorAll('li')].map((n) => n.dataset.label);
  rootR.unmount(); container.remove();
  return { id: sc.id, title: sc.title, old: sc.old, next: sc.next, keyed: sc.keyed, moves: moved, inserts: inserted, deletes: deleted, textUpdates, finalOrder };
}

// the click: a small component with a counter. React re-runs the component and the MutationObserver records what happened to the page
async function runCounter() {
  const container = document.createElement('div'); document.body.appendChild(container); const rootR = ReactDOMClient.createRoot(container); let renders = 0;
  const App = () => { const [n, setN] = React.useState(0); renders++; return h('div', null, h('h1', null, 'Counter'), h('p', null, 'count: ', n), h('button', { onClick: () => setN(n + 1) }, '+1'), h('ul', null, ['a', 'b', 'c'].map((k) => h('li', { key: k }, k)))); };
  ReactDOM.flushSync(() => rootR.render(h(App)));
  const els = [...container.querySelectorAll('*')], tags = els.map((n) => n.nodeName.toLowerCase()), rendersBefore = renders, textBefore = container.querySelector('p').textContent;
  const recs = [], obs = new dom.window.MutationObserver((l) => recs.push(...l)); obs.observe(container, { childList: true, subtree: true, characterData: true, attributes: true });
  container.querySelector('button').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 30));
  recs.push(...obs.takeRecords()); obs.disconnect();
  const touched = new Set(); let added = 0, removed = 0, texts = 0, attrs = 0;
  recs.forEach((r) => { if (r.type === 'characterData') { texts++; touched.add(els.indexOf(r.target.parentElement)); } else if (r.type === 'attributes') { attrs++; touched.add(els.indexOf(r.target)); } else { added += r.addedNodes.length; removed += r.removedNodes.length; touched.add(els.indexOf(r.target)); } });
  const textAfter = container.querySelector('p').textContent; rootR.unmount(); container.remove();
  return { tags, total: els.length, touched: [...touched].sort((x, y) => x - y), textUpdates: texts, attrChanges: attrs, added, removed, rendersBefore, rendersAfter: renders, textBefore, textAfter };
}
const counter = await runCounter();
const out = SCENARIOS.map(run);
const sample = { react: version, jsdom: req('jsdom/package.json').version, generated: new Date().toISOString().slice(0, 10), how: 'MutationObserver on the container: a node removed and added in one commit is a move; added only, an insert; removed only, a delete; text changes inside a kept node are counted separately.', scenarios: out, counter };
fs.mkdirSync(path.join(root, 'examples/react'), { recursive: true });
fs.writeFileSync(path.join(root, 'examples/react/data.js'), '// generated by scripts/make-react-sample.mjs from the real React DOM: do not edit\nwindow.REACT_SAMPLE = ' + JSON.stringify(sample, null, 2) + ';\n');
console.log('counter', JSON.stringify(counter));
console.log('React ' + version + ' (jsdom ' + sample.jsdom + ')');
out.forEach((s) => console.log(s.id.padEnd(15), (s.old.join('') + ' -> ' + s.next.join('')).padEnd(18), 'moves [' + s.moves.join('') + ']  inserts [' + s.inserts.join('') + ']  deletes [' + s.deletes.join('') + ']  text updates ' + s.textUpdates + '  final ' + s.finalOrder.join('')));
