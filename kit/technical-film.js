/* Technical collection: an editorial director around each native renderer.
 * Frames are rendered from specs; no existing video is sampled. The native
 * Studio / Workflow / Paper renderer owns its image. Evidence is never promoted.
 */
(function (g) {
  'use strict';
  const MX = g.MX, film = g.TECHNICAL_FILM;
  if (!film || film.chapters.length !== 4) throw new Error('A technical film needs four chapters');
  const q = new URLSearchParams(location.search);
  q.set('render', '1'); q.set('length', 'normal'); q.set('aspect', '4:5');
  q.set('method', film.engine); q.set('background', film.engine === 'paper' ? 'ivory' : 'porcelain');
  history.replaceState(null, '', location.pathname + '?' + q);
  let figure;
  const makeFigure = MX.figure;
  if (makeFigure) MX.figure = config => { figure = makeFigure(config); return figure; };
  try { MX.spec.run(g.SPEC); } finally { if (makeFigure) MX.figure = makeFigure; }
  const nativePaint = g.__paint, nativeInfo = g.__specInfo(), nativeCanvas = document.getElementById('c');
  const updateNative = film.engine === 'studio' ? g.__pose : nativePaint;
  if (typeof updateNative !== 'function') throw new Error('The native engine has no pose/drawing entry point');
  const validation = MX.spec.validate(g.SPEC), verdict = validation.verdict;
  if (validation.errors.length) throw new Error(validation.errors.join('; '));
  nativeCanvas.id = 'native-canvas'; nativeCanvas.style.display = 'none';
  const cv = document.createElement('canvas'); cv.id = 'c'; cv.width = 1600; cv.height = 900;
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d', { alpha: false, willReadFrequently: true });
  const W = 1600, H = 900, duration = 32, slot = 8;
  const paper = film.engine === 'paper';
  const C = { bg: '#f1f3f4', ink: '#182c3b', mute: '#526675', rule: '#bcc9cf', accent: '#086c88', panel: '#ffffff' };
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const mono = 'Consolas, monospace';
  const text = (str, x, y, size, width, color = C.ink, weight = 500, family = MX.SANS) => {
    ctx.font = weight + ' ' + size + 'px ' + family;
    ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const lines = MX.presentation.wrap(String(str), width, s => ctx.measureText(s).width);
    lines.forEach((s, i) => ctx.fillText(s, x, y + i * size * 1.32));
    return lines.length * size * 1.32;
  };
  const line = (x, y, w, col = C.rule) => {
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  };
  const selectShot = key => {
    const [kind, raw] = key.split(':'), i = Number(raw || 0);
    const shots = nativeInfo.shots || [];
    if (kind === 'mode') {
      const mode = g.SPEC.mechanism.drive.modes[i];
      return shots.find(s => s.label === 'mode ' + (mode.id || i));
    }
    const pool = kind === 'tour' ? shots.filter(s => s.label.startsWith('tour ')) : shots;
    return (kind === 'item' || kind === 'tour') ? pool[Math.min(i, pool.length - 1)]
      : shots.find(s => s.label === key);
  };
  const sourceTime = (chapter, progress) => {
    const shot = selectShot(chapter.shot);
    if (!shot) throw new Error('No native shot for ' + chapter.shot + ' in ' + film.id);
    // Visit a bounded interval around the native shot, in its original order.
    // A tiny drift is avoided on engineering sheets so fine lines stay stable.
    const span = paper ? .4 : 2.4;
    return Math.max(.05, Math.min(nativeInfo.duration - .1, shot.t + (progress - .5) * span));
  };
  let lastTime = null, studyDiagnostics = null;
  const boundsByChapter = new Map();
  const paint = t => {
    t = Math.max(0, Math.min(duration - 1e-6, t));
    const index = Math.min(3, Math.floor(t / slot)), chapter = film.chapters[index];
    const p = (t - index * slot) / slot, nt = sourceTime(chapter, p);
    if (film.engine === 'studio' && !boundsByChapter.has(index)) {
      updateNative(sourceTime(chapter, 0), 1, .5); const bounds = figure.studyBounds(true);
      for (let sample = 1; sample <= 8; sample++) {
        updateNative(sourceTime(chapter, sample / 8), 1, .5); const sampled = figure.studyBounds(true);
        bounds.union(sampled); bounds.studyPoints.push(...sampled.studyPoints);
      }
      boundsByChapter.set(index, bounds); lastTime = null;
    }
    if (nt !== lastTime) { updateNative(nt, 1, .5); lastTime = nt; }
    MX.ctx = ctx;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.accent; ctx.fillRect(0, 0, 12, H);
    text('MECHANISM   /   TECHNICAL STUDIES', 44, 42, 18, 1100, C.accent, 700, mono);
    text(film.engine.toUpperCase() + '  /  ' + film.number, 1265, 42, 18, 300, C.mute, 600, mono);
    text(film.title, 44, 102, 40, 1490, C.ink, 650);
    line(44, 126, 1512);
    // Native scene viewport. Labels and proof panel are composited afterwards,
    // so no temporal averaging can smear the explanatory typography.
    const box = { x: 44, y: 151, w: 960, h: 617 };
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.fillStyle = paper ? '#f5f1e7' : '#f2f5f7'; ctx.fillRect(box.x, box.y, box.w, box.h);
    studyDiagnostics = film.engine === 'studio'
      ? figure.drawStudy(ctx, box, boundsByChapter.get(index)) : g.__drawStudy(ctx, box, nt);
    ctx.restore();
    const fade = smooth(Math.min(p * 10, (1 - p) * 10));
    ctx.save(); ctx.globalAlpha = .45 + .55 * fade;
    text('CHAPTER ' + (index + 1) + ' / 4', 1040, 181, 18, 500, C.accent, 700, mono);
    let y = 233;
    y += text(chapter.title, 1040, y, 33, 502, C.ink, 650) + 20;
    y += text(chapter.text, 1040, y, 25, 500, C.mute) + 22;
    line(1040, y, 500); y += 42;
    y += text(chapter.formula, 1040, y, 27, 500, C.accent, 700, mono) + 25;
    ctx.restore();
    line(1040, 641, 500);
    text('EVIDENCE / ' + verdict.state, 1040, 674, 19, 500, C.ink, 700, mono);
    text(verdict.checked + ' comparisons · ' + verdict.estimated + ' estimated claims', 1040, 704, 18, 500, C.mute);
    text('Agreement is not human approval.', 1040, 733, 18, 500, C.mute);
    text(film.question, 44, 811, 28, 1510, C.ink, 650);
    text(film.limit, 44, 847, 18, 1510, C.mute);
    const trackY = 880, trackW = 1512;
    ctx.fillStyle = '#d6e0e5'; ctx.fillRect(44, trackY, trackW, 4);
    ctx.fillStyle = C.accent; ctx.fillRect(44, trackY, trackW * t / duration, 4);
    for (let i = 1; i < 4; i++) { ctx.fillStyle = C.bg; ctx.fillRect(44 + trackW * i / 4, trackY - 2, 4, 8); }
    return cv;
  };
  // A modest deterministic event track; illustrative cues, not recorded machine audio.
  g.__audioWav = () => {
    const sr = 48000, count = sr * duration, b = new ArrayBuffer(44 + count * 4), v = new DataView(b);
    const str = (at, s) => { for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, b.byteLength - 8, true); str(8, 'WAVEfmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, count * 4, true);
    for (let i = 0; i < count; i++) {
      const t = i / sr, u = t % slot, env = u < .65 ? Math.sin(Math.PI * u / .65) ** 2 * Math.exp(-u * 7) : 0;
      const f = [440, 554.365, 659.255, 880][Math.min(3, Math.floor(t / slot))];
      const sample = .2 * env * (Math.sin(t * f * Math.PI * 2) + .2 * Math.sin(t * f * Math.PI * 4));
      v.setInt16(44 + i * 4, sample * 32767, true); v.setInt16(46 + i * 4, sample * 32767, true);
    }
    const bytes = new Uint8Array(b); let s = '';
    for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(s);
  };
  g.__paint = paint;
  g.__frame = (t, n, shutter, fmt) => { paint(t); return cv.toDataURL(fmt === 'jpg' ? 'image/jpeg' : 'image/png', .98); };
  g.__specInfo = () => ({ ...nativeInfo, duration, method: film.engine, engine: 'technical/' + film.engine,
    errors: validation.errors, warnings: validation.warnings, evidence: verdict,
    audio: 'Illustrative chapter cues, not a recording of the machine',
    shots: film.chapters.map((chapter, i) => ({ label: chapter.title, t: i * slot + 4 })),
    panels: [{ kind: 'verdict', from: 0, to: duration }], chapters: film.chapters,
    source: film.source, nativeDuration: nativeInfo.duration });
  g.__studyDiagnostics = () => ({ ...studyDiagnostics, nativeTime: lastTime });
  g.__frameInfo = { width: W, height: H, fps: Number(q.get('fps') || 30) };
  paint(Number(q.get('t') || 4));
})(typeof window !== 'undefined' ? window : globalThis);
