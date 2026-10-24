/* Paper: Canvas2D technical drawing engine. Three's geometry/math is only a
 * model-data adapter: there is no WebGL renderer, shaded image or Studio frame. */
(function (g) {
  'use strict';
  const MX=g.MX=g.MX||{}, E=MX.paperEngine={}, P=MX.presentation;
  const {text,line,box,smooth}=P.util;
  E.project=(p,view)=>view==='top'?[p[0],p[2]]:view==='side'?[p[2],-p[1]]:[p[0],-p[1]];
  E.fit=(points,rect)=>{
    let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
    points.forEach(p=>{left=Math.min(left,p[0]);right=Math.max(right,p[0]);top=Math.min(top,p[1]);bottom=Math.max(bottom,p[1]);});
    if(!points.length)return p=>[rect.x+rect.w/2,rect.y+rect.h/2];
    const k=Math.min(rect.w/Math.max(.001,right-left),rect.h/Math.max(.001,bottom-top));
    return p=>[rect.x+rect.w/2+(p[0]-(left+right)/2)*k,rect.y+rect.h/2+(p[1]-(top+bottom)/2)*k];
  };
  // The mesh adapter (stage, edges, silhouettes, projection to a view set) lives in kit/paper-mesh.js; this alias keeps the
  // old entry point for callers that still ask the engine for the stage.
  E.stage=o=>MX.paperMesh.stage(o);
  function drawing(c,entries,view,rect,T,active,fraction=1,all=false,explode=0){
    let l=Infinity,r=-Infinity,t=Infinity,b=-Infinity;
    for(const entry of entries){const v=entry.views[view],dx=v.offset[0]*explode,dy=v.offset[1]*explode;
      l=Math.min(l,v.bounds[0]+dx);r=Math.max(r,v.bounds[2]+dx);t=Math.min(t,v.bounds[1]+dy);b=Math.max(b,v.bounds[3]+dy);}
    const k=Math.min(rect.w/Math.max(.001,r-l),rect.h/Math.max(.001,b-t)),cx=(l+r)/2,cy=(t+b)/2;
    const fit=p=>[rect.x+rect.w/2+(p[0]-cx)*k,rect.y+rect.h/2+(p[1]-cy)*k];
    for(const entry of entries){
      const v=entry.views[view],points=v.points,selected=entry.id===active,estimated=entry.conf==='estimated';
      c.save();c.translate(rect.x+rect.w/2,rect.y+rect.h/2);c.scale(k,k);c.translate(-cx+v.offset[0]*explode,-cy+v.offset[1]*explode);
      c.beginPath();c.setLineDash(estimated?[7/k,5/k]:[]);
      const limit=Math.floor(points.length/4*fraction)*4;
      for(let i=0;i<limit;i+=4){c.moveTo(points[i],points[i+1]);c.lineTo(points[i+2],points[i+3]);}
      c.strokeStyle=estimated?T.ember:selected?T.teal:T.ink;c.globalAlpha=(all||selected)?.95:.46;c.lineWidth=(selected?2.2:1.15)/k;c.stroke();c.restore();
    }
    return fit;
  }
  /* ---- the section scene: how a pin tumbler lock works, drawn as a technical section from the published keying table.
   * Every number comes from spec.paperScene (the table the gate checks); this code only draws and animates it. */
  const sg = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
  const label = (c, s, x, y, size, color, weight = 600, align = 'center') => { c.font = weight + ' ' + size + 'px ' + MX.SANS; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = color; c.fillText(s, x, y); };
  const pill = (c, s, x, y, size, fill, color) => { c.font = '700 ' + size + 'px ' + MX.SANS; const w = c.measureText(s).width + size * 1.3; box(c, x - w / 2, y - size * 1.05, w, size * 1.6, fill, null, size * .8); label(c, s, x, y, size, color, 700); };
  const inch = v => v.toFixed(3).replace(/^0/, '');
  const sceneSteps = (scene) => {
    const total = i => scene.depth[scene.code[i] - 1] + scene.pin[scene.code[i] - 1], base = total(0), wrongSum = scene.depth[scene.wrong[2] - 1] + scene.pin[scene.code[2] - 1];
    return [
      { index: 0, title: 'The lock, cut open', formula: 'A side section: the housing above, the plug below, and between them the shear line (' + inch(scene.plug) + ' in). Five spring-loaded pin stacks cross it.', value: scene.code.length + ' pin stacks', conf: 'derived' },
      { index: 1, title: 'Without the key', formula: 'The springs push every driver pin down into the plug. The stacks cross the shear line, so the plug cannot turn.', value: 'LOCKED', conf: 'derived' },
      { index: 2, title: 'The right key goes in', formula: 'Each cut lets a stack rise by a different amount. Key pin plus cut depth is ' + inch(base) + ' in for all five.', value: inch(base) + ' in', conf: 'derived' },
      { index: 3, title: 'Every split on the shear line', formula: 'The gap between key pin and driver pin lands on the line within ' + inch(Math.abs(base - scene.plug)) + ' in. Nothing crosses it: the plug turns.', value: 'FREE', conf: 'derived' },
      { index: 4, title: 'A wrong key', formula: 'One cut is three steps off (cut ' + scene.wrong[2] + ' instead of cut ' + scene.code[2] + '). That split sits ' + inch(Math.abs(wrongSum - scene.plug)) + ' in from the line and the plug stays locked.', value: 'LOCKED', conf: 'derived' },
    ];
  };
  const hatch = (c, x, y, w, h, dir, gap, color) => {      // diagonal section lines inside a rectangle
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = color; c.lineWidth = 1.3; c.beginPath();
    for (let o = -h; o < w + h; o += gap) { c.moveTo(x + o, dir > 0 ? y + h : y); c.lineTo(x + o + h * dir, dir > 0 ? y : y + h); } c.stroke(); c.restore();
  };
  // material colour coding of a section drawing (flat fills, as on a coloured drafting sheet): no light, no shading, no shadows
  const BRASS = '#e3bd62', STEEL = '#b9c3ce';
  function section(c, a, k) {
    const { scene, T, W, H, FS } = k, IN = scene.inch, cx = i => (scene.first + i * scene.pitch) * IN, S = scene.plug * IN, N = scene.code.length, tall = H >= 1600;
    const idx = a.intro ? -1 : a.closing ? 3 : a.index, p = a.closing || a.intro ? 1 : a.progress, ink = T.ink, AMBER = T.dark ? '#f2c14e' : '#b45f06', ON = T.dark ? '#14191f' : '#ffffff';
    const area = k.viewport;
    const kk = area ? Math.min(area.w / 40, area.h / (scene.cap + 9)) : Math.min((W - 140) / 40, H * (tall ? .39 : .4) / 31);
    const left = area ? area.x + (area.w - 40 * kk) / 2 : (W - 40 * kk) / 2;
    const top = area ? area.y : H * .17, X = x => left + (x + 3) * kk, Y = y => top + (scene.cap + 4.5 - y) * kk;
    const OUT = -scene.tip - 4, drawn = a.intro ? sg(a.t, 0, 1.6) : 1;
    let dx = OUT, code = scene.code;      // which key is in and how far (key shoulder at dx, in mm)
    if (idx === 2) dx = OUT * (1 - P.motion.spring((p - .04) * k.plan.slot, .9, .8));
    else if (idx === 3) dx = 0;
    else if (idx === 4) { if (p < .22) dx = OUT * P.motion.expo(p / .22); else { code = scene.wrong; dx = OUT * (1 - P.motion.spring((p - .22) * k.plan.slot, .9, .8)); } }
    const prof = scene.profile(code), lift = i => { const xk = cx(i) - dx; return xk < 0 || xk >= scene.tip ? 0 : prof(xk); };
    const pinH = i => scene.pin[scene.code[i] - 1] * IN, split = i => lift(i) + pinH(i), drv = scene.driver;
    c.save(); c.beginPath(); c.rect(X(-3) - 6, Y(scene.cap + 4.5) - 4, 40 * kk + 12, (scene.cap + 4.5 + 2.4) * kk); c.clip();
    // housing and plug in section: hatched walls between the chambers, a cap above, a base below
    const wall = (a0, a1, y0, y1, dir, col) => { const x0 = X(a0), w = X(a1) - x0, yy = Y(y1), h = Y(y0) - Y(y1); c.save(); c.globalAlpha = drawn; c.fillStyle = MX.rgba(col, .08); c.fillRect(x0, yy, w, h); hatch(c, x0, yy, w, h, dir, 11, MX.rgba(col, .5)); c.strokeStyle = ink; c.lineWidth = 2.4; c.strokeRect(x0, yy, w, h); c.restore(); };
    for (let q = 0; q <= N; q++) { const a0 = q === 0 ? -3 : cx(q - 1) + scene.chamber / 2, a1 = q === N ? 37 : cx(q) - scene.chamber / 2; wall(a0, a1, S, scene.cap, 1, T.mute); wall(a0, a1, scene.keyway, S, -1, T.teal); }
    wall(-3, 37, scene.cap, scene.cap + 3, 1, T.mute); wall(-3, 37, -1.6, 0, -1, T.teal);
    const keyIn = dx > -.3, aligned = keyIn && Array.from({ length: N }, (_, i) => Math.abs(split(i) - S) < .12).every(Boolean), lineCol = aligned ? T.teal : keyIn ? AMBER : T.teal;
    c.save(); c.globalAlpha = drawn; c.strokeStyle = lineCol; c.lineWidth = aligned ? 4.4 : 2.6; c.setLineDash(aligned ? [] : [14, 8]); c.beginPath(); c.moveTo(X(-3), Y(S)); c.lineTo(X(37), Y(S)); c.stroke(); c.restore();      // the shear line
    // pin stacks: key pin, driver pin and the spring above them
    for (let i = 0; i < N; i++) {
      const s = split(i), x = X(cx(i)), w = scene.pinR * 2 * kk, show = drawn * (a.intro ? sg(a.t, .7 + i * .12, 1.2 + i * .12) : 1);
      c.save(); c.globalAlpha = show;
      const kb = Y(lift(i)), ks = Y(s), dt = Y(s + drv), cap = Y(scene.cap);
      c.beginPath(); c.roundRect(x - w / 2, ks, w, kb - ks, 4); c.fillStyle = BRASS; c.fill(); c.strokeStyle = ink; c.lineWidth = 2.2; c.stroke();
      c.beginPath(); c.roundRect(x - w / 2, dt, w, ks - dt, 4); c.fillStyle = STEEL; c.fill(); c.strokeStyle = ink; c.lineWidth = 2.2; c.stroke();
      c.beginPath(); const coils = 9, sw = w * .45; c.moveTo(x, dt); for (let q = 1; q <= coils; q++) c.lineTo(x + (q % 2 ? sw : -sw), dt + (cap - dt) * q / (coils + 1)); c.lineTo(x, cap); c.strokeStyle = MX.mix(STEEL, ink, .55); c.lineWidth = 2.6; c.lineJoin = 'round'; c.stroke();
      c.restore();
      if (idx >= 1 && show > .9) {      // where the split of each stack is: on the line (check) or a pin crosses it (warning)
        const onLine = Math.abs(s - S) < .12, across = (s < S - .12 && s + drv > S) || (s > S + .12 && lift(i) < S);
        if (onLine || across) { c.beginPath(); c.arc(x, Y(S), 12, 0, Math.PI * 2); c.fillStyle = onLine ? T.teal : AMBER; c.fill();
          if (onLine) { c.beginPath(); c.moveTo(x - 5, Y(S)); c.lineTo(x - 1, Y(S) + 4); c.lineTo(x + 6, Y(S) - 5); c.strokeStyle = ON; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); } else label(c, '!', x, Y(S) + 7, 19, ON, 800); }
      }
    }
    // the key: a real profile polygon with the V cuts, sliding in from the left
    if (dx > OUT + .2) { c.save(); c.beginPath(); c.moveTo(X(dx), Y(0)); c.lineTo(X(scene.tip + dx), Y(0)); for (let xk = scene.tip; xk >= 0; xk -= .1) c.lineTo(X(xk + dx), Y(prof(xk))); c.lineTo(X(dx), Y(prof(0))); c.closePath();
      c.fillStyle = BRASS; c.fill(); c.strokeStyle = ink; c.lineWidth = 2.6; c.lineJoin = 'round'; c.stroke(); c.restore(); }
    c.restore();
    // drafting callouts, one by one in the first stage
    if (area) return Y(-1.6) + 20;
    const reveal = n => idx > 0 ? 1 : idx === 0 ? sg(p, .04 + n * .13, .2 + n * .13) : 0;
    const call = (s, tx, ty, px, py, n, side) => { const u = reveal(n); if (u <= 0) return; c.save(); c.globalAlpha = u; c.strokeStyle = T.teal; c.lineWidth = 1.6; c.beginPath(); c.moveTo(tx, ty - 8); c.lineTo(px, py); c.stroke(); c.beginPath(); c.arc(px, py, 5, 0, Math.PI * 2); c.fillStyle = T.teal; c.fill();
      c.font = '700 ' + 21 * FS + 'px ' + MX.SANS; const w = c.measureText(s).width + 22, x0 = side === 'right' ? tx - w : tx; box(c, x0, ty - 26 * FS, w, 36 * FS, T.paper, T.plateEdge, 6); label(c, s, x0 + 11, ty - 1, 21 * FS, T.ink, 700, 'left'); c.restore(); };
    call('HOUSING', W - 74, Y(scene.cap - 2.5), X(33), Y(scene.cap - 2.5), 0, 'right'); call('PLUG', W - 74, Y(10.6), X(33), Y(10.6), 1, 'right'); call('SHEAR LINE  ' + inch(scene.plug) + ' in', W - 74, Y(S) - 34 * kk / 23, X(35.5), Y(S), 2, 'right');
    call('SPRING', 74, Y(scene.cap + 1.7) + 6, X(cx(0)), Y(scene.cap - 2), 3, 'left'); call('DRIVER PIN', 74, Y(15.2), X(cx(0)), Y(split(0) + drv * .62), 4, 'left'); call('KEY PIN', 74, Y(3.2), X(cx(0)), Y(lift(0) + pinH(0) * .5), 5, 'left');
    if (idx >= 2 || a.closing) { c.save(); c.globalAlpha = idx === 2 ? sg(p, .1, .5) : 1; label(c, 'KEY', X(cx(N - 1) + 9), Y(2.4), 22 * FS, T.mute, 700, 'left'); c.restore(); }
    // the table under the drawing: cut depth + key pin height = the same sum in every column
    const ty = Y(-1.6) + 46 * (tall ? 1 : .8), row = 56 * FS, sumOf = i => scene.depth[code[i] - 1] + scene.pin[scene.code[i] - 1];
    if (idx >= 2) { c.save(); c.globalAlpha = idx > 2 ? 1 : sg(p, .5, .9);
      [['CUT', i => scene.depth[code[i] - 1]], ['PIN', i => scene.pin[scene.code[i] - 1]], ['SUM', sumOf]].forEach(([name, f], r) => { const yy = ty + r * row; label(c, name, 74, yy, 21 * FS, T.mute, 700, 'left');
        for (let i = 0; i < N; i++) { const v = f(i), good = Math.abs(sumOf(i) - scene.plug) < .0035, changed = code[i] !== scene.code[i]; label(c, inch(v), X(cx(i)), yy, 26 * FS, r === 2 ? (good ? T.teal : AMBER) : r === 0 && changed ? AMBER : ink, r === 2 ? 800 : 600); } });
      label(c, 'in  ·  plug ' + inch(scene.plug) + ' in, within ' + inch(.003), W - 74, ty + 2 * row, 20 * FS, T.mute, 600, 'right'); c.restore(); }
    const msg = idx === 1 ? ['PLUG BLOCKED', AMBER, sg(p, .35, .6)] : idx === 3 || a.closing ? ['PLUG FREE TO TURN', T.teal, a.closing ? 1 : sg(p, .2, .45)] : idx === 4 && p > .8 ? ['PLUG BLOCKED', AMBER, sg(p, .8, .92)] : null;
    if (msg) { c.save(); c.globalAlpha = msg[2]; pill(c, msg[0], W / 2, top - 22, 30 * FS, msg[1], ON); c.restore(); }
    return Y(-1.6) + (tall ? 290 : 190);      // where the caption starts: constant, so nothing jumps between stages
  }
  /* ---- a piece drawing from a view set of declared 2D geometry (kit/geom2d.js, layout 'piece'): the same code for any part.
   * Every number on it is a value of the geometry; the colour of a dimension says what the gate knows about it. */
  // the evidence of a dimension (geom2d G.STATUS) in the theme's own colours, with a dash for the classes that are not a printed figure:
  // teal printed by the source, teal dashed derived from printed figures, ink dotted measured by a stated method, ink given by the person who asked or not verified, ember estimated
  const DIMCOL = (T, st) => (st === 'compared' || st === 'derived' ? T.teal : st === 'estimated' ? T.ember : T.ink);
  const DIMDASH = (st) => (st === 'derived' ? [9, 5] : st === 'measured' ? [3, 4] : []);
  const arrow = (c, x, y, ang, s) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x - s * Math.cos(ang - .32), y - s * Math.sin(ang - .32)); c.lineTo(x - s * Math.cos(ang + .32), y - s * Math.sin(ang + .32)); c.closePath(); c.fill(); };
  function pieceDrawing(c, v, rect, T, reveal, FS, options = {}) {
    const [l, t, r, b] = v.bounds, k = Math.min(rect.w / (r - l), rect.h / (b - t)), mx = rect.x + rect.w / 2 - (l + r) / 2 * k, my = rect.y + rect.h / 2 - (t + b) / 2 * k;
    const X = x => mx + x * k, Y = y => my + y * k;
    // the material: a flat tint, hatched when the drawing is a section (holes stay empty: even-odd)
    const mat = new Path2D();
    for (const op of v.region) {
      if (op[0] === 'M') mat.moveTo(X(op[1]), Y(op[2])); else if (op[0] === 'L') mat.lineTo(X(op[1]), Y(op[2]));
      else if (op[0] === 'A') mat.arc(X(op[1]), Y(op[2]), op[3] * k, op[4], op[5]);
      else if (op[0] === 'C') { mat.moveTo(X(op[1]) + op[3] * k, Y(op[2])); mat.arc(X(op[1]), Y(op[2]), op[3] * k, 0, Math.PI * 2); mat.closePath(); }
      else mat.closePath();
    }
    c.save(); c.fillStyle = MX.rgba(T.ink, .05); c.fill(mat, 'evenodd');
    if (v.section) {      // section lines at the declared angle and pitch (a pitch under 6 px is drawn at 6 px: still readable, still parallel)
      c.clip(mat, 'evenodd'); const a = -v.section.angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), gap = Math.max(6, v.section.pitch * k), R = Math.hypot(rect.w, rect.h), cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
      c.beginPath(); for (let o = -R; o <= R; o += gap) { const px = cx - dy * o, py = cy + dx * o; c.moveTo(px - dx * R, py - dy * R); c.lineTo(px + dx * R, py + dy * R); }
      c.strokeStyle = MX.rgba(T.ink, .5); c.lineWidth = 1.2; c.stroke();
    }
    c.restore();
    // visible edges: straight segments and exact arcs
    c.save(); c.beginPath(); const p = v.points;
    for (let i = 0; i < p.length; i += 4) { c.moveTo(X(p[i]), Y(p[i + 1])); c.lineTo(X(p[i + 2]), Y(p[i + 3])); }
    for (const [ax, ay, ar, a0, a1] of v.arcs) { c.moveTo(X(ax) + ar * k * Math.cos(a0), Y(ay) + ar * k * Math.sin(a0)); c.arc(X(ax), Y(ay), ar * k, a0, a1); }
    c.strokeStyle = T.ink; c.lineWidth = 2.6; c.lineJoin = 'round'; c.stroke(); c.restore();
    // centre and hidden lines
    for (const ln of v.lines) {
      c.save(); c.beginPath();
      if (ln.arc) { const [ax, ay, ar, a0, a1] = ln.arc; c.arc(X(ax), Y(ay), ar * k, a0, a1, a1 < a0); }
      else for (let i = 0; i < ln.pts.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, X(ln.pts[i]), Y(ln.pts[i + 1]));
      c.setLineDash(ln.style === 'center' ? [18, 5, 3, 5] : ln.style === 'hidden' ? [8, 5] : []); c.strokeStyle = ln.style === 'visible' ? T.ink : T.mute; c.lineWidth = ln.style === 'visible' ? 2.2 : 1.3; c.stroke(); c.restore();
    }
    // dimensions, in sheet pixels around the lines the geometry placed
    c.save(); c.globalAlpha = reveal; const fs = 19 * FS, occupied = [];
    for (const d of v.dims) {
      const col = DIMCOL(T, d.status); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.3; c.font = '600 ' + fs + 'px ' + MX.SANS; c.setLineDash(DIMDASH(d.status));
      if (d.kind === 'linear') {
        const h = d.dir === 'h', a = [X(d.a[0]), Y(d.a[1])], e = [X(d.b[0]), Y(d.b[1])], at = h ? Y(d.at) : X(d.at), s = h ? Math.sign(at - a[1]) || 1 : Math.sign(at - a[0]) || 1;
        c.beginPath();
        if (h) { for (const q of [a, e]) { c.moveTo(q[0], q[1] + s * 6); c.lineTo(q[0], at + s * 8); } c.moveTo(a[0], at); c.lineTo(e[0], at); }
        else { for (const q of [a, e]) { c.moveTo(q[0] + s * 6, q[1]); c.lineTo(at + s * 8, q[1]); } c.moveTo(at, a[1]); c.lineTo(at, e[1]); }
        c.stroke();
        const len = h ? Math.abs(e[0] - a[0]) : Math.abs(e[1] - a[1]), sz = Math.min(12, len / 3);
        const tw = c.measureText(d.text).width;
        occupied.push(h ? [(a[0] + e[0]) / 2 - tw / 2, at - 7 - fs, tw, fs * 1.2]
          : [at - 7 - fs, (a[1] + e[1]) / 2 - tw / 2, fs * 1.2, tw]);
        if (h) { const dir = Math.sign(e[0] - a[0]) || 1; arrow(c, a[0], at, dir > 0 ? Math.PI : 0, sz); arrow(c, e[0], at, dir > 0 ? 0 : Math.PI, sz); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(d.text, (a[0] + e[0]) / 2, at - 7); }
        else { const dir = Math.sign(e[1] - a[1]) || 1; arrow(c, at, a[1], dir > 0 ? -Math.PI / 2 : Math.PI / 2, sz); arrow(c, at, e[1], dir > 0 ? Math.PI / 2 : -Math.PI / 2, sz); c.save(); c.translate(at - 7, (a[1] + e[1]) / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(d.text, 0, 0); c.restore(); }
      } else {      // a leader from the contour: diameter, corner radius, or a note (pattern, cut-out size)
        const cx = X(d.c[0]), cy = Y(d.c[1]), rr = d.r * k, u = Math.cos(d.angle), w = Math.sin(d.angle), p0 = [cx + rr * u, cy + rr * w], ll = d.len != null ? Math.max(24, d.len * k) : 46, p1 = [p0[0] + ll * u, p0[1] + ll * w], side = u >= 0 ? 1 : -1;      // the leader length the geometry placed the callout with
        if (options.avoidCollisions) {
          const width = c.measureText(d.text).width, tx = side > 0 ? rect.x + rect.w - width : rect.x + width;
          const left = side > 0 ? tx : tx - width;
          const overlaps = box => occupied.some(q => box[0] < q[0] + q[2] + 6 && box[0] + box[2] + 6 > q[0]
            && box[1] < q[1] + q[3] + 6 && box[1] + box[3] + 6 > q[1]);
          let yy = Math.max(rect.y + fs, Math.min(rect.y + rect.h - fs, p1[1]));
          const candidates = [yy];
          for (let i = 1; i < 18; i++) candidates.push(yy - i * fs * 1.6, yy + i * fs * 1.6);
          yy = candidates.find(y => y > rect.y + fs && y < rect.y + rect.h - fs
            && !overlaps([left, y - fs / 2, width, fs])) ?? yy;
          p1[0] = tx - side * 24; p1[1] = yy;
          occupied.push([left, yy - fs / 2, width, fs]);
        }
        c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p1[0] + side * 18, p1[1]); c.stroke();
        if (d.kind !== 'note' || rr > 0) arrow(c, p0[0], p0[1], Math.atan2(-w, -u), 11);
        c.textAlign = side > 0 ? 'left' : 'right'; c.textBaseline = 'middle'; c.fillText(d.text, p1[0] + side * 24, p1[1]);
      }
    }
    c.restore();
    return { X, Y, k };
  }
  function pieceSheet(c, a, { entries, parts, plan, spec, validation, config, T, W, H, compact }) {
    const FS = compact ? 1 : 1.15, M = P.motion;
    text(c, 'PIECE DRAWING • DIMENSIONS IN mm • FITTED TO THE SHEET, NOT TO SCALE', 72, 204, 17, W - 144, T.mute);
    const main = { x: 120, y: 250, w: W - 240, h: H * (compact ? .40 : .42) }, byId = Object.fromEntries(entries.map(e => [e.id, e]));
    if (a.closing) {      // the review: every part side by side, then the gate's verdict
      const n = entries.length, cw = main.w / n;
      entries.forEach((e, i) => { pieceDrawing(c, e.views.front, { x: main.x + i * cw + 10, y: main.y + main.h * .15, w: cw - 20, h: main.h * .7 }, T, 0, FS * .7); text(c, String(i + 1).padStart(2, '0') + ' / ' + e.views.front.label, main.x + i * cw + 10, main.y + main.h + 10, 16, cw - 20, T.mute, 600); });
      const el = a.t - plan.end, y = main.y + main.h + 90, dc = Object.values(parts).reduce((s, q) => ({ compared: s.compared + q.dimCount.compared, measured: s.measured + (q.dimCount.measured || 0), user: s.user + (q.dimCount.user || 0), declared: s.declared + q.dimCount.declared }), { compared: 0, measured: 0, user: 0, declared: 0 });
      M.rise(c, 'DRAWING REVIEW / ' + (validation.verdict?.state || 'NOTHING CHECKED'), 72, y, compact ? 28 : 36, W - 144, T.ink, 700, el);
      M.rise(c, n + ' parts drawn from their declared geometry: every contour closed, every hole inside the material, none overlapping. That is internal consistency, not evidence.', 72, y + 60, 22, W - 144, T.mute, 500, el - .3, .03);
      M.rise(c, dc.compared + ' dimensions compared with a source' + (dc.measured ? ' • ' + dc.measured + ' measured' : '') + (dc.user ? ' • ' + dc.user + ' given by the person who asked' : '') + ' • ' + dc.declared + ' declared, not verified', 72, y + 150, 22, W - 144, dc.compared ? T.teal : T.mute, 600, el - .6, .03);
    } else {
      const item = a.intro ? plan.items[0] : a.item, e = byId[item.id], v = e.views.front, info = parts[item.id], f = info.facts;
      const reveal = a.intro ? smooth((a.t - 1) / 1.8) : smooth(a.progress * 4);
      pieceDrawing(c, v, main, T, reveal, FS);
      text(c, String((a.intro ? 0 : a.index) + 1).padStart(2, '0') + ' / ' + v.label, main.x, main.y + main.h + 36, 16, main.w, T.mute, 600);
      let y = main.y + main.h + 88; const el = a.intro ? 0 : a.progress * plan.slot;
      y += M.rise(c, 'PART ' + String((a.intro ? 0 : a.index) + 1).padStart(2, '0') + ' / ' + plan.items.length + ' • ' + String(item.conf).toUpperCase(), 72, y, 19, W - 144, T.teal, 700, el) + 14;
      y += M.rise(c, item.title, 72, y, compact ? 30 : 38, W - 144, T.ink, 600, el - .08) + 12;
      if (item.formula) y += M.rise(c, item.formula, 72, y, compact ? 21 : 24, W - 144, T.mute, 500, el - .2, .03) + 16;
      const n1 = x => x.toFixed(1), facts = [
        'NET AREA ' + n1(f.netArea) + ' mm²  =  OUTLINE ' + n1(f.outlineArea) + ' − ' + f.holes + ' HOLE' + (f.holes === 1 ? '' : 'S') + ' ' + n1(f.holeArea),
        'OVERALL ' + n1(f.width) + ' × ' + n1(f.height) + ' mm' + (info.thickness != null ? ' • THICKNESS ' + info.thickness + ' mm (STATED: NO SIDE VIEW IS DRAWN FROM IT)' : ' • THICKNESS NOT GIVEN') + (info.material ? ' • ' + String(info.material).toUpperCase() : ''),
        info.dimCount.compared + ' DIMENSIONS COMPARED WITH A SOURCE' + (info.dimCount.derived ? ' (' + info.dimCount.derived + ' DERIVED)' : '') + (info.dimCount.measured ? ' • ' + info.dimCount.measured + ' MEASURED' : '') + (info.dimCount.user ? ' • ' + info.dimCount.user + ' GIVEN BY THE PERSON WHO ASKED' : '') + ' • ' + info.dimCount.declared + ' DECLARED, NOT VERIFIED' + (info.dimCount.estimated ? ' • ' + info.dimCount.estimated + ' ESTIMATED' : '')];
      facts.forEach((s, i) => { y += M.rise(c, s, 72, y, compact ? 18 : 20, W - 144, i === 2 && info.dimCount.compared ? T.teal : T.ink, 600, el - .4 - i * .1, .02) + 8; });
      text(c, 'TEAL: PRINTED BY THE SOURCE' + (info.dimCount.derived ? ' • TEAL DASHED: DERIVED' : '') + (info.dimCount.measured ? ' • INK DOTTED: MEASURED (UNCERTAINTY, NOT A TOLERANCE)' : '') + ' • INK: ' + (info.dimCount.user ? 'GIVEN BY THE PERSON WHO ASKED, OR ' : '') + 'DECLARED IN THE SPEC, NOT VERIFIED • AMBER: ESTIMATED', 72, y + 10, 15, W - 144, T.mute, 600);
    }
    line(c, [45, H - 110], [W - 45, H - 110], T.plateEdge, 1.5); line(c, [W * .58, H - 110], [W * .58, H - 45], T.plateEdge, 1);
    text(c, String(spec.fig || spec.id).toUpperCase() + ' / ' + config.background.toUpperCase(), 72, H - 72, 17, W * .5, T.ink, 600);
    text(c, 'SHEET ' + String(a.index + 1).padStart(2, '0') + ' / ' + String(plan.items.length).padStart(2, '0'), W * .60, H - 72, 17, W * .32, T.mute);
  }
  E.piece = pieceDrawing;
  // Native study viewport: line work is fitted from geometry, never from a
  // raster Studio frame or a cropped drawing sheet. Screen fit is not scale.
  E.study = (c, rect, a, { spec, plan, views, scene, T }) => {
    const diagnostics = { renderer: 'canvas2d-vector', rasterSource: false, viewport: rect, fontSize: 22 };
    c.save(); c.translate(rect.x, rect.y); c.fillStyle = T.paper; c.fillRect(0, 0, rect.w, rect.h);
    const pad = 52;
    text(c, scene ? 'MECHANISM SECTION' : views.layout === 'piece' ? 'DECLARED GEOMETRY' : 'ORTHOGRAPHIC CONSTRUCTION',
      pad, 35, 20, rect.w - pad * 2, T.teal, 700);
    if (scene) {
      section(c, a, { scene, plan, T, W: rect.w, H: rect.h, FS: 1,
        viewport: { x: pad, y: 80, w: rect.w - pad * 2, h: rect.h - 160 } });
      text(c, 'HOUSING / PLUG / KEY PINS / DRIVERS / SPRINGS', pad, rect.h - 50, 20, rect.w - pad * 2, T.ink);
    } else if (views.layout === 'piece') {
      const item = views.entries.find(entry => entry.id === a.item.id) || views.entries[0];
      E.piece(c, item.views.front, { x: pad + 15, y: 73, w: rect.w - pad * 2 - 30, h: rect.h - 165 }, T, 1, 1.1, { avoidCollisions: true });
    } else {
      const main = { x: pad, y: 66, w: rect.w - pad * 2, h: rect.h * .50 };
      drawing(c, views.entries, 'front', main, T, a.item.id, 1, false, 0);
      const small = { x: pad, y: rect.h * .68, w: (rect.w - pad * 3) / 2, h: rect.h * .17 };
      drawing(c, views.entries, 'top', small, T, a.item.id, 1, true, 0);
      drawing(c, views.entries, 'side', { ...small, x: rect.w / 2 + pad / 2 }, T, a.item.id, 1, true, 0);
      text(c, 'FRONT', pad, rect.h * .63, 20, rect.w - pad * 2, T.mute);
      text(c, 'TOP', pad, rect.h * .90, 20, small.w, T.mute);
      text(c, 'SIDE', rect.w / 2 + pad / 2, rect.h * .90, 20, small.w, T.mute);
    }
    text(c, 'SCREEN-FITTED VIEW / NOT A MANUFACTURING DRAWING', pad, rect.h - 17, 18, rect.w - pad * 2, T.mute);
    c.restore(); return diagnostics;
  };
  // the vector scenes Paper draws with no 3D model, by spec.paperScene.kind (kit/manifest.js paperScenes names the same kinds; tested)
  E.scenes={'pin-section':{steps:sceneSteps,draw:section}};
  // views: the mesh adapter's view set, or null for a spec whose vector scene needs no meshes; F: the old entry point (the figure)
  E.run=({spec,validation,config,views,shapeCheck,F,W,H,length})=>{
    if(!views&&F){views=MX.paperMesh.viewSet(F);shapeCheck=MX.paperMesh.shapeCheck(F);}
    const kind=spec.paperScene&&spec.paperScene.kind,impl=kind!=null&&Object.hasOwn(E.scenes,kind)?E.scenes[kind]:null,scene=impl?spec.paperScene:null;
    if(!views&&!scene)throw new Error('Paper: no view set and no vector scene it can draw (paperScene.kind: '+JSON.stringify(kind)+')');
    const plan=P.plan(spec,'paper',length),T=MX.THEME,entries=views?views.entries:[],details=views?views.parts:{},piece=!!(views&&views.layout==='piece');      // piece: a view set of declared 2D geometry (kit/geom2d.js)
    if(scene){plan.items=impl.steps(scene);plan.slot=(plan.end-plan.begin)/plan.items.length;}
    g.__drawStudy = (c, rect, t) => E.study(c, rect, P.at(plan, t), { spec, plan, views, scene, T });
    const viewCache=new Map();
    const cols=['A','B','C','D','E','F'];
    return P.mount({plan,spec,validation,config,W,H,engine:'paper-vector2d',shapeCheck,notRun:views&&!piece?null:'vector_scene_without_mesh_projection',diagnostics:()=>({renderer:'canvas2d-vector',studioFrames:0,projection:'orthographic'}),
      draw(c,a){
        const compact=H<1600,active=details[a.item.id];
        const explode=smooth((a.t-2)/3)*(1-smooth((a.t-plan.end)/1.3));
        c.save();c.fillStyle=T.paper;c.fillRect(0,0,W,H);
        // Drawing-sheet registration, zone letters and restrained drafting grid.
        c.strokeStyle=T.plateEdge;c.lineWidth=1.5;c.strokeRect(35,35,W-70,H-70);
        c.strokeStyle=T.line;c.lineWidth=1;c.strokeRect(45,45,W-90,H-90);
        for(let i=0;i<6;i++){
          const x=45+(W-90)*(i+.5)/6;text(c,String(i+1),x-5,30,14,30,T.mute);
          const y=100+(H-210)*(i+.5)/6;text(c,cols[i],12,y,14,22,T.mute);
        }
        text(c,'PAPER / TECHNICAL DRAWING',72,91,19,W-144,T.teal,700);
        text(c,spec.title,72,148,compact?36:44,W-144,T.ink,500);
        if(piece){pieceSheet(c,a,{entries,parts:details,plan,spec,validation,config,T,W,H,compact});c.restore();return;}
        if(!scene)text(c,'ORTHOGRAPHIC STUDY • NOT TO SCALE',72,204,17,W-144,T.mute);
        if(scene){
          text(c,'SECTION VIEW • DIMENSIONS FROM THE PUBLISHED KEYING TABLE',72,204,17,W-144,T.mute);
          const el=a.intro?a.t:a.closing?a.t-plan.end:a.progress*plan.slot,idx=a.intro?-1:a.closing?4:a.index,M=P.motion;
          const key=i=>i===0?[1.03,W*.5,H*.2]:i===1?[1.04,W*.5,H*.28]:i===2?[1.07,W*.35,H*.3]:i===3?[1.09,W*.5,H*.26]:[1,W/2,H*.25];
          const k0=key(idx-1),k1=key(idx),u=a.intro?1:Math.min(1.08,M.spring(el,1.1,.85)),z=M.zoom(k0[0],k1[0],u),fx=k0[1]+(k1[1]-k0[1])*u,fy=k0[2]+(k1[2]-k0[2])*u;
          c.save();c.translate(fx,fy);c.scale(z,z);c.translate(-fx,-fy);
          const capY=impl.draw(c,a,{scene,T,W,H,plan,FS:compact?1:1.15});c.restore();
          if(!a.closing){
            let y=capY;
            y+=M.rise(c,'STEP '+String(a.index+1).padStart(2,'0')+' / '+plan.items.length,72,y,19,W-144,T.teal,700,el)+16;
            y+=M.rise(c,a.item.title,72,y,compact?32:40,W-144,T.ink,600,el-.08)+14;
            M.rise(c,a.item.formula,72,y,compact?22:26,W-144,T.mute,500,el-.3,.03);
          }else{
            M.rise(c,'DRAWING REVIEW / '+(validation.verdict?.state||'NOTHING CHECKED'),72,capY+20,compact?28:36,W-144,T.ink,700,el);
            M.rise(c,(validation.verdict?.estimated||0)+' estimated claims • the pin diameter and driver length are estimates',72,capY+75,22,W-144,T.mute,500,el-.3,.03);
          }
          line(c,[45,H-110],[W-45,H-110],T.plateEdge,1.5);line(c,[W*.58,H-110],[W*.58,H-45],T.plateEdge,1);
          text(c,String(spec.fig||spec.id).toUpperCase()+' / '+config.background.toUpperCase(),72,H-72,17,W*.5,T.ink,600);
          text(c,'SHEET '+String(a.index+1).padStart(2,'0')+' / '+String(plan.items.length).padStart(2,'0'),W*.60,H-72,17,W*.32,T.mute);
          c.restore();return;
        }
        const main={x:100,y:255,w:W-200,h:H*(compact?.25:.30)};
        for(let x=100;x<=W-100;x+=50)line(c,[x,main.y],[x,main.y+main.h],MX.rgba(T.ink,.035),1);
        for(let y=main.y;y<=main.y+main.h;y+=50)line(c,[100,y],[W-100,y],MX.rgba(T.ink,.035),1);
        const detailY=H*(compact?.62:.65), insetY=main.y+main.h+70, insetH=Math.max(55,detailY-insetY-55);
        const drawViews=ctx=>{
          const fit=drawing(ctx,entries,'front',main,T,a.item.id,a.intro?smooth(a.t/2.4):1,a.intro||a.closing,explode);
          text(ctx,'01 / FRONT • '+(a.closing?'ASSEMBLED':'EXPLODED CONSTRUCTION'),100,main.y+main.h+28,16,W-200,T.mute);
          const left={x:110,y:insetY,w:(W-280)/2,h:insetH},right={...left,x:W/2+50};
          drawing(ctx,entries,'top',left,T,a.item.id,1,true,explode);drawing(ctx,entries,'side',right,T,a.item.id,1,true,explode);
          text(ctx,'02 / TOP',left.x,insetY+insetH+26,16,left.w,T.mute);text(ctx,'03 / SIDE',right.x,insetY+insetH+26,16,right.w,T.mute);
          return fit;
        };
        let fit;
        if(!a.intro&&(explode===0||explode===1)){
          const key=a.item.id+'/'+a.closing+'/'+explode;
          if(!viewCache.has(key)){
            const SS=MX.SS||1,image=document.createElement('canvas');image.width=W*SS;image.height=H*SS;
            const ctx=image.getContext('2d',{willReadFrequently:true});ctx.scale(SS,SS);viewCache.set(key,{image,fit:drawViews(ctx)});
          }
          const cached=viewCache.get(key);c.drawImage(cached.image,0,0,W,H);fit=cached.fit;
        }else fit=drawViews(c);
        line(c,[72,detailY-20],[W-72,detailY-20],T.plateEdge,1);
        if(!a.closing){
          let y=detailY+16;
          y+=text(c,'PART '+String(a.index+1).padStart(2,'0')+' / '+plan.items.length+' • '+String(a.item.conf).toUpperCase(),72,y,19,W-144,T.teal,700)+16;
          y+=text(c,a.item.title,72,y,compact?30:38,W-144,T.ink,600)+15;
          y+=text(c,a.item.formula,72,y,compact?21:26,W-144,T.mute)+18;
          y+=text(c,active.sizeLabel||'SIZE NOT COMPARED',72,y,18,W-144,T.teal,600)+18;
          const room=H-160-y;
          if(room>45){
            const chosen=entries.filter(e=>e.id===a.item.id);
            drawing(c,chosen,'front',{x:W*.5,y:y+10,w:W*.38,h:Math.max(20,room-35)},T,a.item.id,smooth(a.progress*3),true);
            const param=active.param;
            if(param)text(c,param.name.toUpperCase()+' = '+param.value+' '+param.unit,72,y+35,25,W*.38,T.ink,600);
            text(c,'DETAIL '+String(a.index+1).padStart(2,'0'),72,y+75,18,W*.38,T.mute);
          }
          const selected=entries.find(e=>e.id===a.item.id);
          if(selected?.anchor){
            const origin=selected.anchor,offset=selected.views.front.offset;
            const p=fit([origin[0]+offset[0]*explode,origin[1]+offset[1]*explode]),to=[W-115,main.y+main.h-10];
            line(c,p,to,T.teal,1.2);c.beginPath();c.arc(to[0],to[1],19,0,Math.PI*2);c.fillStyle=T.paper;c.fill();c.strokeStyle=T.teal;c.stroke();
            text(c,String(a.index+1).padStart(2,'0'),to[0]-12,to[1]+6,17,40,T.teal,700);
          }
        }else{
          text(c,'DRAWING REVIEW / '+(validation.verdict?.state||'NOTHING CHECKED'),72,detailY+35,compact?28:36,W-144,T.ink,700);
          text(c,(validation.verdict?.estimated||0)+' estimated claims • dashed amber lines',72,detailY+90,24,W-144,T.mute);
          text(c,'Confidence does not verify every drawn dimension.',72,detailY+135,24,W-144,T.mute);
        }
        // A drafting title block, not a Studio HUD or a process dashboard.
        line(c,[45,H-110],[W-45,H-110],T.plateEdge,1.5);line(c,[W*.58,H-110],[W*.58,H-45],T.plateEdge,1);
        text(c,String(spec.fig||spec.id).toUpperCase()+' / '+config.background.toUpperCase(),72,H-72,17,W*.5,T.ink,600);
        text(c,'SHEET '+String(a.index+1).padStart(2,'0')+' / '+String(plan.items.length).padStart(2,'0'),W*.60,H-72,17,W*.32,T.mute);
        c.restore();
      },
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
