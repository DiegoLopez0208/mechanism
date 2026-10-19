/* kit/svg2d.js - Draft 0.3: an engineering SVG of each 2D drawing part, written from the geometry kit/geom2d.js validated.
 * Pure string output: no DOM, no canvas, no three.js; runs in Node (scripts/export-svg.mjs) and in a page. Contract: docs/draft-svg.md.
 *
 *   MX.svg2d.part(spec, partId, { mode, S, G, validation, allowCollisions })  ->  { svg, report }
 *     mode 'geometry-1to1': 1 user unit = 1 mm of the part; width/height = the drawing's extent in mm
 *     mode 'sheet-fit':     A4 landscape (297 x 210 mm); the geometry scaled by k and the scale written on the sheet
 *   Every number comes from geom2d (build() through viewSet()); nothing is measured here. Text and strokes are sized in mm of the
 *   document, never as geometry. A label that collides wherever it can go stops the export (report.collisions), unless allowed.
 */
(function (g) {
  'use strict';
  const MX = g.MX = g.MX || {}, X = MX.svg2d = {};
  X.MODES = ['geometry-1to1', 'sheet-fit'];
  X.GENERATOR = 'mechanism-draft svg2d';
  const TEXT = 3.5, SMALL = 2.5, VIS = 0.5, THIN = 0.25, ARROW = 2.5, GAP = 1, OVER = 1.5, CHARW = 0.62, PAD = 0.4;
  const INK = '#1d2329', MUTE = '#55606a', COL = { compared: '#00737c', declared: INK, estimated: '#b45f06' };
  const SHEET = { w: 297, h: 210, m: 10 };
  // XML text: the five entities, and no control characters (they are not allowed in XML 1.0)
  const esc = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
  X.esc = esc; X.slug = slug;
  // every number written goes through here: finite, fixed precision (so the same spec gives the same bytes), no "-0"
  const n = (v) => { if (!Number.isFinite(v)) throw new Error('svg2d: a non-finite number would be written (' + v + ')'); const r = Math.round(v * 1e4) / 1e4; return String(Object.is(r, -0) ? 0 : r); };
  const textW = (s, size) => String(s).length * size * CHARW;

  /* ---- collision geometry (layout only: the drawn curves stay exact) */
  const segBox = (a, b, x0, y0, x1, y1) => {      // does segment ab cross the box? (Liang-Barsky)
    let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (Math.abs(p) < 1e-12) { if (q < 0) return false; } else { const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
    }
    return true;
  };
  const boxBox = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  // proper crossing of two segments, for leader tests
  const segCross = (a, b) => {
    const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const d1 = o(b[0], b[1], a[0]), d2 = o(b[0], b[1], a[1]), d3 = o(a[0], a[1], b[0]), d4 = o(a[0], a[1], b[1]);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  };
  const opsSegs = (ops, P) => {      // a contour as short segments, for collision tests only
    const out = []; let cur = null, start = null;
    for (const op of ops) {
      if (op[0] === 'M') { cur = P(op[1], op[2]); start = cur; }
      else if (op[0] === 'L') { const p = P(op[1], op[2]); if (cur) out.push([cur, p]); cur = p; }
      else if (op[0] === 'A') { const [, cx, cy, r, a0, a1] = op; for (let i = 1; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8, p = P(cx + r * Math.cos(a), cy + r * Math.sin(a)); if (cur) out.push([cur, p]); cur = p; } }
      else if (op[0] === 'C') { const [, cx, cy, r] = op; let q = P(cx + r, cy); for (let i = 1; i <= 48; i++) { const a = Math.PI * 2 * i / 48, p = P(cx + r * Math.cos(a), cy + r * Math.sin(a)); out.push([q, p]); q = p; } }
      else if (op[0] === 'Z') { if (cur && start) out.push([cur, start]); cur = start; }
    }
    return out;
  };

  X.part = (spec, partId, opts = {}) => {
    const mode = opts.mode, S = opts.S || MX.spec, G = opts.G || MX.geom2d;
    if (!X.MODES.includes(mode)) throw new Error('svg2d: mode must be ' + X.MODES.join(' or ') + ' (got ' + JSON.stringify(mode) + ')');
    if (!G || !S) throw new Error('svg2d: kit/geom2d.js and kit/spec-core.js are needed');
    const V = opts.validation || S.validate(spec);
    if (V.errors.length) throw new Error('svg2d: the spec does not pass the gate; nothing is exported:\n' + V.errors.join('\n'));
    const part = (spec.parts || []).find((p) => p.id === partId);
    if (!part || part.kind !== 'drawing') throw new Error('svg2d: ' + JSON.stringify(partId) + ' is not a 2D drawing part of this spec');
    const vs = G.viewSet(spec, S), v = vs.entries.find((e) => e.id === partId).views.front, info = vs.parts[partId];
    const pid = slug(partId), ids = new Set(), idOf = (s) => { const base = pid + '-' + slug(s); let id = base, i = 2; while (ids.has(id)) id = base + '-' + i++; ids.add(id); return id; };

    // scale and placement: P maps view mm (x right, y down) to document units
    const [bl, bt, br, bb] = v.bounds, LBL = TEXT * 2.2;      // the drawing's bounds plus room for the labels around them
    let k, ox, oy, W, H, vb, area;
    if (mode === 'geometry-1to1') { k = 1; ox = 0; oy = 0; vb = [bl - LBL, bt - LBL, br - bl + 2 * LBL, bb - bt + 2 * LBL + 8]; W = vb[2]; H = vb[3]; area = null; }
    else {
      area = { x0: SHEET.m + 5, y0: SHEET.m + 5, x1: SHEET.w - SHEET.m - 5, y1: SHEET.h - SHEET.m - 48 };      // above the title block
      k = Math.min((area.x1 - area.x0 - 2 * LBL) / (br - bl), (area.y1 - area.y0 - 2 * LBL) / (bb - bt));
      ox = (area.x0 + area.x1) / 2 - (bl + br) / 2 * k; oy = (area.y0 + area.y1) / 2 - (bt + bb) / 2 * k; W = SHEET.w; H = SHEET.h; vb = [0, 0, W, H];
    }
    const P = (x, y) => [ox + x * k, oy + y * k];
    const scaleText = k === 1 ? '1:1' : k < 1 ? '1:' + n(1 / k) : n(k) + ':1';

    // ---- geometry: one element per contour (a circle as <circle>, the rest as a path with exact arcs); the material as one even-odd path
    const pathOf = (ops) => {
      let d = '';
      for (const op of ops) {
        if (op[0] === 'M' || op[0] === 'L') { const p = P(op[1], op[2]); d += op[0] + n(p[0]) + ' ' + n(p[1]) + ' '; }
        else if (op[0] === 'A') { const [, cx, cy, r, a0, a1] = op, e = P(cx + r * Math.cos(a1), cy + r * Math.sin(a1)); d += 'A' + n(r * k) + ' ' + n(r * k) + ' 0 ' + (Math.abs(a1 - a0) > Math.PI ? 1 : 0) + ' ' + (a1 > a0 ? 1 : 0) + ' ' + n(e[0]) + ' ' + n(e[1]) + ' '; }
        else if (op[0] === 'C') { const [, cx, cy, r] = op, a = P(cx + r, cy), b = P(cx - r, cy), R = n(r * k); d += 'M' + n(a[0]) + ' ' + n(a[1]) + ' A' + R + ' ' + R + ' 0 1 1 ' + n(b[0]) + ' ' + n(b[1]) + ' A' + R + ' ' + R + ' 0 1 1 ' + n(a[0]) + ' ' + n(a[1]) + ' Z '; }
        else d += 'Z ';
      }
      return d.trim();
    };
    const geo = [], defs = [], hatchId = pid + '-hatch', material = pathOf(v.contours.flatMap((c) => c.ops));
    if (v.section) {
      const pitch = n(Math.max(0.8, v.section.pitch * k));
      defs.push('<pattern id="' + hatchId + '" patternUnits="userSpaceOnUse" width="' + pitch + '" height="' + pitch + '" patternTransform="rotate(' + n(90 - v.section.angle) + ')"><line x1="0" y1="0" x2="0" y2="' + pitch + '" stroke="' + MUTE + '" stroke-width="' + n(THIN) + '"/></pattern>');
      geo.push('<path id="' + idOf('material') + '" class="material section" d="' + material + '" fill="url(#' + hatchId + ')" fill-rule="evenodd" stroke="none"/>');
    } else geo.push('<path id="' + idOf('material') + '" class="material" d="' + material + '" fill="' + INK + '" fill-opacity="0.04" fill-rule="evenodd" stroke="none"/>');
    for (const c of v.contours) {
      const id = idOf(c.id), cls = 'edge ' + c.role, attrs = ' fill="none" stroke="' + INK + '" stroke-width="' + n(VIS) + '" stroke-linejoin="round" data-geometry-id="' + esc(c.id) + '"';
      if (c.circle) { const q = P(c.circle.c[0], c.circle.c[1]); geo.push('<circle id="' + id + '" class="' + cls + '" cx="' + n(q[0]) + '" cy="' + n(q[1]) + '" r="' + n(c.circle.r * k) + '"' + attrs + '/>'); }
      else geo.push('<path id="' + id + '" class="' + cls + '" d="' + pathOf(c.ops) + '"' + attrs + '/>');
    }
    // centre and hidden lines
    const lines = [];
    const dash = (st) => (st === 'center' ? ' stroke-dasharray="' + [6, 1.5, 1, 1.5].map(n).join(' ') + '"' : st === 'hidden' ? ' stroke-dasharray="' + [3, 1.5].map(n).join(' ') + '"' : '');
    for (const ln of v.lines) {
      const st = ' fill="none" stroke="' + (ln.style === 'visible' ? INK : MUTE) + '" stroke-width="' + n(ln.style === 'visible' ? VIS : THIN) + '"' + dash(ln.style) + ' class="line ' + ln.style + '"';
      if (ln.arc) {
        const [cx, cy, r, a0, a1] = ln.arc, q = P(cx, cy);
        if (Math.abs(Math.abs(a1 - a0) - Math.PI * 2) < 1e-9) lines.push('<circle cx="' + n(q[0]) + '" cy="' + n(q[1]) + '" r="' + n(r * k) + '"' + st + '/>');
        else { const s = P(cx + r * Math.cos(a0), cy + r * Math.sin(a0)), e = P(cx + r * Math.cos(a1), cy + r * Math.sin(a1)); lines.push('<path d="M' + n(s[0]) + ' ' + n(s[1]) + ' A' + n(r * k) + ' ' + n(r * k) + ' 0 ' + (Math.abs(a1 - a0) > Math.PI ? 1 : 0) + ' ' + (a1 > a0 ? 1 : 0) + ' ' + n(e[0]) + ' ' + n(e[1]) + '"' + st + '/>'); }
      } else { const pts = []; for (let i = 0; i < ln.pts.length; i += 2) pts.push(P(ln.pts[i], ln.pts[i + 1])); lines.push('<polyline points="' + pts.map((q) => n(q[0]) + ',' + n(q[1])).join(' ') + '"' + st + '/>'); }
    }
    // obstacles a label may not touch: every contour, every dimension line but its own, the labels already placed, the sheet frame
    const obstacles = [], lineObs = [];
    v.contours.forEach((c) => opsSegs(c.ops, P).forEach((s) => obstacles.push({ seg: s, what: 'contour ' + c.id, id: c.id })));
    const frame = area ? [SHEET.m, SHEET.m, SHEET.w - SHEET.m, SHEET.h - SHEET.m - 40] : null;

    // ---- dimensions: lines from the view set, labels placed here
    const dimEls = [], placed = [], collisions = [];
    const arrow = (x, y, ang, col) => { const a = [x - ARROW * Math.cos(ang - 0.33), y - ARROW * Math.sin(ang - 0.33)], b = [x - ARROW * Math.cos(ang + 0.33), y - ARROW * Math.sin(ang + 0.33)]; return '<path d="M' + n(x) + ' ' + n(y) + ' L' + n(a[0]) + ' ' + n(a[1]) + ' L' + n(b[0]) + ' ' + n(b[1]) + ' Z" fill="' + col + '" stroke="none"/>'; };
    const plans = v.dims.map((d) => {      // the dimension geometry of every dimension first: every label must avoid all of it
      const col = COL[d.status] || INK;
      if (d.kind === 'linear') {
        const h = d.dir === 'h', a = P(d.a[0], d.a[1]), b = P(d.b[0], d.b[1]), at = h ? P(0, d.at)[1] : P(d.at, 0)[0], s = Math.sign(h ? at - a[1] : at - a[0]) || 1;
        const ext = h ? [[[a[0], a[1] + s * GAP], [a[0], at + s * OVER]], [[b[0], b[1] + s * GAP], [b[0], at + s * OVER]]] : [[[a[0] + s * GAP, a[1]], [at + s * OVER, a[1]]], [[b[0] + s * GAP, b[1]], [at + s * OVER, b[1]]]];
        const line = h ? [[a[0], at], [b[0], at]] : [[at, a[1]], [at, b[1]]];
        ext.concat([line]).forEach((sg) => lineObs.push({ seg: sg, key: d.key }));
        return { d, col, h, a, b, at, ext, line };
      }
      return { d, col, leader: true, c: P(d.c[0], d.c[1]), r: d.r * k, len: Math.max(6, (d.len == null ? 8 : d.len) * k) };
    });
    const hits = (box, self) => {
      if (frame && (box[0] < frame[0] || box[1] < frame[1] || box[2] > frame[2] || box[3] > frame[3])) return 'the sheet border';
      for (const o of obstacles) if (segBox(o.seg[0], o.seg[1], box[0], box[1], box[2], box[3])) return o.what;
      for (const o of lineObs) if (o.key !== self && segBox(o.seg[0], o.seg[1], box[0], box[1], box[2], box[3])) return 'the dimension line of ' + o.key;
      for (const q of placed) if (boxBox(box, q.box)) return 'the label of ' + q.key;
      return null;
    };
    for (const p of plans) {
      const d = p.d, text = d.text, tw = textW(text, TEXT) + 2 * PAD, th = TEXT + 2 * PAD;
      let el = '<g class="dim ' + d.kind + ' ' + d.status + '" data-key="' + esc(d.key || '') + '" data-value="' + n(d.value) + '">';
      if (!p.leader) {
        // along the dimension line, on either side of it: the middle first
        let best = null, why = null;
        for (const t of [0.5, 0.3, 0.7, 0.15, 0.85]) for (const side of [-1, 1]) {
          if (best) break;
          const off0 = side < 0 ? p.at - 0.8 - TEXT : p.at + 0.8, off1 = off0 + TEXT;
          let box, tx, ty, rot = 0;
          if (p.h) { tx = p.line[0][0] + (p.line[1][0] - p.line[0][0]) * t; ty = off1; box = [tx - tw / 2, off0 - PAD, tx + tw / 2, off1 + PAD]; }
          else { ty = p.line[0][1] + (p.line[1][1] - p.line[0][1]) * t; tx = off1; rot = -90; box = [off0 - PAD, ty - tw / 2, off1 + PAD, ty + tw / 2]; }
          const w = hits(box, d.key); if (!w) best = { tx, ty, rot, box }; else if (!why) why = w;
        }
        el += p.ext.concat([p.line]).map((sg) => '<line x1="' + n(sg[0][0]) + '" y1="' + n(sg[0][1]) + '" x2="' + n(sg[1][0]) + '" y2="' + n(sg[1][1]) + '" stroke="' + p.col + '" stroke-width="' + n(THIN) + '"/>').join('');
        const span = Math.abs(p.h ? p.line[1][0] - p.line[0][0] : p.line[1][1] - p.line[0][1]);
        if (span > 3 * 0.3) { const dir = Math.sign(p.h ? p.line[1][0] - p.line[0][0] : p.line[1][1] - p.line[0][1]) || 1, ang = p.h ? 0 : Math.PI / 2; el += arrow(p.line[0][0], p.line[0][1], dir > 0 ? ang + Math.PI : ang, p.col) + arrow(p.line[1][0], p.line[1][1], dir > 0 ? ang : ang + Math.PI, p.col); }
        if (!best) { collisions.push({ key: d.key, text, with: why }); best = p.h ? { tx: (p.line[0][0] + p.line[1][0]) / 2, ty: p.at - 0.8, rot: 0 } : { tx: p.at - 0.8, ty: (p.line[0][1] + p.line[1][1]) / 2, rot: -90 }; }
        else placed.push({ key: d.key, box: best.box });
        el += '<text x="' + n(best.tx) + '" y="' + n(best.ty) + '"' + (best.rot ? ' transform="rotate(' + best.rot + ' ' + n(best.tx) + ' ' + n(best.ty) + ')"' : '') + ' font-size="' + n(TEXT) + '" text-anchor="middle" fill="' + p.col + '">' + esc(text) + '</text></g>';
      } else {
        // a leader from the contour: the direction the geometry chose first, then the other diagonals and the verticals
        const own = d.key ? d.key.slice(0, d.key.lastIndexOf('.')) : null, ANG = [d.angle].concat([-Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4, Math.PI / 4, -Math.PI / 2, Math.PI / 2].filter((a) => Math.abs(a - d.angle) > 1e-9));
        let best = null, why = null;
        // each direction at its own length, then twice and three times as long (a long note may have to leave the part first)
        for (const ang of [1, 2, 3].flatMap((m) => ANG.map((a) => [a, m]))) {
          const [a, mult] = ang, u = Math.cos(a), w = Math.sin(a), p0 = [p.c[0] + p.r * u, p.c[1] + p.r * w], p1 = [p0[0] + p.len * mult * u, p0[1] + p.len * mult * w], side = u >= 0 ? 1 : -1, sh = [p1[0] + side * 3, p1[1]], tx = sh[0] + side * 0.8;
          const box = side > 0 ? [tx - PAD, sh[1] - th / 2, tx + tw, sh[1] + th / 2] : [tx - tw, sh[1] - th / 2, tx + PAD, sh[1] + th / 2], lead = [[p0[0] + 0.8 * u, p0[1] + 0.8 * w], p1];
          let hit = hits(box, d.key);
          // a leader may cross the outline (to leave the part), never another hole
          if (!hit) for (const o of obstacles) if (o.id !== own && o.id !== 'outline' && segCross(lead, o.seg)) { hit = 'its leader crosses ' + o.what; break; }
          if (!hit) for (const q of placed) if (segBox(lead[0], lead[1], q.box[0], q.box[1], q.box[2], q.box[3])) { hit = 'its leader crosses the label of ' + q.key; break; }
          if (!hit) { best = { p0, p1, sh, tx, side, box, ang: a }; break; } if (!why) why = hit;
        }
        if (!best) { const ang = d.angle, u = Math.cos(ang), w = Math.sin(ang), p0 = [p.c[0] + p.r * u, p.c[1] + p.r * w], p1 = [p0[0] + p.len * u, p0[1] + p.len * w], side = u >= 0 ? 1 : -1; best = { p0, p1, sh: [p1[0] + side * 3, p1[1]], tx: p1[0] + side * 3.8, side, ang }; collisions.push({ key: d.key, text, with: why }); }
        else placed.push({ key: d.key, box: best.box });
        el += '<polyline points="' + [best.p0, best.p1, best.sh].map((q) => n(q[0]) + ',' + n(q[1])).join(' ') + '" fill="none" stroke="' + p.col + '" stroke-width="' + n(THIN) + '"/>';
        if (d.kind !== 'note' || p.r > 0) el += arrow(best.p0[0], best.p0[1], Math.atan2(-Math.sin(best.ang), -Math.cos(best.ang)), p.col);
        el += '<text x="' + n(best.tx) + '" y="' + n(best.sh[1] + TEXT * 0.35) + '" font-size="' + n(TEXT) + '" text-anchor="' + (best.side > 0 ? 'start' : 'end') + '" fill="' + p.col + '">' + esc(text) + '</text></g>';
      }
      dimEls.push(el);
    }
    if (!area) {      // 1:1 has no sheet: the document grows to hold every label and leader end (the geometry does not move)
      let [x0, y0, x1, y1] = [vb[0], vb[1], vb[0] + vb[2], vb[1] + vb[3] - 8];
      for (const q of placed) { x0 = Math.min(x0, q.box[0] - 2); y0 = Math.min(y0, q.box[1] - 2); x1 = Math.max(x1, q.box[2] + 2); y1 = Math.max(y1, q.box[3] + 2); }
      vb = [x0, y0, x1 - x0, y1 - y0 + 8]; W = vb[2]; H = vb[3];
    }
    if (collisions.length && !opts.allowCollisions) {
      const e = new Error('svg2d: ' + partId + ': ' + collisions.length + ' label(s) collide wherever they can go: the sheet is too dense for a legible layout\n' + collisions.map((c) => '  ' + c.key + ' "' + c.text + '" hits ' + c.with).join('\n'));
      e.collisions = collisions; throw e;
    }

    // ---- what is known, in words (no claim of fitness for manufacture)
    const dc = info.dimCount, verdict = (V.verdict && V.verdict.state) || 'NOTHING CHECKED', f = info.facts;
    const notes = [
      'GEOMETRY VALID: closed contours, every hole inside the material, none overlapping (kit/geom2d.js).',
      'DIMENSIONS FROM THE GEOMETRY: ' + dc.compared + ' compared with a source, ' + dc.declared + ' declared and not verified, ' + dc.estimated + ' estimated.',
      'GATE VERDICT: ' + verdict + '. NOT RUN: the 3D mesh area check (no meshes on this path).',
      'NET AREA ' + n(f.netArea) + ' mm2. DIMENSIONS IN mm. SCALE ' + scaleText + (k === 1 ? ' (geometry at its declared size).' : ' (NOT 1:1: read the numbers, do not measure the paper).'),
      'NOT A MANUFACTURING DRAWING: no tolerances, fits, surface finish or material specification.',
    ];
    const title = (spec.title || spec.id) + ' / ' + (part.name || part.id);
    let notesEl;
    if (area) {      // the title block at the bottom of the sheet, and the sheet frame
      const x0 = SHEET.m, y0 = SHEET.h - SHEET.m - 40, w = SHEET.w - 2 * SHEET.m;
      notesEl = '<g class="title-block"><rect x="' + n(x0) + '" y="' + n(y0) + '" width="' + n(w) + '" height="40" fill="none" stroke="' + INK + '" stroke-width="' + n(VIS) + '"/>'
        + '<text x="' + n(x0 + 4) + '" y="' + n(y0 + 7) + '" font-size="' + n(TEXT + 0.5) + '" font-weight="600" fill="' + INK + '">' + esc(title) + '</text>'
        + notes.map((s, i) => '<text x="' + n(x0 + 4) + '" y="' + n(y0 + 13.5 + i * 5.4) + '" font-size="' + n(SMALL) + '" fill="' + (i === 4 ? COL.estimated : INK) + '">' + esc(s) + '</text>').join('')
        + '<text x="' + n(x0 + w - 4) + '" y="' + n(y0 + 7) + '" font-size="' + n(SMALL) + '" text-anchor="end" fill="' + MUTE + '">' + esc((spec.fig || spec.id) + ' • ' + part.id + ' • ' + v.label + ' • ' + (part.mat || 'material not given') + (info.thickness != null ? ' • t ' + n(info.thickness) + ' mm' : '')) + '</text></g>'
        + '<rect class="frame" x="' + n(SHEET.m) + '" y="' + n(SHEET.m) + '" width="' + n(SHEET.w - 2 * SHEET.m) + '" height="' + n(SHEET.h - 2 * SHEET.m) + '" fill="none" stroke="' + INK + '" stroke-width="' + n(VIS) + '"/>';
    } else notesEl = '<text class="note" x="' + n(vb[0] + 1) + '" y="' + n(vb[1] + vb[3] - 2) + '" font-size="' + n(SMALL) + '" fill="' + MUTE + '">' + esc(v.label + ' • SCALE 1:1 • mm • ' + verdict + ' • NOT A MANUFACTURING DRAWING') + '</text>';

    const svg = '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<!-- ' + X.GENERATOR + ' (Mechanism Draft 0.3): ' + esc(spec.id) + ' / ' + esc(partId) + ', ' + mode + ' -->\n'
      + '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="' + n(W) + 'mm" height="' + n(H) + 'mm" viewBox="' + vb.map(n).join(' ') + '"'
      + ' data-generator="' + X.GENERATOR + '" data-mode="' + mode + '" data-scale="' + n(k) + '" data-unit="mm" font-family="Arial, Helvetica, sans-serif">\n'
      + '<title>' + esc(title) + '</title>\n<desc>' + esc(notes.join(' ')) + '</desc>\n'
      + (defs.length ? '<defs>' + defs.join('') + '</defs>\n' : '')
      + '<g id="' + pid + '" class="part">\n' + geo.join('\n') + '\n</g>\n'
      + '<g class="lines">\n' + lines.join('\n') + '\n</g>\n'
      + '<g class="dims">\n' + dimEls.join('\n') + '\n</g>\n'
      + notesEl + '\n</svg>\n';
    return { svg, report: { part: partId, mode, scale: k, scaleText, width: W, height: H, viewBox: vb, collisions, dims: v.dims.length, dimCount: dc, verdict, netArea: f.netArea } };
  };
  // every drawing part of a spec: [{ part, file, svg, report }]; file is a safe name (<spec id>-<part id>.svg)
  X.all = (spec, opts = {}) => (spec.parts || []).filter((p) => p.kind === 'drawing').map((p) => Object.assign({ part: p.id, file: slug(spec.id) + '-' + slug(p.id) + '.svg' }, X.part(spec, p.id, opts)));
})(typeof window !== 'undefined' ? window : globalThis);
