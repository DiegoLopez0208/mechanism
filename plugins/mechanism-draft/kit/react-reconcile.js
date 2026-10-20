/*
 * kit/react-reconcile.js - how React decides what to do to the DOM when a list of children changes. Pure (Node and browser).
 * Written from the published description of the algorithm: react.dev "Rendering lists" and "Preserving and resetting state", the legacy "Reconciliation" page, and the comments of
 * reconcileChildrenArray in ReactChildFiber (React 18). In two passes:
 *   1. walk both lists from the start while the keys are equal: those children stay where they are (the update touches their props only);
 *   2. put the remaining old children in a map by key and walk the rest of the new list: a child that is not in the map is INSERTED; one that is in the map has an old index;
 *      if that old index is LESS than lastPlacedIndex (the highest old index already placed) the child MOVES, otherwise it stays and lastPlacedIndex becomes its old index.
 *      Whatever is left in the map is DELETED.
 * A move costs one DOM operation (insertBefore on an existing node). Which children move therefore depends on the direction of the change: lastPlacedIndex only ever grows.
 * diff(oldTree, newTree) is the same idea one level up, for what a component returns: React compares the old and the new element at the same place. Same type: it keeps the DOM node and only updates what
 * changed (legacy.reactjs.org/docs/reconciliation, "DOM Elements Of The Same Type"); different type: it tears the old subtree down and builds the new one ("Elements Of Different Types"). A tree node is
 * { type, text, children }; nodes are numbered in document order (the order of querySelectorAll('*')).
 * reconcile(old, next, { keyed }) with keyed false uses the position as the key (the "index as key" mistake): nothing moves, texts are rewritten instead.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), R = (MX.react = {});
  R.reconcile = (oldLabels, newLabels, opt) => {
    const keyed = !opt || opt.keyed !== false, ok = oldLabels.map((l, i) => (keyed ? l : 'p' + i)), nk = newLabels.map((l, i) => (keyed ? l : 'p' + i));
    const steps = [], moves = [], inserts = [], deletes = []; let lastPlaced = 0, textUpdates = 0, i = 0;
    // pass 1: same key in the same slot
    for (; i < ok.length && i < nk.length && ok[i] === nk[i]; i++) {
      lastPlaced = i; if (oldLabels[i] !== newLabels[i]) textUpdates++;
      steps.push({ index: i, label: newLabels[i], key: nk[i], action: 'stay', pass: 1, oldIndex: i, lastPlaced, note: 'same key, same place: left alone' + (oldLabels[i] !== newLabels[i] ? ' (only its text is rewritten)' : '') });
    }
    if (i === nk.length) { for (let j = i; j < ok.length; j++) { deletes.push(oldLabels[j]); steps.push({ index: j, label: oldLabels[j], key: ok[j], action: 'delete', pass: 1, oldIndex: j, lastPlaced, note: 'the new list ends here: the rest is deleted' }); } }
    else if (i === ok.length) { for (let j = i; j < nk.length; j++) { inserts.push(newLabels[j]); steps.push({ index: j, label: newLabels[j], key: nk[j], action: 'insert', pass: 1, oldIndex: null, lastPlaced, note: 'the old list ends here: the rest is created' }); } }
    else {
      // pass 2: the rest, by key
      const map = new Map(); for (let j = i; j < ok.length; j++) map.set(ok[j], j);
      for (let j = i; j < nk.length; j++) {
        const k = nk[j];
        if (map.has(k)) {
          const oi = map.get(k); map.delete(k);
          if (oi < lastPlaced) { moves.push(newLabels[j]); steps.push({ index: j, label: newLabels[j], key: k, action: 'move', pass: 2, oldIndex: oi, lastPlaced, note: 'it was at position ' + oi + ', before the marker (' + lastPlaced + '): React has to move it' }); }
          else { const was = lastPlaced; lastPlaced = oi; steps.push({ index: j, label: newLabels[j], key: k, action: 'stay', pass: 2, oldIndex: oi, lastPlaced, note: 'it was at position ' + oi + ', not before the marker (' + was + '): it stays, the marker moves to ' + oi }); }
        } else { inserts.push(newLabels[j]); steps.push({ index: j, label: newLabels[j], key: k, action: 'insert', pass: 2, oldIndex: null, lastPlaced, note: 'no old item has this key: React creates it' }); }
      }
      map.forEach((oi) => { deletes.push(oldLabels[oi]); steps.push({ index: oi, label: oldLabels[oi], key: ok[oi], action: 'delete', pass: 2, oldIndex: oi, lastPlaced, note: 'the new list no longer has this key: React deletes it' }); });
    }
    return { steps, moves, inserts, deletes, textUpdates, finalOrder: newLabels.slice(), lastPlaced };
  };
  R.diff = (oldTree, newTree) => {
    const out = { kept: 0, updated: [], created: 0, removed: 0 }; let idx = 0;
    const size = (n) => 1 + (n.children || []).reduce((a, c) => a + size(c), 0);
    const walk = (a, b) => {
      const me = idx++;
      if (a.type !== b.type) { out.removed += size(a); out.created += size(b); idx += size(a) - 1; return; }
      out.kept++; if ((a.text || '') !== (b.text || '')) out.updated.push(me);
      const ca = a.children || [], cb = b.children || [];
      for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
        if (ca[i] && cb[i]) walk(ca[i], cb[i]);
        else if (ca[i]) { out.removed += size(ca[i]); idx += size(ca[i]); }
        else out.created += size(cb[i]);
      }
    };
    walk(oldTree, newTree); return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
