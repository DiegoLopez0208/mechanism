/*
 * kit/iso.js - isometric engine for figures that move.
 * True isometric projection (30 degrees), four-tone shading, fine outlines, soft shadows in a single
 * blurred layer, and ready-made pipes/spheres/cylinders. Everything is a pure function of its input: the
 * same state always gives the same frame, so the film is deterministic.
 *
 * World convention: x grows down-right on screen, y down-left, z up.
 * The visible faces of a box are: the top, the max-x face (right) and the max-y face (left).
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {});
  const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
  const cam = (MX.cam = { S: 46, ox: 540, oy: 600 });

  MX.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  MX.lerp = (a, b, t) => a + (b - a) * t;
  MX.P = (x, y, z) => [cam.ox + (x - y) * C30 * cam.S, cam.oy + (x + y) * S30 * cam.S - (z || 0) * cam.S];
  MX.len = (u) => u * cam.S;                        // world units to pixels (for line widths, etc.)
  const ELL = { rx: C30 * Math.SQRT2, ry: S30 * Math.SQRT2 };   // un circulo horizontal de radio r: elipse (1.2247 r, 0.7071 r)

  /* ------------------------------------------------------------ color */
  function parse(c) {
    if (Array.isArray(c)) return c;
    if (c[0] === '#') { const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
    const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  const css = (r) => 'rgb(' + r.map((v) => Math.round(MX.clamp(v, 0, 255))).join(',') + ')';
  MX.rgb = parse;
  MX.mix = (a, b, t) => { const A = parse(a), B = parse(b); return css([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); };
  MX.shade = (c, k) => { const A = parse(c); return css([A[0] * k, A[1] * k, A[2] * k]); };
  MX.rgba = (c, a) => { const A = parse(c); return 'rgba(' + Math.round(A[0]) + ',' + Math.round(A[1]) + ',' + Math.round(A[2]) + ',' + a + ')'; };
  // cuatro tonos: arriba (luz), izquierda (media), derecha (sombra) y contorno
  MX.tones = (base) => { const A = parse(base); const m = (k) => css([A[0] * k, A[1] * k, A[2] * k]); return { top: m(1.07), left: m(0.93), right: m(0.8), edge: m(0.46) }; };

  MX.INK = '#2a2925';
  MX.A = 1;                                       // global alpha: used by assemblies and fades
  MX.ctx = null;

  /* ------------------------------------------------------------ primitivas */
  function path(pts) { const c = MX.ctx; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
  MX.poly = (pts, fill, o = {}) => {
    const c = MX.ctx; path(pts);
    if (fill) { c.fillStyle = fill; c.globalAlpha = MX.A * (o.alpha == null ? 1 : o.alpha); c.fill(); }
    if (o.stroke !== false) { c.globalAlpha = (MX.A * (o.alpha == null ? 1 : o.alpha)) * (o.strokeAlpha == null ? 0.55 : o.strokeAlpha); c.strokeStyle = o.edge || MX.INK; c.lineWidth = o.lw || 1.3; c.lineJoin = 'round'; c.stroke(); }
    c.globalAlpha = 1;
  };
  // linear gradient between two screen points
  function lg(a, b, c0, c1) { const g2 = MX.ctx.createLinearGradient(a[0], a[1], b[0], b[1]); g2.addColorStop(0, c0); g2.addColorStop(1, c1); return g2; }

  // box: x,y,z is the minimum corner; w (x), d (y), h (z)
  MX.box = (x, y, z, w, d, h, base, o = {}) => {
    const T = MX.tones(base), c = MX.ctx, a = MX.A * (o.alpha == null ? 1 : o.alpha);
    const p = (xx, yy, zz) => MX.P(xx, yy, zz);
    const top = [p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)];
    const lf = [p(x, y + d, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x, y + d, z + h)];
    const rt = [p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x + w, y, z + h)];
    MX.poly(lf, lg(lf[3], lf[0], MX.shade(base, 0.97), T.left), { alpha: a, edge: o.edge });
    MX.poly(rt, lg(rt[3], rt[0], MX.shade(base, 0.84), T.right), { alpha: a, edge: o.edge });
    MX.poly(top, o.topFill || lg(top[0], top[2], MX.shade(base, 1.1), T.top), { alpha: a, edge: o.edge });
    if (o.hi !== false && a > 0.5) { c.globalAlpha = 0.5 * a; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1; c.beginPath(); c.moveTo(top[0][0], top[0][1]); c.lineTo(top[1][0], top[1][1]); c.moveTo(top[0][0], top[0][1]); c.lineTo(top[3][0], top[3][1]); c.stroke(); c.globalAlpha = 1; }
    return { top, lf, rt };
  };

  // vertical cylinder centred on (cx,cy), base at z, radius r, height h
  MX.cyl = (cx, cy, z, r, h, base, o = {}) => {
    const c = MX.ctx, T = MX.tones(base), a = MX.A * (o.alpha == null ? 1 : o.alpha), S = cam.S;
    const bot = MX.P(cx, cy, z), top = MX.P(cx, cy, z + h), rx = ELL.rx * r * S, ry = ELL.ry * r * S;
    c.globalAlpha = a;
    const body = c.createLinearGradient(bot[0] - rx, 0, bot[0] + rx, 0);
    body.addColorStop(0, MX.shade(base, 1.0)); body.addColorStop(0.35, MX.shade(base, 1.06)); body.addColorStop(0.7, MX.shade(base, 0.86)); body.addColorStop(1, MX.shade(base, 0.7));
    c.beginPath(); c.moveTo(top[0] - rx, top[1]); c.lineTo(bot[0] - rx, bot[1]); c.ellipse(bot[0], bot[1], rx, ry, 0, Math.PI, 0, true); c.lineTo(top[0] + rx, top[1]); c.ellipse(top[0], top[1], rx, ry, 0, 0, Math.PI, false); c.closePath();
    if (o.glass) { c.fillStyle = MX.rgba(base, 0.22); } else c.fillStyle = body;
    c.fill(); c.globalAlpha = a * 0.55; c.strokeStyle = MX.INK; c.lineWidth = 1.3; c.stroke();
    if (o.top !== false) { c.globalAlpha = a; c.beginPath(); c.ellipse(top[0], top[1], rx, ry, 0, 0, 6.2832); c.fillStyle = o.topFill || (o.glass ? MX.rgba('#ffffff', 0.35) : T.top); c.fill(); c.globalAlpha = a * 0.55; c.stroke(); }
    c.globalAlpha = 1;
    return { top, bot, rx, ry };
  };
  // elipse horizontal (disco plano)
  MX.disc = (cx, cy, z, r, fill, o = {}) => {
    const c = MX.ctx, p = MX.P(cx, cy, z);
    c.globalAlpha = MX.A * (o.alpha == null ? 1 : o.alpha); c.beginPath(); c.ellipse(p[0], p[1], ELL.rx * r * cam.S, ELL.ry * r * cam.S, 0, 0, 6.2832); c.fillStyle = fill; c.fill();
    if (o.stroke !== false) { c.globalAlpha = (MX.A * (o.alpha == null ? 1 : o.alpha)) * 0.55; c.strokeStyle = o.edge || MX.INK; c.lineWidth = o.lw || 1.2; c.stroke(); }
    c.globalAlpha = 1;
  };
  // pipe along a 3D polyline: three passes (outline, body, highlight)
  MX.tube = (pts, r, base, o = {}) => {
    const c = MX.ctx, w = MX.len(r) * 2, a = MX.A * (o.alpha == null ? 1 : o.alpha), P = pts.map((q) => MX.P(q[0], q[1], q[2]));
    const stroke = (lw, col, off) => { c.beginPath(); c.moveTo(P[0][0] + off[0], P[0][1] + off[1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0] + off[0], P[i][1] + off[1]); c.lineWidth = lw; c.strokeStyle = col; c.stroke(); };
    c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = a;
    stroke(w + 2.6, MX.rgba(MX.INK, 0.55), [0, 0]);
    stroke(w, MX.shade(base, 0.82), [0, 0]);
    stroke(w * 0.74, MX.shade(base, 1.0), [-w * 0.06, -w * 0.08]);
    stroke(w * 0.26, MX.shade(base, 1.22), [-w * 0.16, -w * 0.2]);
    c.globalAlpha = 1;
  };
  MX.sphere = (x, y, z, r, base, o = {}) => {
    const c = MX.ctx, p = MX.P(x, y, z), R = MX.len(r), a = MX.A * (o.alpha == null ? 1 : o.alpha);
    c.globalAlpha = a;
    if (o.glow) { const gl = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], R * o.glow); gl.addColorStop(0, MX.rgba(base, 0.55)); gl.addColorStop(1, MX.rgba(base, 0)); c.fillStyle = gl; c.fillRect(p[0] - R * o.glow, p[1] - R * o.glow, R * o.glow * 2, R * o.glow * 2); }
    const gr = c.createRadialGradient(p[0] - R * 0.35, p[1] - R * 0.4, R * 0.1, p[0], p[1], R); gr.addColorStop(0, MX.shade(base, 1.35)); gr.addColorStop(0.55, MX.shade(base, 1.0)); gr.addColorStop(1, MX.shade(base, 0.7));
    c.beginPath(); c.arc(p[0], p[1], R, 0, 6.2832); c.fillStyle = gr; c.fill(); c.strokeStyle = MX.rgba(MX.INK, 0.5); c.lineWidth = 1.1; c.stroke(); c.globalAlpha = 1;
  };
  MX.line3 = (a, b, col, w, o = {}) => { const c = MX.ctx, A = MX.P(a[0], a[1], a[2]), B = MX.P(b[0], b[1], b[2]); c.globalAlpha = MX.A * (o.alpha == null ? 1 : o.alpha); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; if (o.dash) c.setLineDash(o.dash); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; };
  // flat polygon on the floor / z plane (for marks, belts, screens)
  MX.flat = (pts3, fill, o = {}) => MX.poly(pts3.map((q) => MX.P(q[0], q[1], q[2])), fill, o);
  // parallelogram on a vertical face: u,v in [0,1] on the face x=const (rt) or y=const (lf)
  MX.faceQuad = (face, box, u0, v0, u1, v1, fill, o = {}) => {
    const [x, y, z, w, d, h] = box;
    const pt = face === 'rt' ? (u, v) => MX.P(x + w, y + u * d, z + v * h) : (u, v) => MX.P(x + u * w, y + d, z + v * h);
    MX.poly([pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)], fill, o);
  };

  /* ------------------------------------------------------------ soft shadows (a single blurred layer) */
  const shadows = [];
  MX.shadow = (x, y, w, d, hgt, strength) => { shadows.push({ x, y, w, d, hgt: hgt || 0, s: strength == null ? 1 : strength }); };
  MX.flushShadows = (canvasW, canvasH) => {
    if (!shadows.length) return;
    if (!MX._sc) { MX._sc = document.createElement('canvas'); }
    const sc = MX._sc; if (sc.width !== canvasW) { sc.width = canvasW; sc.height = canvasH; }
    const g2 = sc.getContext('2d'); g2.clearRect(0, 0, sc.width, sc.height); g2.fillStyle = '#3a372f';
    for (const s of shadows) {
      const off = s.hgt * 0.55;                                    // la luz viene de arriba-izquierda: la sombra cae hacia x+ y y+
      const q = [MX.P(s.x + off * 0.5, s.y + off * 0.9, 0), MX.P(s.x + s.w + off * 0.5, s.y + off * 0.9, 0), MX.P(s.x + s.w + off * 0.5, s.y + s.d + off * 0.9, 0), MX.P(s.x + off * 0.5, s.y + s.d + off * 0.9, 0)];
      g2.globalAlpha = 0.5 * s.s; g2.beginPath(); g2.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) g2.lineTo(q[i][0], q[i][1]); g2.closePath(); g2.fill();
    }
    const c = MX.ctx; c.save(); c.filter = 'blur(7px)'; c.globalAlpha = 0.34; c.drawImage(sc, 0, 0); c.restore();
    shadows.length = 0;
  };

  // text laid on the z plane (stencilled on the plate): the text's x axis runs along the world's x axis
  MX.planeText = (s, x, y, z, size, o = {}) => {
    const c = MX.ctx, p = MX.P(x, y, z), a = MX.A * (o.alpha == null ? 1 : o.alpha);
    c.save(); c.translate(p[0], p[1]); c.transform(C30, 0.5, -C30, 0.5, 0, 0);
    c.globalAlpha = a; c.fillStyle = o.color || 'rgba(42,41,37,0.34)'; c.font = (o.w || 600) + ' ' + (size * cam.S) + 'px ' + (o.font || MX.MONO); c.textAlign = o.align || 'left';
    if (o.spacing && 'letterSpacing' in c) c.letterSpacing = o.spacing + 'px';
    c.fillText(s, 0, 0); c.restore();
  };

  /* ------------------------------------------------------------ texto en pantalla */
  MX.MONO = '"Inter","Segoe UI Variable Text","Segoe UI","Helvetica Neue",Arial,sans-serif';          // labels and numbers (Inter embedded by kit/boot.js)
  MX.SERIF = '"Cormorant Garamond","Iowan Old Style","Palatino Linotype",Georgia,serif';          // titulos
  MX.SANS = MX.MONO;
  MX.text = (s, x, y, o = {}) => {
    const c = MX.ctx; c.save();
    c.font = (o.w || 400) + ' ' + (o.size || 22) + 'px ' + (o.font || MX.MONO); c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
    c.globalAlpha = MX.A * (o.alpha == null ? 1 : o.alpha); c.fillStyle = o.color || MX.INK;
    if (o.spacing && 'letterSpacing' in c) c.letterSpacing = o.spacing + 'px';
    c.fillText(s, x, y); c.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
