/* Presentation methods and backgrounds. Script-tag module; no DOM required by
 * the planner. Existing films opt in with ?method=... or spec.presentation. */
(function (g) {
  'use strict';
  const MX = g.MX = g.MX || {}, P = MX.presentation = {};
  P.methods = ['studio', 'workflow', 'paper'];
  P.backgrounds = {
    graphite: { dark: true, paper: '#14191f', plate: '#202832', plateEdge: '#3d4b59', ink: '#f1f5f8', mute: '#a7b6c4', teal: '#6dd9da', line: 'rgba(171,197,214,.22)', gl: { inner: '#303d49', outer: '#10151c', floorK: 2, floor: '#000000', bloom: 0.025 } },
    blueprint: { dark: true, paper: '#0c2035', plate: '#142f49', plateEdge: '#315774', ink: '#edf6ff', mute: '#a2bfd5', teal: '#68d9ff', line: 'rgba(137,191,231,.25)', gl: { inner: '#204665', outer: '#09192b', floorK: 2, floor: '#000000', bloom: 0.025, grid: { px: 60, every: 5, minor: 'rgba(150,200,240,.045)', major: 'rgba(150,200,240,.1)' } } },
    porcelain: { dark: false, paper: '#f2f5f7', plate: '#ffffff', plateEdge: '#c9d3dc', ink: '#172b3b', mute: '#526777', teal: '#007c86', line: 'rgba(29,63,85,.2)', gl: { inner: '#ffffff', outer: '#dce5ec', floorK: 0.8, floor: '#314654', bloom: 0.02 } },
    ivory: { dark: false, paper: '#f5f1e7', plate: '#fffdf6', plateEdge: '#d6d0bf', ink: '#292e30', mute: '#64685f', teal: '#176e78', line: 'rgba(51,62,62,.2)', gl: { inner: '#fffcf3', outer: '#e6e0d1', floorK: 0.7, floor: '#504534', bloom: 0.02 } },
  };
  P.resolve = (query, spec = {}) => {
    const data = spec.presentation || {}, method = query.get('method') || data.method || 'studio';
    const background = query.get('background') || data.background || (method === 'paper' ? 'ivory' : method === 'workflow' ? 'blueprint' : 'porcelain');
    if (!P.methods.includes(method)) throw new Error('Unknown presentation method: ' + method);
    if (!Object.hasOwn(P.backgrounds, background)) throw new Error('Unknown presentation background: ' + background);
    return { method, background, enabled: query.has('method') || query.has('background') || !!spec.presentation };
  };
  P.apply = (config) => {
    const base = MX.styles.paper, bg = P.backgrounds[config.background];
    Object.keys(MX.THEME).forEach(key => delete MX.THEME[key]);
    Object.assign(MX.THEME, base, bg, { name: config.background, card: 'studio', titleFont: 'sans', gl: Object.assign({}, bg.gl) });
    MX.INK = MX.THEME.ink; MX.SERIF = MX.SANS; MX.MONO = MX.SANS;
  };
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  // Long identifiers are split too, rather than shrinking an entire paragraph.
  P.wrap = (text, width, measure) => {
    const lines = []; let line = '';
    for (const word of String(text || '').split(/\s+/).filter(Boolean)) {
      if (line && measure(line + ' ' + word) > width) { lines.push(line); line = ''; }
      if (line) line += ' ';
      for (const ch of word) {
        if (line && measure(line + ch) > width) { lines.push(line); line = ''; }
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  P.plan = (spec, method, length = 'short', modeIndices = null) => {
    const m = spec.mechanism || {}, duration = length === 'extended' ? 90 : length === 'normal' ? 60 : 30;
    let items;
    if (method === 'workflow') {
      const steps = m.steps;
      if (steps && Number.isInteger(steps.count) && steps.count > 0) {
        items = Array.from({ length: steps.count }, (_, index) => Object.assign({ index }, steps.label(index)));
      } else items = ((m.drive || {}).modes || []).map((mode, index) => ({ index, title: mode.label || mode.id, formula: mode.formula || '', value: '', mode: index }))
        .filter(item => modeIndices == null || modeIndices.includes(item.mode));
    } else {
      const byId = Object.fromEntries((spec.parts || []).map(p => [p.id, p]));
      const ids = (spec.director || {}).tour || (spec.parts || []).filter(p => !p.decor && p.tour !== false).map(p => p.id);
      items = ids.slice(0, length === 'short' ? 4 : 8).map((id, index) => {
        const p = byId[id]; if (!p) throw new Error('Unknown presentation part: ' + id);
        return { index, id, title: (p.info || {}).title || p.name || id, formula: ((p.info || {}).lines || []).join('. '), conf: p.conf };
      });
    }
    if (!items.length) throw new Error(method + ' needs ' + (method === 'workflow' ? 'mechanism steps or drive modes' : 'a tour or non-decorative parts'));
    const begin = 3, end = duration - 6, slot = (end - begin) / items.length;
    return { method, duration, items, begin, end, slot };
  };
  P.at = (plan, time) => {
    const t = clamp(time, 0, plan.duration), index = clamp(Math.floor((t - plan.begin) / plan.slot), 0, plan.items.length - 1);
    return { t, index, item: plan.items[index], progress: clamp((t - plan.begin - index * plan.slot) / plan.slot), intro: t < plan.begin, closing: t >= plan.end };
  };

  P.util = {
    clamp, smooth,
    text(c, str, x, y, size, width, color, weight = 500) {
      c.font = weight + ' ' + size + 'px ' + MX.SANS; c.fillStyle = color; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      const lines = P.wrap(str, width, s => c.measureText(s).width);
      lines.forEach((s, i) => c.fillText(s, x, y + i * size * 1.25));
      return lines.length * size * 1.25;
    },
    line(c, a, b, color, width = 2) {
      c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.strokeStyle = color; c.lineWidth = width; c.stroke();
    },
    box(c, x, y, w, h, fill, stroke, radius = 12) {
      c.beginPath(); c.roundRect(x, y, w, h, radius); c.fillStyle = fill; c.fill();
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke(); }
    },
  };
  // Shared data/clock/audio contract only. Each engine owns its entire drawing.
  P.mount = ({ plan, spec, validation, config, W, H, engine, draw, shapeCheck = () => [], diagnostics = () => ({}) }) => {
    const inspect = t => P.at(plan, t);
    g.__specInfo = () => ({ duration: plan.duration, parts: (spec.parts || []).length, validation: validation.lines,
      warnings: validation.warnings, errors: validation.errors, method: config.method, background: config.background, engine,
      panels: [{ kind: 'verdict', from: plan.end, to: plan.duration }], phases: { assembled: 2, modes: plan.begin, panels: plan.end },
      shots: plan.items.map((item, i) => ({ label: item.title, t: plan.begin + (i + .6) * plan.slot })) });
    g.__presentationAt = t => Object.assign({}, inspect(t), diagnostics(t));
    g.__geom = t => ({ t, cam: [0, 0, 10000], near: 0, focus: null, parts: [] });
    g.__shapeCheck = shapeCheck;
    const audio = () => MX.sound.render({ duration: plan.duration, seed: config.method === 'workflow' ? 81 : 91,
      events: plan.items.map((_, i) => ({ t: plan.begin + i * plan.slot, v: config.method === 'workflow' ? 'click' : 'whoosh', d: .3, f: 1100, f0: 600, f1: 1400, gain: .16, sharp: .5 })),
      bed: { bpm: config.method === 'workflow' ? 96 : 72, root: 48, mode: 'dorian', level: .24, prog: [0, 5, 3, 4], curve: [[0, .2], [plan.begin, .3], [plan.end, .2], [plan.duration, 0]] }, room: { size: 1, wet: .15, fb: .7 }, tone: .002 });
    MX.run({ w: W, h: H, fps: 30, duration: plan.duration, contextOptions: { willReadFrequently: true }, draw: (c, t) => draw(c, inspect(t)), audio, poster: 9, blurAt: () => 1 });
    return { DUR: plan.duration, plan };
  };
})(typeof window !== 'undefined' ? window : globalThis);
