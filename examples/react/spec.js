/*
 * spec.js - Fig 15: what React does to the page when you click a button. The film follows one real component through one click:
 *   1  the click changes the state (count 0 to 1)
 *   2  React calls the component again: it returns a new description of the page (8 elements)
 *   3  React compares the old description with the new one: same element, same place, keep the DOM node; only the text of the <p> differs
 *   4  React rewrites that one text in the real page; the other 7 DOM nodes are not touched
 * then the famous catch with lists: move the last of four items to the front and React moves 3 nodes; move the first to the end and it moves 1.
 * The model (kit/react-reconcile.js: diff for what a component returns, reconcile for lists) is written from the published description of the algorithm. The gate asks it what React will do and
 * compares the answer with what the REAL React 18.3.1 did in jsdom (data.js, written by scripts/make-react-sample.mjs, a MutationObserver on the page).
 * Run "node scripts/check-spec.mjs examples/react/spec.js".
 *
 * Frame: three rows of the same eight nodes (div, h1, p, button, ul, li, li, li): the component's output before the click, its output after, and the real page. The code card is above.
 */
(function () {
  const Sx = window.REACT_SAMPLE, Rc = window.MX.react, C = Sx.counter;
  const byId = Object.fromEntries(Sx.scenarios.map((s) => [s.id, s]));
  const LANES = [byId['last-to-front'], byId['first-to-end']], MODEL = LANES.map((s) => Rc.reconcile(s.old, s.next, { keyed: true }));
  // the component's output, as a tree of { type, text, children }: the same component the evidence script ran
  const li = (t) => ({ type: 'li', text: t }), tree = (n) => ({ type: 'div', children: [{ type: 'h1', text: 'Counter' }, { type: 'p', text: 'count: ' + n }, { type: 'button', text: '+1' }, { type: 'ul', children: [li('a'), li('b'), li('c')] }] });
  const DIFF = Rc.diff(tree(0), tree(1));
  const CUBE = 12, PITCH = 14.5, NC = C.total, YA = 34, YB = 4, YC = -30, P = 2, xAt = (i) => (i - (NC - 1) / 2) * PITCH;
  const smooth = (u) => u * u * (3 - 2 * u), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), HID = 0.001;
  const info = (title, lines, conf) => ({ title, lines, conf });
  const LABEL = C.tags.map((t, i) => (i === P ? 'p 0' : t)), parts = [];

  // the code card
  parts.push({ id: 'code', name: 'The component (JSX)', kind: 'plate', p: { w: 104, h: 30, r: 3, t: 1 }, mat: 'aluminum-dark', at: [14, 76, 0], explode: [0, 8, 0], conf: 'measured', claims: ['code'], tour: true,
    decals: [{ face: '+z', at: [0, 0, 0.55], w: 102, h: 28, px: 28, items: ['function Counter() {', 'const [n, setN] = useState(0)', 'return <div><h1>Counter</h1><p>count: {n}</p>', '<button onClick={() => setN(n + 1)}>+1</button>', '<ul><li>a</li><li>b</li><li>c</li></ul></div> }'].map((s, k) => ({ t: 'text', s, x: 0, y: 9.2 - k * 4.6, size: 3.3, weight: 700, font: 'mono', color: k === 3 ? '#61dafb' : '#cfe3ff' })) }],
    info: info('The component', ['this exact component is the one the real React ran in the evidence script', 'click the button: n goes from 0 to 1'], ['measured']) });

  // the emblem: three rings tilted about axes 60 degrees apart, and a nucleus
  const eulerAxis = (ax, ay, ang) => { const c = Math.cos(ang), s = Math.sin(ang), t = 1 - c, m = [t * ax * ax + c, t * ax * ay, s * ay, t * ax * ay, t * ay * ay + c, -s * ax, -s * ay, s * ax, c], y = Math.asin(Math.max(-1, Math.min(1, m[2]))), x = Math.atan2(-m[5], m[8]), z = Math.atan2(-m[1], m[0]); return [x * 180 / Math.PI, y * 180 / Math.PI, z * 180 / Math.PI]; };
  [0, 1, 2].forEach((i) => { const phi = i * Math.PI / 3; parts.push({ id: 'atom' + i, name: 'Emblem ring ' + (i + 1), kind: 'tube', p: { ro: 12, ri: 10.9, len: 1.6 }, mat: 'react-cyan', at: [-58, 76, 0], rot: eulerAxis(Math.cos(phi), Math.sin(phi), 1.2), explode: [0, 4, 0], conf: 'estimated', why: 'The emblem is drawn from the public description of the logo (three rings and a nucleus, cyan); it is decoration, not a measurement.', decor: true, tour: false }); });
  parts.push({ id: 'nucleus', name: 'Emblem nucleus', kind: 'disc', p: { r: 3.4, w: 3.4 }, mat: 'react-cyan', at: [-58, 76, 0], explode: [0, 4, 0], conf: 'estimated', why: 'The emblem is drawn from the public description of the logo; it is decoration.', decor: true, tour: false });
  const plate = (id, name, w, at, s, size, color, motion) => parts.push({ id, name, kind: 'plate', p: { w, h: 11, r: 3, t: 1 }, mat: 'aluminum-dark', at, explode: [0, 8, 0], conf: 'estimated', why: 'A caption plate.', decor: true, tour: false, motion,
    decals: [{ face: '+z', at: [0, 0, 0.55], w: w - 2, h: 9, px: 18, items: [{ t: 'text', s, x: 0, y: 0, size, weight: 800, font: 'mono', color: color || '#e8eef7' }] }] });
  plate('reactname', 'React nameplate', 34, [-58, 54, 0], 'React 18', 6, '#61dafb');
  plate('lblA', 'Row label: before', 84, [10, YA + 13, 0], 'component output, count 0', 4.2);
  plate('lblB', 'Row label: after', 84, [10, YB + 13, 0], 'component output, count 1', 4.2, null, (s) => { const e = smooth(clamp(s - 1, 0, 1)); return e <= 0 ? { scale: HID } : { scale: e }; });
  plate('lblC', 'Row label: the page', 84, [10, YC + 13, 0], 'the page: real DOM nodes', 4.2);

  const block = (id, name, i, y, mat, label, conf, claims, extra) => parts.push(Object.assign({ id, name, kind: 'block', p: { w: CUBE, d: CUBE, h: 6, r: 1.5 }, mat, at: [xAt(i), y, 0], explode: [0, 0, 8], conf, claims, tour: false,
    decals: [{ face: '+z', at: [0, 0, 3.1], w: 11, h: 11, px: 40, items: [{ t: 'text', s: label, x: 0, y: 0, size: label.length > 4 ? 3.3 : 4.6, weight: 800, font: 'mono', color: mat === 'gold' ? '#3a2a05' : '#0e2a12' }] }] }, extra));
  const rise = (s) => smooth(clamp(s - 1, 0, 1));
  for (let i = 0; i < NC; i++) {
    const t = C.tags[i];
    // before: the old description. The button pulses when it is clicked.
    block('ra' + i, 'Before: <' + t + '>', i, YA, 'nv-green', LABEL[i], 'derived', ['rule'], i === 3 ? { motion: (s) => (s < 1 ? { scale: 1 + 0.3 * Math.sin(Math.PI * clamp(s, 0, 1)) } : {}) } : {});
    // after: the new description, which rises in when React calls the component again
    const newLabel = i === P ? 'p 1' : LABEL[i];
    if (i !== P) block('rb' + i, 'After: <' + t + '>', i, YB, 'nv-green', newLabel, 'derived', ['rule'], { motion: (s) => { const e = rise(s); return e <= 0 ? { scale: HID } : { pos: [0, (1 - e) * 30, 0], scale: e }; } });
    else {
      block('rb' + i, 'After: <p> (before the comparison)', i, YB, 'nv-green', newLabel, 'derived', ['rule'], { motion: (s) => { const e = rise(s); return e <= 0 || s >= 2.3 ? { scale: HID } : { pos: [0, (1 - e) * 30, 0], scale: e }; } });
      block('rb' + i + 'g', 'After: <p> (changed)', i, YB, 'gold', newLabel, 'derived', ['rule', 'real'], { tour: true, motion: (s) => (s < 2.3 ? { scale: HID } : { scale: smooth(clamp((s - 2.3) / 0.5, 0, 1)) }),
        info: info('<p>: the text changed', ['"count: 0" becomes "count: 1"', 'same element type in the same place: React keeps the node and updates only what differs'], ['derived', 'measured']) });
    }
    // the page: the real DOM nodes, recorded in jsdom
    if (i !== P) block('rc' + i, 'Page: <' + t + '>', i, YC, 'nv-green', LABEL[i], 'measured', ['real']);
    else {
      block('rc' + i, 'Page: <p> (count 0)', i, YC, 'nv-green', 'p 0', 'measured', ['real'], { motion: (s) => (s < 3.85 ? {} : { scale: HID }) });
      block('rc' + i + 'g', 'Page: <p> (count 1)', i, YC, 'gold', 'p 1', 'measured', ['real'], { tour: true, motion: (s) => (s < 3.8 ? { scale: HID } : { scale: smooth(clamp((s - 3.8) / 0.2, 0, 1)) }),
        info: info('The only DOM node React touched', ['real React 18.3.1 in jsdom: one text rewritten, 0 nodes added, 0 removed, 7 nodes not touched'], ['measured']) });
    }
    // the comparison: a bar between the old and the new node in the same place
    parts.push({ id: 'bar' + i, name: 'Comparison bar ' + (i + 1), kind: 'block', p: { w: 1.6, d: 15, h: 1.6, r: 0.5 }, mat: i === P ? 'copper' : 'react-cyan', at: [xAt(i), (YA + YB) / 2, 0], explode: [0, 0, 6], conf: 'estimated', why: 'A marker for the comparison of two nodes in the same place; it has no size.', decor: true, tour: false,
      motion: (s) => { const e = smooth(clamp((s - 2) / 0.5, 0, 1)); return e <= 0 ? { scale: HID } : { scale: [1, e, 1] }; } });
  }
  // the update that travels from the new description to the real page
  parts.push({ id: 'probe', name: 'The update (one text)', kind: 'block', p: { w: 6, d: 6, h: 6, r: 1.5 }, mat: 'copper', at: [xAt(P), YB, 8], explode: [0, 0, 6], conf: 'estimated', why: 'A marker for the update React sends to the page; it has no size.', decor: true, tour: false,
    motion: (s) => (s < 3 || s >= 3.99 ? { scale: HID } : { pos: [0, (YC - YB) * smooth(clamp(s - 3, 0, 1)), 0] }) });

  // what the model computes, next to what the real React DOM recorded
  const vars = {};
  vars.touched = { v: DIFF.updated.length, label: 'nodes the model says React updates', claim: 'rule' };
  vars.alone = { v: DIFF.kept - DIFF.updated.length, label: 'nodes the model says stay as they are', claim: 'rule' };
  vars.rebuilt = { v: DIFF.created + DIFF.removed, label: 'nodes the model says React throws away or builds', claim: 'rule' }; vars.nsteps = { v: 5, label: 'steps', claim: 'rule' };
  const modes = [
    { id: 'unfold', label: 'One click, step by step', steps: true, expr: 'nsteps', unit: 'steps', digits: 0, formula: 'click, call, compare, update', dim: 0.6 },
    { id: 'touch', label: 'DOM nodes React touched', expr: 'touched', unit: 'of ' + C.total, digits: 0, formula: 'only the <p>: same element, same place, so the node stays and its text is rewritten', publish: { value: C.touched.length, claim: 'real' }, show: ['rb0', 'rb1', 'rb2g', 'rb3', 'rb4', 'rb5', 'rb6', 'rb7', 'rc0', 'rc1', 'rc2g', 'rc3', 'rc4', 'rc5', 'rc6', 'rc7'], dim: 0.35 },
    { id: 'alone', label: 'DOM nodes left alone', expr: 'alone', unit: 'of ' + C.total, digits: 0, formula: 'the other seven are not even touched', publish: { value: C.total - C.touched.length, claim: 'real' }, show: ['rc0', 'rc1', 'rc2g', 'rc3', 'rc4', 'rc5', 'rc6', 'rc7'], dim: 0.35 },
    { id: 'rebuilt', label: 'DOM nodes created or removed', expr: 'rebuilt', unit: 'nodes', digits: 0, formula: 'none: nothing in the page is thrown away and rebuilt', publish: { value: C.added + C.removed, claim: 'real' }, show: ['rc0', 'rc1', 'rc2g', 'rc3', 'rc4', 'rc5', 'rc6', 'rc7'], dim: 0.35 },
  ];
  modes.forEach((m) => { if (!m.show) m.show = parts.filter((p) => !p.decor).map((p) => p.id); if (m.dim == null) m.dim = 0.5; });

  window.SPEC = {
    id: 'react', brand: { accent: '#61dafb' }, fig: 'Fig 15', kicker: 'REAL SOFTWARE', title: 'React: what a click does to the page', sub: 'You click a button. How much of the page does React touch?',
    recognize: {
      object: 'React: a component re-renders and only the changed DOM node is updated (the React atom, the JSX code, three rows of nodes)',
      iconic: [{ text: 'the React emblem and the name "React 18"', partsPrefix: ['atom', 'nucleus', 'reactname'] }, { text: 'the JSX code of the component', parts: ['code'] }, { text: 'three rows of the same eight nodes, one of them gold', partsPrefix: ['ra', 'rb', 'rc'] }],
      blind: { answer: 'An explainer of React 18: the Counter component as JSX code on a card, its output as a row of elements (div, h1, p, button, ul, li x3) and the real DOM nodes below (confidence 90 from a Sonnet judge, 92 from a Haiku judge)', judge: 'two fresh models (Haiku and Sonnet) with no context, shown a label-free still (scripts/stranger.mjs)', date: '2026-10-14', ok: true },
    },
    research: {
      sources: [
        { id: 'rec', title: 'Reconciliation - React (legacy docs: "DOM Elements Of The Same Type", "Elements Of Different Types")', url: 'https://legacy.reactjs.org/docs/reconciliation.html', fetched: '2026-10-14', note: 'Same type: React looks at the attributes of both, keeps the same underlying DOM node and only updates the changed attributes. Different type: it tears the old tree down and builds the new one from scratch.' },
        { id: 'src', title: 'react/packages/react-reconciler/src/ReactChildFiber.new.js at v18.3.1 (reconcileChildrenArray, placeChild)', url: 'https://github.com/facebook/react/blob/v18.3.1/packages/react-reconciler/src/ReactChildFiber.new.js', fetched: '2026-10-14', note: 'Read through raw.githubusercontent.com: the first pass while keys match, mapRemainingChildren, lastPlacedIndex with "if (oldIndex < lastPlacedIndex) { // This is a move.", and the children left in the map being deleted.' },
        { id: 'docs', title: 'Rendering Lists - React', url: 'https://react.dev/learn/rendering-lists', fetched: '2026-10-14', note: 'Keys tell React which array item each component corresponds to, so it can match them up later; the index is what React uses without a key, and "often leads to subtle and confusing bugs" when the order changes.' },
        { id: 'run', title: 'React 18.3.1 and jsdom 25.0.1 on npm, run locally by scripts/make-react-sample.mjs', url: 'https://www.npmjs.com/package/react/v/18.3.1', fetched: Sx.generated, note: 'The real react-dom rendered the Counter component in jsdom, a click was dispatched on its button, and a MutationObserver recorded every change to the page. The same was done for eight list updates. Reproduce it with node scripts/make-react-sample.mjs (npm install in tools/react-evidence first).' },
      ],
      claims: [
        { id: 'rule', conf: 'spec', text: 'When a component renders again, React compares the element it returned before with the new one, in the same place. Same type: it keeps the DOM node and updates only what changed. Different type: it rebuilds that subtree.', src: ['rec'] },
        { id: 'code', conf: 'measured', text: 'The component on the card is the one the evidence script rendered: a div with an h1, a p showing the count, a button that adds one, and a list of three items (8 DOM elements).', src: ['run'], error: 'Exact: the script and the card are the same text, 8 elements counted from the real DOM.' },
        { id: 'real', conf: 'measured', text: 'In the real React 18.3.1 a click on the button re-runs the component (2 calls in all) and changes one text node in the page: 0 nodes added, 0 removed, 7 of 8 elements untouched. The same script recorded eight list updates (data.js).', src: ['run'], error: 'Exact: counts of DOM changes read from a MutationObserver in jsdom; React 18.3.1 and jsdom 25.0.1 are recorded in data.js.' },
        { id: 'algo', conf: 'spec', text: 'For a list, React walks the old and new children while their keys match; it puts the remaining old children in a map by key; a child found in the map is a move if its old index is below lastPlacedIndex, otherwise it stays and lastPlacedIndex becomes its old index; a child not found is inserted; what is left in the map is deleted.', src: ['src', 'docs'] },
        { id: 'logo', conf: 'estimated', text: 'The emblem next to the code: three rings tilted 60 degrees apart around a nucleus, in cyan.', why: 'It is drawn from the public description of the logo, only as decoration: no source gives it as a measurement and no logo file is used.' },
      ],
    },
    parts,
    mechanism: {
      steps: {
        rate: 1.1, count: 5, kind: () => 'lit',
        label: (i) => [
          { title: 'You click +1', formula: 'the state n goes from 0 to 1', value: 'n: 0 > 1', chips: [{ text: 'event: click', color: '#e3b341' }] },
          { title: 'React calls Counter() again', formula: 'it returns a new description of the page: the same 8 elements, with "count: 1"', value: C.total + ' elements', chips: [{ text: 'Counter ran ' + C.rendersAfter + ' times in all', color: '#61dafb' }] },
          { title: 'React compares old and new', formula: 'same element type in the same place: keep the DOM node. Only the text of the p is different', value: DIFF.updated.length + ' of ' + C.total + ' differ', chips: [{ text: 'kept ' + DIFF.kept, color: '#7ed321' }, { text: 'changed ' + DIFF.updated.length, color: '#e3b341' }, { text: 'rebuilt ' + (DIFF.created + DIFF.removed), color: '#d98a4a' }] },
          { title: 'React updates the page', formula: 'it rewrites one text. The other ' + (C.total - 1) + ' DOM nodes are not touched', value: C.touched.length + ' touched', chips: [{ text: 'text rewritten ' + C.textUpdates, color: '#e3b341' }, { text: 'added ' + C.added + ' / removed ' + C.removed, color: '#7ed321' }] },
          { title: 'The result', formula: 'one click, one text rewritten in the page, seven nodes never touched', value: C.touched.length + ' of ' + C.total, chips: [{ text: 'measured in the real React 18.3.1', color: '#61dafb' }] },
        ][Math.min(i, 4)],
      },
      calc: { vars },
      drive: { modes },
    },
    director: { outro: { url: 'github.com/DiegoLopez0208/mechanism', line: 'a skill for Claude Code and other coding agents' },  cold: { dur: 8, question: 'You click a button and a number changes. What does React do to the page?' }, what: 'A React component, its code on top. When you click, React builds a new description of the page, compares it with the old one, and touches only the DOM nodes that differ. Green: left alone. Gold: changed. Checked against the real React 18.3.1.', legend: [{ color: '#7ed321', text: 'left alone' }, { color: '#e3b341', text: 'changed' }, { color: '#d98a4a', text: 'the update' }], views: { iso: { yaw: -12, pitch: 24 }, front: { yaw: 0, pitch: 10 }, side: { yaw: 16, pitch: 20 }, three: { yaw: -6, pitch: 28 } }, modeDur: 3.4, tour: ['rb2g', 'rc2g', 'code'], short: { modes: ['unfold', 'touch', 'alone'], tour: ['rc2g', 'code'] } },
  };
})();
