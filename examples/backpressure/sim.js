/*
 * sim.js - discrete-event simulation of NovaTerm's PTY flow control (docs/PTY-FLOW-CONTROL.md).
 * Honest scale: 1 box = 64 KiB (the maximum of an IPC packet). So:
 *   high-water mark 256 KiB = 4 boxes in flight, resume at 64 KiB = 1 box, queue 256 chunks x 8 KiB = 32 boxes.
 * Each box gets the time of every stage; the drawing and the audio come from those times, so they stay in sync.
 */
(function (g) {
  'use strict';
  const P = g.SIM_P = { cap: 32, high: 4, low: 1, beltA: 1.3, fall: 0.5, exit: 0.4, beltB: 1.3, parse: 0.62, rail: 0.7, minGap: 0.42, kib: 64 };
  const EMIT0 = 4.0, TRICKLE_END = 9.0, BURST_GAP = 0.22, TOTAL = 64, END = 29;

  g.simulate = function () {
    const dt = 1 / 240, pk = [], log = { close: [], open: [], block: [], unblock: [], credit: [], dispatch: [], parseStart: [] };
    let nextEmit = EMIT0, emitted = 0, blocked = false, lastDispatch = -9, outstanding = 0, gateOpen = true, parserFree = 0, transitA = 0;
    const inTank = [], waiting = [], pend = { tank: [], arrive: [], credit: [] };
    for (let t = 0; t < END; t += dt) {
      if (emitted < TOTAL && t >= nextEmit) {
        if (inTank.length + transitA < P.cap) {
          const p = { id: emitted, tReady: nextEmit, tRelease: t }; pk.push(p); emitted++; transitA++;
          pend.tank.push({ t: t + P.beltA + P.fall, id: p.id });
          if (blocked) { blocked = false; log.unblock.push(t); }
          nextEmit = t + (t < TRICKLE_END ? 1.0 : BURST_GAP);
        } else if (!blocked) { blocked = true; log.block.push(t); }
      }
      while (pend.tank.length && pend.tank[0].t <= t) { const e = pend.tank.shift(); transitA--; inTank.push(e.id); pk[e.id].tTank = e.t; }
      if (gateOpen && inTank.length && outstanding < P.high && t >= lastDispatch + P.minGap) {
        const p = pk[inTank.shift()]; p.tDispatch = t; lastDispatch = t; outstanding++; p.tArrive = t + P.exit + P.beltB; pend.arrive.push({ t: p.tArrive, id: p.id }); log.dispatch.push({ t, out: outstanding });
        if (outstanding >= P.high) { gateOpen = false; log.close.push(t + 0.3); }
      }
      while (pend.arrive.length && pend.arrive[0].t <= t) waiting.push(pend.arrive.shift().id);
      if (t >= parserFree && waiting.length) { const p = pk[waiting.shift()]; p.tParseStart = t; p.tParseEnd = t + P.parse; p.tCredit = p.tParseEnd + P.rail; parserFree = p.tParseEnd; pend.credit.push({ t: p.tCredit, id: p.id }); log.parseStart.push(t); }
      while (pend.credit.length && pend.credit[0].t <= t) { const e = pend.credit.shift(); outstanding--; log.credit.push({ t: e.t, out: outstanding }); if (!gateOpen && outstanding <= P.low) { gateOpen = true; log.open.push(t); } }
    }
    // state intervals to query by time
    const iv = (a, b) => a.map((s, i) => [s, b[i] == null ? 1e9 : b[i]]);
    const merge = (a, gap) => { const o = []; for (const r of a) { const l = o[o.length - 1]; if (l && r[0] - l[1] < gap) l[1] = Math.max(l[1], r[1]); else o.push([r[0], r[1]]); } return o; };
    const closed = iv(log.close, log.open), blockedIv = merge(iv(log.block, log.unblock), 1.2);
    const inIv = (arr, t) => arr.some(([a, b]) => t >= a && t < b);
    const S = {
      pk, log, P,
      gateClosed: (t) => inIv(closed, t),
      shellBlocked: (t) => inIv(blockedIv, t),
      queue: (t) => pk.reduce((n, p) => n + (p.tTank != null && p.tTank <= t && (p.tDispatch == null || p.tDispatch > t) ? 1 : 0), 0),
      outstanding: (t) => pk.reduce((n, p) => n + (p.tDispatch != null && p.tDispatch <= t && (p.tCredit == null || p.tCredit > t) ? 1 : 0), 0),
      parsed: (t) => pk.reduce((n, p) => n + (p.tParseEnd != null && p.tParseEnd <= t ? 1 : 0), 0),
      // how many boxes are ahead of p in the parser hopper's queue (waiting) at time t
      waitSlot: (p, t) => pk.reduce((n, q) => n + (q.tArrive != null && q.tArrive < p.tArrive && (q.tParseStart == null || q.tParseStart > t) ? 1 : 0), 0),
      // p's place in the tank (0 = the oldest), smoothed with a moving average so the boxes drop without jumping
      tankSlot: (p, t) => { let s = 0; for (let k = 0; k < 6; k++) { const tt = t - k * 0.05; s += pk.reduce((n, q) => n + (q.id < p.id && q.tTank != null && q.tTank <= tt && (q.tDispatch == null || q.tDispatch > tt) ? 1 : 0), 0); } return s / 6; },
    };
    return S;
  };
})(typeof window !== 'undefined' ? window : globalThis);
