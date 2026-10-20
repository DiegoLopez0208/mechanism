/* kit/geom2d.js - Draft's parametric 2D geometry: the source of truth of a piece drawing (a spec part of kind 'drawing').
 * Pure math: no DOM, no three.js. The gate (kit/spec-core.js, in the browser and in Node) and the Paper view-set producer
 * call the same build(), so a size is computed once. The data model and its invariants: docs/draft-geometry.md.
 *
 *   MX.geom2d.build(p)         { unit, thickness, outline, holes, patterns, lines, section, errors, warnings, facts, dims }
 *                              dims: the named values a spec may compare with its sources (part.params keys)
 *   MX.geom2d.viewSet(spec, S) the plain view set Paper draws ({ layout: 'piece', entries, parts }), one entry per drawing part;
 *                              S (MX.spec) tells which dimensions the gate compared with a source
 *
 * Shapes (mm): rect { w, h, r, at }, circle { d, at }, polygon { points, at }; at is the centre (rect, circle) or an offset
 * (polygon). Exact areas and signed distances; nothing is tessellated to decide an area or a containment of a circle.
 */
(function (g) {
  'use strict';
  const MX = g.MX = g.MX || {}, G = MX.geom2d = {};
  // what a drawn dimension's evidence is, strongest first: compared (a figure a source prints), derived (computed from printed figures), measured
  // (read off by a stated method, with its uncertainty), user (given by the person who asked), declared (in the spec, compared with nothing), estimated
  G.STATUS = ['compared', 'derived', 'measured', 'user', 'declared', 'estimated'];
  const EVIDENCE = { spec: 'compared', derived: 'derived', measured: 'measured', user: 'user' };
  G.UNITS = ['mm'];
  const LIN = 1e-6;      // mm: closer than this is touching
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v), isPt = (v) => Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]);
  const hyp = (x, y) => Math.sqrt(x * x + y * y), dist = (a, b) => hyp(a[0] - b[0], a[1] - b[1]), RAD = Math.PI / 180;
  const signedArea = (q) => { let s = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const onSeg = (a, b, p) => Math.min(a[0], b[0]) - LIN <= p[0] && p[0] <= Math.max(a[0], b[0]) + LIN && Math.min(a[1], b[1]) - LIN <= p[1] && p[1] <= Math.max(a[1], b[1]) + LIN;
  // do the closed segments ab and cd share a point (crossing, touching or overlapping)?
  const segHit = (a, b, c, d) => {
    const e = LIN * Math.max(1, dist(a, b), dist(c, d)), o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
    if (((o1 > e && o2 < -e) || (o1 < -e && o2 > e)) && ((o3 > e && o4 < -e) || (o3 < -e && o4 > e))) return true;
    return (Math.abs(o1) <= e && onSeg(a, b, c)) || (Math.abs(o2) <= e && onSeg(a, b, d)) || (Math.abs(o3) <= e && onSeg(c, d, a)) || (Math.abs(o4) <= e && onSeg(c, d, b));
  };
  const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return hyp(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  const inPoly = (p, q) => { let c = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++) { const a = q[i], b = q[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };

  /* ---- shapes: validated and normalised ({ type, ... } with absolute coordinates; polygons counter-clockwise) */
  function shape(s, label, err) {
    if (!s || typeof s !== 'object') { err(label + ' is not a shape (rect, circle or polygon)'); return null; }
    const at = s.at == null ? [0, 0] : s.at; if (!isPt(at)) { err(label + '.at must be two finite numbers'); return null; }
    if (s.type === 'rect') {
      const r = s.r == null ? 0 : s.r;
      if (!isNum(s.w) || !isNum(s.h) || !isNum(r)) { err(label + ': w, h and r must be finite numbers'); return null; }
      if (s.w <= 0 || s.h <= 0) { err(label + ': w and h must be positive (' + s.w + ' x ' + s.h + ')'); return null; }
      if (r < 0 || r > Math.min(s.w, s.h) / 2 + LIN) { err(label + ': corner radius ' + r + ' must be between 0 and half the shorter side (' + Math.min(s.w, s.h) / 2 + ')'); return null; }
      return { type: 'rect', cx: at[0], cy: at[1], w: s.w, h: s.h, r };
    }
    if (s.type === 'circle') {
      if (!isNum(s.d)) { err(label + ': d must be a finite number'); return null; }
      if (s.d <= 0) { err(label + ': diameter must be positive (' + s.d + ')'); return null; }
      return { type: 'circle', cx: at[0], cy: at[1], r: s.d / 2, d: s.d };
    }
    if (s.type === 'polygon') {
      if (!Array.isArray(s.points) || s.points.length < 3) { err(label + ': a polygon needs at least 3 points'); return null; }
      if (!s.points.every(isPt)) { err(label + ': every point must be two finite numbers'); return null; }
      const q = s.points.map((p) => [p[0] + at[0], p[1] + at[1]]);
      if (q.length > 3 && dist(q[0], q[q.length - 1]) <= LIN) q.pop();      // a closing point repeated: the polygon is closed anyway
      for (let i = 0; i < q.length; i++) if (dist(q[i], q[(i + 1) % q.length]) <= LIN) { err(label + ': vertices ' + i + ' and ' + ((i + 1) % q.length) + ' are the same point (degenerate edge)'); return null; }
      if (q.length < 3) { err(label + ': a polygon needs at least 3 distinct points'); return null; }
      for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) {
        if (j === i + 1 || (i === 0 && j === q.length - 1)) continue;      // neighbouring edges share a vertex
        if (segHit(q[i], q[(i + 1) % q.length], q[j], q[(j + 1) % q.length])) { err(label + ': edges ' + i + ' and ' + j + ' cross or touch (the contour is not simple)'); return null; }
      }
      const A = signedArea(q), size = Math.max(...q.map((p) => Math.abs(p[0])), ...q.map((p) => Math.abs(p[1])), 1);
      if (Math.abs(A) <= LIN * size) { err(label + ': the polygon has no area (its points are collinear)'); return null; }
      if (A < 0) q.reverse();
      return { type: 'polygon', pts: q };
    }
    err(label + ': unknown shape type ' + JSON.stringify(s.type) + ' (rect, circle or polygon)'); return null;
  }
  const area = (s) => (s.type === 'rect' ? s.w * s.h - (4 - Math.PI) * s.r * s.r : s.type === 'circle' ? Math.PI * s.r * s.r : signedArea(s.pts));
  const bbox = (s) => (s.type === 'rect' ? [s.cx - s.w / 2, s.cy - s.h / 2, s.cx + s.w / 2, s.cy + s.h / 2] : s.type === 'circle' ? [s.cx - s.r, s.cy - s.r, s.cx + s.r, s.cy + s.r]
    : [Math.min(...s.pts.map((p) => p[0])), Math.min(...s.pts.map((p) => p[1])), Math.max(...s.pts.map((p) => p[0])), Math.max(...s.pts.map((p) => p[1]))]);
  const centre = (s) => { if (s.type !== 'polygon') return [s.cx, s.cy]; const b = bbox(s); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
  // exact signed distance to the contour: negative inside
  function sdf(s, p) {
    if (s.type === 'circle') return hyp(p[0] - s.cx, p[1] - s.cy) - s.r;
    if (s.type === 'rect') { const qx = Math.abs(p[0] - s.cx) - (s.w / 2 - s.r), qy = Math.abs(p[1] - s.cy) - (s.h / 2 - s.r); return hyp(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - s.r; }
    let d = Infinity; for (let i = 0; i < s.pts.length; i++) d = Math.min(d, segDist(p, s.pts[i], s.pts[(i + 1) % s.pts.length]));
    return inPoly(p, s.pts) ? -d : d;
  }
  // the contour as a point ring, for the edge tests between two polygonal contours (a rounded corner gets 16 points)
  function ring(s) {
    if (s.type === 'polygon') return s.pts;
    if (s.type === 'circle') return Array.from({ length: 128 }, (_, i) => [s.cx + s.r * Math.cos(i * Math.PI / 64), s.cy + s.r * Math.sin(i * Math.PI / 64)]);
    const x0 = s.cx - s.w / 2, x1 = s.cx + s.w / 2, y0 = s.cy - s.h / 2, y1 = s.cy + s.h / 2, r = s.r;
    if (r <= LIN) return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const out = [], corner = (cx, cy, a0) => { for (let i = 0; i <= 16; i++) { const a = (a0 + 90 * i / 16) * RAD; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    corner(x1 - r, y0 + r, -90); corner(x1 - r, y1 - r, 0); corner(x0 + r, y1 - r, 90); corner(x0 + r, y0 + r, 180); return out;
  }
  const ringsCross = (a, b) => { for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) if (segHit(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true; return false; };
  // is the hole strictly inside the outline, with material all around it?
  function inside(o, h) {
    if (h.type === 'circle') return sdf(o, [h.cx, h.cy]) < -h.r - LIN;
    const r = ring(h); if (!r.every((p) => sdf(o, p) < -LIN)) return false;
    return o.type !== 'polygon' || !ringsCross(r, o.pts);      // rect and circle outlines are convex: the vertices decide
  }
  // do two holes leave material between them?
  function apart(a, b) {
    if (a.type === 'circle' && b.type === 'circle') return hyp(a.cx - b.cx, a.cy - b.cy) > a.r + b.r + LIN;
    if (a.type === 'circle') return sdf(b, [a.cx, a.cy]) > a.r + LIN;
    if (b.type === 'circle') return sdf(a, [b.cx, b.cy]) > b.r + LIN;
    const ra = ring(a), rb = ring(b); return !ringsCross(ra, rb) && ra.every((p) => sdf(b, p) > LIN) && rb.every((p) => sdf(a, p) > LIN);
  }
  G.area = area; G.sdf = sdf; G.bbox = bbox;

  const P_KEYS = new Set(['unit', 'thickness', 'outline', 'holes', 'patterns', 'lines', 'section']);
  G.build = (p) => {
    const errors = [], warnings = [], err = (m) => errors.push(m), out = { unit: null, thickness: null, outline: null, holes: [], patterns: [], lines: [], section: null, errors, warnings, facts: null, dims: {} };
    if (!p || typeof p !== 'object') { err('p is not an object with the geometry'); return out; }
    Object.keys(p).filter((k) => !P_KEYS.has(k)).forEach((k) => warnings.push('unknown geometry key: ' + k));
    out.unit = p.unit == null ? null : String(p.unit);
    if (!G.UNITS.includes(out.unit)) err('unit ' + JSON.stringify(p.unit) + ' is not supported: write unit: \'mm\' (the only unit of Draft 0.2)');
    if (p.thickness != null) { if (!isNum(p.thickness) || p.thickness <= 0) err('thickness must be a positive number (' + p.thickness + ')'); else out.thickness = p.thickness; }
    const o = out.outline = shape(p.outline, 'outline', err);
    const ids = new Set(), addHole = (s, id, from) => { if (!s) return; if (ids.has(id)) { err('hole id ' + id + ' is used twice'); return; } ids.add(id); out.holes.push(Object.assign(s, { id, from })); };
    (p.holes || []).forEach((h, i) => { const id = h && h.id != null ? String(h.id) : null; if (!id) { err('holes[' + i + '] has no id (every contour needs a stable id)'); return; } addHole(shape(h, 'hole ' + id, err), id, null); });
    (p.patterns || []).forEach((q, i) => {
      const id = q && q.id != null ? String(q.id) : null; if (!id) { err('patterns[' + i + '] has no id'); return; }
      if (!Number.isInteger(q.n) || q.n < 2) { err('pattern ' + id + ': n must be an integer of at least 2 (' + q.n + '): a pattern repeats; a single hole goes in holes'); return; }
      const at = q.at == null ? [0, 0] : q.at; if (!isPt(at)) { err('pattern ' + id + '.at must be two finite numbers'); return; }
      const base = shape(Object.assign({}, q.of, { at: [0, 0] }), 'pattern ' + id + '.of', err); if (!base) return;
      let pos;
      if (q.type === 'polar') {
        if (base.type !== 'circle') { err('pattern ' + id + ': a polar pattern repeats a circle (a rotated rect or polygon is not supported in 0.2)'); return; }
        if (!isNum(q.pcd) || q.pcd <= 0) { err('pattern ' + id + ': pcd must be a positive number (' + q.pcd + ')'); return; }
        const start = q.start == null ? 0 : q.start; if (!isNum(start)) { err('pattern ' + id + ': start must be a finite angle in degrees'); return; }
        pos = Array.from({ length: q.n }, (_, k) => { const a = (start + 360 * k / q.n) * RAD; return [at[0] + q.pcd / 2 * Math.cos(a), at[1] + q.pcd / 2 * Math.sin(a)]; });
        out.patterns.push({ id, type: 'polar', n: q.n, pcd: q.pcd, start, at, of: base });
      } else if (q.type === 'linear') {
        if (!isPt(q.step) || hyp(q.step[0], q.step[1]) <= LIN) { err('pattern ' + id + ': step must be two finite numbers, not zero'); return; }
        pos = Array.from({ length: q.n }, (_, k) => [at[0] + k * q.step[0], at[1] + k * q.step[1]]);
        out.patterns.push({ id, type: 'linear', n: q.n, step: q.step, at, of: base });
      } else { err('pattern ' + id + ': unknown type ' + JSON.stringify(q.type) + ' (polar or linear)'); return; }
      pos.forEach((c, k) => { const s = base.type === 'polygon' ? Object.assign({}, base, { pts: base.pts.map((v) => [v[0] + c[0], v[1] + c[1]]) }) : Object.assign({}, base, { cx: c[0], cy: c[1] }); addHole(s, id + '.' + (k + 1), id); });
    });
    (p.lines || []).forEach((l, i) => {
      const label = 'lines[' + i + ']' + (l && l.id ? ' (' + l.id + ')' : ''), style = (l && l.style) || 'visible';
      if (!['visible', 'center', 'hidden'].includes(style)) { err(label + ': style must be visible, center or hidden'); return; }
      if (l && l.type === 'segment') { if (!isPt(l.a) || !isPt(l.b)) err(label + ': a and b must be points'); else if (dist(l.a, l.b) <= LIN) err(label + ': a segment of zero length'); else out.lines.push({ type: 'segment', pts: [l.a, l.b], style }); }
      else if (l && l.type === 'polyline') { if (!Array.isArray(l.points) || l.points.length < 2 || !l.points.every(isPt)) err(label + ': a polyline needs at least 2 points'); else if (l.points.every((q) => dist(q, l.points[0]) <= LIN)) err(label + ': a polyline of zero length'); else out.lines.push({ type: 'polyline', pts: l.points, style }); }
      else if (l && l.type === 'arc') { const at = l.at == null ? [0, 0] : l.at; if (!isPt(at) || !isNum(l.r) || l.r <= 0 || !isNum(l.from) || !isNum(l.to) || Math.abs(l.to - l.from) <= LIN) err(label + ': an arc needs at, a positive r and two different angles from and to (degrees)'); else out.lines.push({ type: 'arc', at, r: l.r, from: l.from, to: l.to, style }); }
      else err(label + ': unknown line type ' + JSON.stringify(l && l.type) + ' (segment, polyline or arc)');
    });
    if (p.section != null) {
      const s = p.section, h = (s && s.hatch) || {}, angle = h.angle == null ? 45 : h.angle, pitch = h.pitch == null ? 3 : h.pitch;
      if (!s || typeof s !== 'object') err('section must be an object ({ name, hatch: { angle, pitch } })');
      else if (!isNum(angle) || !isNum(pitch) || pitch <= 0) err('section.hatch: angle must be a finite number and pitch a positive one');
      else out.section = { name: s.name == null ? null : String(s.name), angle, pitch };
    }
    if (!o) return out;
    // material: every hole inside the outline, no two holes touching
    out.holes.forEach((h) => { if (!inside(o, h)) err('hole ' + h.id + ' is not inside the material: it touches or crosses the outline'); });
    for (let i = 0; i < out.holes.length; i++) for (let j = i + 1; j < out.holes.length; j++) if (!apart(out.holes[i], out.holes[j])) err('holes ' + out.holes[i].id + ' and ' + out.holes[j].id + ' overlap or touch: no material is left between them');
    if (errors.length) return out;
    const A = area(o), Ah = out.holes.reduce((s, h) => s + area(h), 0), b = bbox(o);
    out.facts = { outlineArea: A, holeArea: Ah, netArea: A - Ah, holes: out.holes.length, width: b[2] - b[0], height: b[3] - b[1] };
    // named dimensions: the outline, every hole (size; centre from the datums, the left and bottom edge of the outline's box), every pattern
    const D = out.dims, x0 = b[0], y0 = b[1];
    if (out.thickness != null) D.thickness = out.thickness;
    if (o.type === 'circle') D['outline.d'] = o.d; else { D['outline.w'] = b[2] - b[0]; D['outline.h'] = b[3] - b[1]; if (o.type === 'rect' && o.r > 0) D['outline.r'] = o.r; }
    out.holes.forEach((h) => {
      if (h.type === 'circle') D[h.id + '.d'] = h.d; else { const hb = bbox(h); D[h.id + '.w'] = hb[2] - hb[0]; D[h.id + '.h'] = hb[3] - hb[1]; if (h.type === 'rect' && h.r > 0) D[h.id + '.r'] = h.r; }
      const c = centre(h); D[h.id + '.x'] = c[0] - x0; D[h.id + '.y'] = c[1] - y0;
    });
    out.patterns.forEach((q) => { D[q.id + '.n'] = q.n; if (q.of.type === 'circle') D[q.id + '.d'] = q.of.d; if (q.type === 'polar') D[q.id + '.pcd'] = q.pcd; else D[q.id + '.step'] = hyp(q.step[0], q.step[1]); });
    return out;
  };

  /* ---- the view set: the geometry drawn in view coordinates (x right, y down; model y is flipped), exact arcs, the material as
   * a hatchable region, dimension lines placed from the geometry. Paper draws it with one generic sheet, whatever the part. */
  const V = (p) => [p[0], -p[1]], num = (v) => String(Math.round(v * 100) / 100);
  function contour(s, segs, arcs, ops) {      // straight edges to segs, arcs to arcs, and the same contour as path ops for the region
    if (s.type === 'circle') { arcs.push([s.cx, -s.cy, s.r, 0, Math.PI * 2]); ops.push(['C', s.cx, -s.cy, s.r]); return; }
    if (s.type === 'polygon') { const q = s.pts.map(V); q.forEach((p, i) => { const n = q[(i + 1) % q.length]; segs.push(p[0], p[1], n[0], n[1]); ops.push([i ? 'L' : 'M', p[0], p[1]]); }); ops.push(['Z']); return; }
    const x0 = s.cx - s.w / 2, x1 = s.cx + s.w / 2, y0 = -s.cy - s.h / 2, y1 = -s.cy + s.h / 2, r = s.r;      // view coordinates: y0 is the top
    const e = [[x0 + r, y0, x1 - r, y0], [x1, y0 + r, x1, y1 - r], [x1 - r, y1, x0 + r, y1], [x0, y1 - r, x0, y0 + r]];
    const c = [[x1 - r, y0 + r, -Math.PI / 2, 0], [x1 - r, y1 - r, 0, Math.PI / 2], [x0 + r, y1 - r, Math.PI / 2, Math.PI], [x0 + r, y0 + r, Math.PI, Math.PI * 1.5]];
    ops.push(['M', x0 + r, y0]);
    for (let i = 0; i < 4; i++) { if (dist([e[i][0], e[i][1]], [e[i][2], e[i][3]]) > LIN) segs.push(...e[i]); ops.push(['L', e[i][2], e[i][3]]); if (r > LIN) { arcs.push([c[i][0], c[i][1], r, c[i][2], c[i][3]]); ops.push(['A', c[i][0], c[i][1], r, c[i][2], c[i][3]]); } }
    ops.push(['Z']);
  }
  function drawing(m, status) {
    const o = m.outline, b = bbox(o), segs = [], arcs = [], region = [], lines = [], dims = [], contours = [];
    // each contour on its own (id, role, path ops; a circle also as { c, r }), and all of them as the region Paper fills even-odd
    const add = (s, id, role) => { const ops = []; contour(s, segs, arcs, ops); region.push(...ops); contours.push({ id, role, ops, circle: s.type === 'circle' ? { c: [s.cx, -s.cy], r: s.r } : null }); };
    add(o, 'outline', 'outline'); m.holes.forEach((h) => add(h, h.id, 'hole'));
    m.lines.forEach((l) => lines.push(l.type === 'arc' ? { arc: [l.at[0], -l.at[1], l.r, -l.from * RAD, -l.to * RAD], style: l.style } : { pts: l.pts.map(V).flat(), style: l.style }));
    m.patterns.filter((q) => q.type === 'polar').forEach((q) => lines.push({ arc: [q.at[0], -q.at[1], q.pcd / 2, 0, Math.PI * 2], style: 'center' }));      // the pitch circle
    // dimension lines, in model units, set off from the outline's box by a gap that grows with the part
    const W = b[2] - b[0], H = b[3] - b[1], gap = Math.max(W, H) * 0.09, d = (key, value, extra) => Object.assign({ key, value, text: num(value), status: status(key) }, extra);
    const oc = centre(o), concentric = (c) => Math.abs(c[0] - oc[0]) <= LIN && Math.abs(c[1] - oc[1]) <= LIN;
    if (o.type === 'circle') dims.push(d('outline.d', o.d, { kind: 'dia', c: V([o.cx, o.cy]), r: o.r, angle: -Math.PI / 4, len: gap * 0.9, text: 'Ø' + num(o.d) }));
    else {
      dims.push(d('outline.w', W, { kind: 'linear', dir: 'h', a: V([b[0], b[1]]), b: V([b[2], b[1]]), at: -(b[1] - gap) }));
      dims.push(d('outline.h', H, { kind: 'linear', dir: 'v', a: V([b[0], b[1]]), b: V([b[0], b[3]]), at: b[0] - gap }));
      if (o.type === 'rect' && o.r > 0) dims.push(d('outline.r', o.r, { kind: 'rad', c: V([b[2] - o.r, b[3] - o.r]), r: o.r, angle: -Math.PI / 4, len: gap * 0.9, text: 'R' + num(o.r) }));
    }
    // hole positions: baseline dimensions from the datums, one per distinct coordinate (pattern holes are placed by their pattern)
    const free = m.holes.filter((h) => !h.from && !concentric(centre(h)));
    const xs = [], ys = [], once = (list, v, key) => { if (!list.some((e) => Math.abs(e.v - v) <= LIN)) list.push({ v, key }); };
    free.forEach((h) => { const c = centre(h); once(xs, c[0], h.id + '.x'); once(ys, c[1], h.id + '.y'); });
    m.patterns.forEach((q) => { if (!concentric(q.at)) { once(xs, q.at[0], null); once(ys, q.at[1], null); } });
    xs.sort((p, q) => p.v - q.v).forEach((e, i) => dims.push(d(e.key, e.v - b[0], { kind: 'linear', dir: 'h', a: V([b[0], b[3]]), b: V([e.v, b[3]]), at: -(b[3] + gap * (1 + i)), from: 'datum' })));
    ys.sort((p, q) => p.v - q.v).forEach((e, i) => dims.push(d(e.key, e.v - b[1], { kind: 'linear', dir: 'v', a: V([b[2], b[1]]), b: V([b[2], e.v]), at: b[2] + gap * (1 + i), from: 'datum' })));
    // where a callout leader goes: of the four diagonals and the two verticals (view angles), the one whose leader and text stay farthest from the
    // outline, from every other hole and from the callouts already placed (model units; deterministic)
    // the leader is L long (model units, the renderer draws it at that length), then the text runs sideways about CH per character
    const placed = [], L = gap * 0.9, CH = gap * 0.25, DIAG = [-Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4, Math.PI / 4, -Math.PI / 2, Math.PI / 2];
    const lines2 = dims.filter((e) => e.kind === 'linear').map((e) => (e.dir === 'h' ? [[e.a[0], -e.at], [e.b[0], -e.at]] : [[e.at, -e.a[1]], [e.at, -e.b[1]]]));      // dimension lines, model coordinates
    if (o.type === 'circle') placed.push([o.cx + (o.r + L) * Math.SQRT1_2 + 4 * CH, o.cy + (o.r + L) * Math.SQRT1_2]);      // the outline's own callout (up and right)
    if (o.type === 'rect' && o.r > 0) placed.push([b[2] + L * Math.SQRT1_2 + 2 * CH, b[3] + L * Math.SQRT1_2]);
    const lead = (h, text) => {
      const c = centre(h), r = h.type === 'circle' ? h.r : Math.min(bbox(h)[2] - bbox(h)[0], bbox(h)[3] - bbox(h)[1]) / 2, n = String(text).length;
      let best = DIAG[0], score = -Infinity;
      for (const a of DIAG) {
        const u = Math.cos(a), v = -Math.sin(a), side = u >= 0 ? 1 : -1, end = [c[0] + (r + L) * u, c[1] + (r + L) * v];
        const probes = [[c[0] + (r + 0.5 * L) * u, c[1] + (r + 0.5 * L) * v], end].concat([0.15, 0.5, 0.85].map((s) => [end[0] + side * (CH + s * n * CH), end[1]]));
        const sc = Math.min(...probes.map((q) => Math.min(Math.abs(sdf(o, q)), ...m.holes.filter((x) => x !== h).map((x) => Math.max(0, sdf(x, q))), ...placed.map((t) => dist(t, q)), ...lines2.map(([s, e]) => segDist(q, s, e)))));
        if (sc > score + LIN) { score = sc; best = a; }
      }
      const u = Math.cos(best), side = u >= 0 ? 1 : -1, end = [c[0] + (r + L) * u, c[1] - (r + L) * Math.sin(best)];
      for (const s of [0.15, 0.5, 0.85]) placed.push([end[0] + side * (CH + s * n * CH), end[1]]);
      return best;
    };
    // hole sizes: one callout per size and status (n x when several share it); patterns get their own note
    const groups = new Map();
    free.concat(m.holes.filter((h) => !h.from && concentric(centre(h)))).forEach((h) => {
      const key = h.type === 'circle' ? h.id + '.d' : h.id + '.w', st = status(key), size = h.type === 'circle' ? 'Ø' + num(h.d) : num(bbox(h)[2] - bbox(h)[0]) + ' x ' + num(bbox(h)[3] - bbox(h)[1]), k = size + '|' + st;
      if (!groups.has(k)) groups.set(k, { h, n: 0, size, key, st }); groups.get(k).n++;
    });
    for (const { h, n, size, key, st } of groups.values()) {
      if (h.type === 'circle') dims.push({ key, value: h.d, kind: 'dia', c: V([h.cx, h.cy]), r: h.r, angle: lead(h, (n > 1 ? n + '× ' : '') + size), len: L, text: (n > 1 ? n + '× ' : '') + size, status: st });
      else {      // "w x h" is two dimensions in one callout: both keys and both values travel with it, and it shows the weaker evidence of the two
        const hb = bbox(h), keyH = h.id + '.h', both = [st, status(keyH)].sort((p, q) => G.STATUS.indexOf(q) - G.STATUS.indexOf(p))[0];
        dims.push({ key, value: hb[2] - hb[0], keys: [key, keyH], values: [hb[2] - hb[0], hb[3] - hb[1]], kind: 'note', c: V(centre(h)), r: Math.min(hb[2] - hb[0], hb[3] - hb[1]) / 2, angle: lead(h, (n > 1 ? n + '× ' : '') + size), len: L, text: (n > 1 ? n + '× ' : '') + size, status: both });
      }
    }
    m.patterns.forEach((q) => {
      const key = q.type === 'polar' ? q.id + '.pcd' : q.id + '.step', first = m.holes.find((h) => h.from === q.id), sz = q.of.type === 'circle' ? 'Ø' + num(q.of.d) : num(bbox(q.of)[2] - bbox(q.of)[0]) + ' x ' + num(bbox(q.of)[3] - bbox(q.of)[1]);
      const text = q.n + '× ' + sz + (q.type === 'polar' ? ' ON PCD ' + num(q.pcd) : ' AT ' + num(hyp(q.step[0], q.step[1])) + ' PITCH');
      dims.push({ key, value: q.type === 'polar' ? q.pcd : hyp(q.step[0], q.step[1]), kind: 'note', c: V(centre(first)), r: first.type === 'circle' ? first.r : 0, angle: lead(first, text), len: L, text, status: status(key) });
    });
    // bounds: the part and every dimension line (callout text is placed in sheet pixels around them)
    let l = b[0], r = b[2], t = -b[3], bo = -b[1];
    dims.forEach((e) => { if (e.kind === 'linear') { if (e.dir === 'h') { t = Math.min(t, e.at); bo = Math.max(bo, e.at); } else { l = Math.min(l, e.at); r = Math.max(r, e.at); } } });
    const label = m.section ? 'SECTION' + (m.section.name ? ' ' + m.section.name : '') : 'PLAN';
    return { points: Float32Array.from(segs), arcs, region, contours, section: m.section, lines, dims, bounds: [l - gap * 0.6, t - gap * 0.6, r + gap * 0.6, bo + gap * 0.6], offset: [0, 0], anchor: V([b[2], b[3]]), label };
  }
  G.viewSet = (spec, S) => {
    const entries = [], parts = {};
    for (const part of (spec.parts || []).filter((q) => q.kind === 'drawing')) {
      const m = G.build(part.p); if (m.errors.length) throw new Error('part ' + part.id + ': geometry: ' + m.errors[0]);
      const ev = S && S.sizeEvidence ? S.sizeEvidence(part) : { compared: [], label: 'SIZE NOT COMPARED' }, prm = part.params || {};
      // the evidence a drawn dimension carries: the class of the figure the gate compared it with (G.STATUS), or declared / estimated when it has none
      const status = (key) => { const q = key && prm[key]; if (key && ev.compared.includes(key)) return EVIDENCE[q.conf] || 'compared'; return q && q.conf === 'estimated' ? 'estimated' : 'declared'; };
      const view = drawing(m, status);
      entries.push({ id: part.id, conf: part.conf, anchor: view.anchor, views: { front: view } });
      const count = (st) => view.dims.filter((e) => e.status === st).length;
      // compared = checked against a figure a source prints (published) or computes from printed ones (derived); measured and user-declared numbers are
      // counted apart: a reading off a picture and a number the person who asked gave are not a publication
      parts[part.id] = { sizeLabel: ev.label, param: null, facts: m.facts, thickness: m.thickness, material: part.mat || null, label: view.label,
        dimCount: { compared: count('compared') + count('derived'), published: count('compared'), derived: count('derived'), measured: count('measured'), user: count('user'), declared: count('declared'), estimated: count('estimated') } };
    }
    return { layout: 'piece', entries, parts };
  };
})(typeof window !== 'undefined' ? window : globalThis);
