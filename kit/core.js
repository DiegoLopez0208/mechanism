/*
 * kit/core.js - movimiento, tarjeta de figura, etiquetas y arnes de render.
 * Movimiento: curvas de easing y un resorte amortiguado analitico (sin integrar: valido para cualquier t).
 * Tarjeta: marco de papel con "Fig N", titulo, pista y lectura en vivo, como una lamina tecnica.
 * Arnes: window.__frame(t) devuelve un PNG con motion blur por subframes; window.__audioWav() el audio; click = reproducir.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {});
  const clamp = MX.clamp, lerp = MX.lerp;

  /* ------------------------------------------------------------ movimiento */
  MX.ramp = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  MX.E = {
    out3: (t) => 1 - Math.pow(1 - t, 3),
    out5: (t) => 1 - Math.pow(1 - t, 5),
    in3: (t) => t * t * t,
    io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    io2: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    sm: (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); },
  };
  // curvas de movimiento: bezier cubica estilo CSS, sobreimpulso (back), elastico, exponenciales
  MX.E.bezier = (x1, y1, x2, y2) => { const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by; return (t) => { t = clamp(t, 0, 1); let u = t; for (let i = 0; i < 6; i++) { const x = ((ax * u + bx) * u + cx) * u - t, d = (3 * ax * u + 2 * bx) * u + cx; if (Math.abs(x) < 1e-5 || Math.abs(d) < 1e-6) break; u -= x / d; } return ((ay * u + by) * u + cy) * u; }; };
  MX.E.outBack = (t, s = 1.70158) => { t = clamp(t, 0, 1) - 1; return 1 + t * t * ((s + 1) * t + s); };
  MX.E.inBack = (t, s = 1.70158) => { t = clamp(t, 0, 1); return t * t * ((s + 1) * t - s); };
  MX.E.outElastic = (t) => { t = clamp(t, 0, 1); return t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; };
  MX.E.outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t, 0, 1)));
  MX.E.ioExpo = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2);
  MX.E.smooth = MX.E.bezier(0.45, 0, 0.2, 1);                         // arranque suave, frenado largo
  MX.E.snap = MX.E.bezier(0.7, 0, 0.15, 1);                           // corte de camara: arranque brusco, frenado seco
  // resorte subamortiguado: 0 -> 1 con rebote. f = frecuencia (Hz), z = amortiguamiento (0.2 rebota mucho, 0.7 casi nada)
  MX.spring = (t, f = 2.2, z = 0.45) => {
    if (t <= 0) return 0;
    const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  };
  MX.hash = (a, b = 0, c = 0) => {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
  };
  MX.rng = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  MX.fmt = (n) => Math.round(n).toLocaleString('en-US');

  /* ------------------------------------------------------------ paleta de la lamina */
  // Cuatro estilos: la paleta, la tipografia de los titulos, el diseno de la tarjeta y los parametros del escenario 3D (fondo, rejilla, sombra, resplandor, luz de contorno).
  //   paper    papel claro con tarjeta de esquinas (el original)        night    el mismo en oscuro
  //   dossier  plano de ingenieria azul con rejilla, mono, regla y cajetin de datos     studio   fondo de estudio negro, titulo grande y acento de la marca
  const THEMES = {
    paper: { dark: false, paper: '#f6f5f0', plate: '#e8e6dd', plateEdge: '#cfccc0', ink: '#23221f', mute: '#8b887d', metal: '#d9d7cf', steel: '#bdbbb1', darkc: '#6b6a63', ember: '#c8542a', teal: '#0b7285', red: '#c0392b', green: '#2f9e44', gold: '#c9a227', glass: '#9bd3dc', line: 'rgba(35,34,31,0.2)', card: 'frame', titleFont: 'serif', gl: { inner: '#faf9f5', outer: '#dedbd1', floorK: 1, floor: '#2a2418', bloom: 0.12, thr: 0.92 } },
    night: { dark: true, paper: '#101218', plate: '#1a1d25', plateEdge: '#2b2f3a', ink: '#ecebe6', mute: '#8d909b', metal: '#8f939c', steel: '#6d717b', darkc: '#c9cbd2', ember: '#ff9a62', teal: '#5ad1d8', red: '#ff6b6b', green: '#69db7c', gold: '#e6c35c', glass: '#7ac7d6', line: 'rgba(236,235,230,0.22)', card: 'frame', titleFont: 'serif', gl: { inner: '#2b2f3a', outer: '#090a0e', floorK: 3.2, floor: '#000000', bloom: 0.035, thr: 0.985 } },
    dossier: { dark: true, paper: '#0a1828', plate: '#10253b', plateEdge: '#1d3b59', ink: '#d6e6f5', mute: '#6f8ba6', metal: '#7fa0bd', steel: '#5d7a96', darkc: '#bcd4e8', ember: '#ffb347', teal: '#4fd1ff', red: '#ff6b6b', green: '#6ee7a8', gold: '#ffd166', glass: '#5cc7e8', line: 'rgba(110,180,230,0.28)', card: 'dossier', titleFont: 'mono', mono: true, gl: { inner: '#153756', outer: '#050d18', floorK: 2.6, floor: '#000000', bloom: 0.07, thr: 0.97, grid: { px: 54, every: 5, minor: 'rgba(110,180,255,0.075)', major: 'rgba(110,180,255,0.16)' } } },
    studio: { dark: true, paper: '#09090c', plate: '#17171d', plateEdge: '#2a2a33', ink: '#f4f2ee', mute: '#8a8892', metal: '#9c9ba3', steel: '#74747c', darkc: '#d3d2d8', ember: '#ff9a62', teal: '#ff6a3d', red: '#ff6b6b', green: '#69db7c', gold: '#e6c35c', glass: '#7ac7d6', line: 'rgba(244,242,238,0.2)', card: 'studio', titleFont: 'sans', accent: true, gl: { inner: '#22222a', outer: '#030305', floorK: 3.4, floor: '#000000', bloom: 0.1, thr: 0.95, rimColor: 'accent', rimK: 2.2, exposure: 1.08, glow: 'accent', glowA: 0.4 } },
  };
  MX.styles = THEMES; MX.STYLE_NAMES = Object.keys(THEMES);
  const SERIF0 = MX.SERIF, MONO0 = MX.MONO, REALMONO = '"Cascadia Mono","Cascadia Code",Consolas,"SF Mono",Menlo,"DejaVu Sans Mono",monospace';
  MX.THEME = {};
  // cambia de estilo EN SITIO (los modulos guardan la referencia a MX.THEME); accent: el color de la marca, que los estilos con accent usan en lugar del acento propio
  MX.setStyle = (name, accent) => {
    const t = THEMES[name] || THEMES.paper; Object.keys(MX.THEME).forEach((k) => { delete MX.THEME[k]; }); Object.assign(MX.THEME, t); MX.THEME.name = THEMES[name] ? name : 'paper';
    if (accent && t.accent) MX.THEME.teal = accent;
    MX.SERIF = t.titleFont === 'mono' ? REALMONO : t.titleFont === 'sans' ? MONO0 : SERIF0; if (t.mono) { MX.MONO = REALMONO; } else { MX.MONO = MONO0; }
  };
  MX.setStyle(g.MX_THEME || 'paper');

  /* ------------------------------------------------------------ tarjetas alternativas */
  // dossier: marco completo con regla de marcas, encabezado y titulo en monoespaciada, doble filete y cajetin de datos arriba a la derecha (o.blocks: [[nombre, valor]])
  function cardDossier(c, T, W, H, m, o) {
    const a = o.alpha == null ? 1 : o.alpha, x0 = m + 34;
    c.save(); c.globalAlpha = a; c.strokeStyle = MX.rgba(T.ink, 0.5); c.lineWidth = 1.5; c.strokeRect(m, m, W - 2 * m, H - 2 * m);
    c.lineWidth = 1; c.strokeStyle = MX.rgba(T.ink, 0.28);
    for (let x = m, i = 0; x <= W - m; x += 27, i++) { const L = i % 5 === 0 ? 15 : 7; c.beginPath(); c.moveTo(x, m); c.lineTo(x, m + L); c.moveTo(x, H - m); c.lineTo(x, H - m - L); c.stroke(); }
    for (let y = m, i = 0; y <= H - m; y += 27, i++) { const L = i % 5 === 0 ? 15 : 7; c.beginPath(); c.moveTo(m, y); c.lineTo(m + L, y); c.moveTo(W - m, y); c.lineTo(W - m - L, y); c.stroke(); }
    c.restore();
    MX.text(String(o.fig || 'Fig 1').toUpperCase() + (o.kicker ? '   /   ' + String(o.kicker).toUpperCase() : ''), x0, m + 66, { size: 15, color: T.teal, font: MX.MONO, w: 600, alpha: a, spacing: 2.4 });
    const blocks = o.blocks || [], bw = blocks.length ? 290 : 0, title = String(o.title || '').toUpperCase(), size = Math.max(22, Math.min(46, (W - 2 * x0 - bw - 30) / (Math.max(1, title.length) * 0.64)));
    if (title) MX.text(title, x0, m + 126, { size, color: T.ink, font: MX.MONO, w: 700, alpha: a, spacing: 0.5 });
    if (o.sub) MX.text(o.sub, x0, m + 160, { size: 16, color: T.mute, font: MX.MONO, alpha: a, w: 400 });
    c.save(); c.globalAlpha = a * 0.8; c.strokeStyle = T.line; c.lineWidth = 1; [m + 180, m + 185].forEach((y) => { c.beginPath(); c.moveTo(x0, y); c.lineTo(W - x0, y); c.stroke(); }); c.restore();
    if (blocks.length) {
      const bx = W - x0 - bw, by = m + 36, rh = 25; c.save(); c.globalAlpha = a; c.strokeStyle = MX.rgba(T.ink, 0.4); c.lineWidth = 1; c.strokeRect(bx, by, bw, rh * blocks.length + 8);
      blocks.forEach((r, i) => { const y = by + 22 + i * rh; if (i) { c.beginPath(); c.moveTo(bx, y - 17); c.lineTo(bx + bw, y - 17); c.stroke(); } MX.text(String(r[0]).toUpperCase(), bx + 12, y, { size: 12, color: T.mute, font: MX.MONO, w: 500, alpha: a, spacing: 1.6 }); MX.text(String(r[1]), bx + bw - 12, y, { size: 14, color: r[2] || T.ink, font: MX.MONO, w: 700, align: 'right', alpha: a }); });
      c.restore();
    }
    if (o.hint) MX.text(String(o.hint).toUpperCase(), x0, H - m - 30, { size: 13, color: T.mute, font: MX.MONO, alpha: a, spacing: 2.2, w: 500 });
    if (o.readout) MX.text(o.readout, W - x0, H - m - 30, { size: 17, color: T.ink, font: MX.MONO, align: 'right', alpha: a, w: 600 });
    return { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
  }
  // studio: sin marco; barra de acento, titulo grande en negrita, resto casi invisible
  function cardStudio(c, T, W, H, m, o) {
    const a = o.alpha == null ? 1 : o.alpha, x0 = m + 34, title = String(o.title || ''), size = Math.max(34, Math.min(74, (W - 2 * x0) / (Math.max(1, title.length) * 0.56)));
    c.save(); c.globalAlpha = a; c.fillStyle = T.teal; c.fillRect(x0, m + 40, 56, 5); c.restore();
    MX.text(String(o.fig || 'Fig 1').toUpperCase(), x0 + 76, m + 50, { size: 15, color: T.mute, w: 600, alpha: a, spacing: 3.2 });
    if (o.kicker) MX.text(String(o.kicker).toUpperCase(), W - x0, m + 50, { size: 13, color: T.mute, align: 'right', alpha: a, spacing: 2.6, w: 500 });
    if (title) MX.text(title, x0, m + 132, { size, color: T.ink, font: MX.SERIF, w: 800, alpha: a });
    if (o.sub) MX.text(o.sub, x0, m + 174, { size: 21, color: T.mute, font: MX.SANS, alpha: a, w: 400 });
    if (o.hint) MX.text(String(o.hint).toUpperCase(), x0, H - m - 30, { size: 13, color: T.mute, alpha: a, spacing: 2.8, w: 500 });
    if (o.readout) MX.text(o.readout, W - x0, H - m - 30, { size: 20, color: T.ink, align: 'right', alpha: a, w: 700 });
    return { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
  }

  /* ------------------------------------------------------------ tarjeta de figura */
  // fondo de papel, marco, numero de figura, titulo, pista y lectura. Devuelve el area util.
  MX.card = (W, H, o = {}) => {
    const c = MX.ctx, T = MX.THEME, m = 40;
    if (!o.overlay) {                                                  // overlay: el fondo ya lo dibujo la escena 3D
      c.fillStyle = T.paper; c.fillRect(0, 0, W, H);
      const gr = c.createRadialGradient(W * 0.5, H * 0.45, H * 0.1, W * 0.5, H * 0.45, H * 0.8); gr.addColorStop(0, T.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(120,115,100,0.035)');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
    }
    if (T.card === 'dossier') return cardDossier(c, T, W, H, m, o);
    if (T.card === 'studio') return cardStudio(c, T, W, H, m, o);
    const a = o.alpha == null ? 1 : o.alpha;
    c.save(); c.globalAlpha = a; c.strokeStyle = MX.rgba(T.ink, 0.5); c.lineWidth = 1.3;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => { c.beginPath(); c.moveTo(x + sx * 28, y); c.lineTo(x, y); c.lineTo(x, y + sy * 28); c.stroke(); });      // esquinas de lamina
    c.strokeStyle = MX.rgba(T.ink, 0.1); c.lineWidth = 1; c.strokeRect(m, m, W - 2 * m, H - 2 * m);
    c.restore();
    const x0 = m + 30;
    MX.text(String(o.fig || 'Fig 1').toUpperCase(), x0, m + 58, { size: 17, color: T.teal, w: 600, alpha: a, spacing: 3.2 });
    if (o.kicker) MX.text(String(o.kicker).toUpperCase(), W - x0, m + 58, { size: 14, color: T.mute, align: 'right', alpha: a, spacing: 2.6, w: 500 });
    if (o.title) MX.text(o.title, x0, m + 122, { size: 56, color: T.ink, font: MX.SERIF, w: 500, alpha: a });
    if (o.sub) MX.text(o.sub, x0, m + 160, { size: 21, color: T.mute, font: MX.SANS, alpha: a, w: 400 });
    c.save(); c.globalAlpha = a * 0.7; c.strokeStyle = T.line; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, m + 182); c.lineTo(W - x0, m + 182); c.stroke(); c.restore();
    if (o.hint) MX.text(String(o.hint).toUpperCase(), x0, H - m - 30, { size: 14, color: T.mute, alpha: a, spacing: 2.8, w: 500 });
    if (o.readout) MX.text(o.readout, W - x0, H - m - 30, { size: 18, color: T.ink, align: 'right', alpha: a, w: 500 });
    return { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
  };

  /* ------------------------------------------------------------ etiquetas con linea guia */
  // from: punto 3D [x,y,z]; at: punto de pantalla [x,y] donde va el texto; side: 'l' | 'r'
  MX.callout = (from, at, lines, o = {}) => {
    const c = MX.ctx, T = MX.THEME, a = o.alpha == null ? 1 : o.alpha; if (a <= 0.01) return;
    const f = MX.P(from[0], from[1], from[2]), side = o.side || 'r', size = o.size || 24, col = o.color || T.ink;
    const L = Array.isArray(lines) ? lines : [lines];
    c.save(); c.globalAlpha = a;
    const w = Math.max(...L.map((s, i) => { c.font = (i === 0 ? '600 ' : '400 ') + (i === 0 ? size : size - 5) + 'px ' + MX.SANS; return c.measureText(s).width; }));
    const x = side === 'r' ? at[0] + 14 : at[0] - 14 - w, ytop = at[1] - size * 0.82, hh = L.length * (size + 3) + 10;
    c.strokeStyle = MX.rgba(col, 0.6); c.lineWidth = 1.1; c.lineJoin = 'round'; c.beginPath(); c.moveTo(f[0], f[1]); c.lineTo(at[0], at[1] - 4); c.stroke();
    c.beginPath(); c.arc(f[0], f[1], 6, 0, 6.2832); c.strokeStyle = MX.rgba(col, 0.85); c.lineWidth = 1.2; c.stroke(); c.beginPath(); c.arc(f[0], f[1], 2, 0, 6.2832); c.fillStyle = col; c.fill();
    c.fillStyle = MX.rgba(T.paper, T.dark ? 0.82 : 0.86); c.fillRect(x - 12, ytop - 6, w + 26, hh); c.fillStyle = col; c.fillRect(x - 12, ytop - 6, 3, hh);
    L.forEach((s, i) => { c.font = (i === 0 ? '600 ' : '400 ') + (i === 0 ? size : size - 5) + 'px ' + MX.SANS; c.fillStyle = i === 0 ? col : T.mute; c.textAlign = 'left'; c.fillText(s, x, at[1] + i * (size + 3) + size * 0.2); });
    c.restore();
  };

  /* ------------------------------------------------------------ arnes de render */
  // MX.run({ w, h, fps, duration, draw(ctx, t), audio() -> Float32Array, sr })
  MX.run = (cfg) => {
    const W = cfg.w, H = cfg.h, FPS = cfg.fps || 30, DUR = cfg.duration;
    const cv = document.getElementById('c') || Object.assign(document.body.appendChild(document.createElement('canvas')), { id: 'c' });
    cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); MX.ctx = ctx;
    const acc = document.createElement('canvas'); acc.width = W; acc.height = H; const actx = acc.getContext('2d');
    const paint = (t) => { MX.ctx = ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; cfg.draw(ctx, clamp(t, 0, DUR - 1e-6)); };
    // motion blur: promedio de n subtiempos dentro de un obturador (fraccion del intervalo de frame)
    const frame = (t, n = 1, shutter = 0.5) => {
      if (n <= 1) { paint(t); return; }
      for (let i = 0; i < n; i++) {
        paint(t + (i / (n - 1) - 0.5) * shutter / FPS);
        if (i === 0) { actx.globalAlpha = 1; actx.clearRect(0, 0, W, H); actx.drawImage(cv, 0, 0); } else { actx.globalAlpha = 1 / (i + 1); actx.drawImage(cv, 0, 0); }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(acc, 0, 0);
    };
    g.__frame = (t, n, shutter) => { frame(t, n, shutter); return cv.toDataURL('image/png'); };
    g.__audioWav = () => {
      const raw = cfg.audio ? cfg.audio() : new Float32Array(Math.floor(DUR * (cfg.sr || 44100))), sr = (raw && raw.sr) || cfg.sr || 44100, ch = raw && raw.L ? [raw.L, raw.R] : [raw], N = ch[0].length, nch = ch.length;
      const b = new ArrayBuffer(44 + N * nch * 2), v = new DataView(b), w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + N * nch * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * nch * 2, true); v.setUint16(32, nch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, N * nch * 2, true);
      for (let i = 0; i < N; i++) for (let c = 0; c < nch; c++) v.setInt16(44 + (i * nch + c) * 2, clamp(ch[c][i], -1, 1) * 32767, true);
      const u8 = new Uint8Array(b); let str = ''; for (let i = 0; i < u8.length; i += 0x8000) str += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(str);
    };
    const params = new URLSearchParams(location.search);
    if (params.has('render') || params.has('t')) { frame(parseFloat(params.get('t') || '0'), 1); return; }
    // modo navegador: click para reproducir con audio
    const ui = Object.assign(document.createElement('div'), { textContent: '▶ click to play' });
    Object.assign(ui.style, { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '20px ' + MX.MONO, color: '#2a2925', background: 'rgba(244,243,238,.78)', cursor: 'pointer', letterSpacing: '.08em' });
    document.body.appendChild(ui); frame(cfg.poster == null ? DUR * 0.5 : cfg.poster, 1);
    ui.addEventListener('click', () => {
      ui.style.display = 'none';
      const data = cfg.audio ? cfg.audio() : new Float32Array(cfg.sr || 44100), sr = (data && data.sr) || cfg.sr || 44100, ac = new (g.AudioContext || g.webkitAudioContext)({ sampleRate: sr });
      const st2 = data && data.L ? [data.L, data.R] : [data], ab = ac.createBuffer(st2.length, st2[0].length, sr); st2.forEach((ch, i) => ab.copyToChannel(ch, i)); const src = ac.createBufferSource(); src.buffer = ab; src.connect(ac.destination);
      const t0 = ac.currentTime + 0.05; src.start(t0);
      const tick = () => { const t = ac.currentTime - t0; if (t >= DUR) { frame(DUR - 0.01, 1); ui.style.display = 'flex'; ui.textContent = '↻ click to replay'; return; } frame(Math.max(0, t), 1); requestAnimationFrame(tick); };
      tick();
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
