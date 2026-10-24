/*
 * kit/boot.js - starts a figure: loads the embedded fonts, applies the theme and only then loads the scripts in order.
 * In the HTML:  <script src="../../kit/boot.js" data-scripts="../../kit/vendor/three.bundle.js,../../kit/iso.js,...,scene.js"></script>
 * Style: ?style=dossier (the default, mechanism's signature) | paper | night | studio (?theme= is the same).
 */
(function () {
  'use strict';
  const self = document.currentScript, list = (self.getAttribute('data-scripts') || '').split(',').map((s) => s.trim()).filter(Boolean), base = self.src.replace(/boot\.js.*$/, '');
  const load0 = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = res; s.onerror = () => rej(new Error('could not load ' + src)); document.head.appendChild(s); });
  // ?pathtrace (render.mjs --pathtrace): the path tracer is loaded right after three.js, and only then
  const load = async (src) => { await load0(src); if (/three\.bundle\.js$/.test(src) && new URLSearchParams(location.search).has('pathtrace')) await load0(src.replace(/three\.bundle\.js$/, 'pathtracer.bundle.js')); };
  const q = new URLSearchParams(location.search), theme = q.get('style') || q.get('theme') || self.getAttribute('data-theme') || 'dossier';
  // The recorded sounds (kit/samples.js, about 1.1 MB) are needed only when a film plays with sound. On an interactive page (not
  // ?render or ?t) they load after everything else, so they do not hold back the first frame; the play button waits for
  // window.MX_AUDIO_READY. Renders keep the strict order, so a film's soundtrack is the same whatever the network does.
  const deferAudio = !q.has('render') && !q.has('t'), later = [];
  let audioDone; window.MX_AUDIO_READY = new Promise((r) => { audioDone = r; });
  // Which modules each engine needs comes from kit/manifest.js. On a spec page the 3D stack (three.js and the modules that run it
  // when they load) is held back until just before the compiler: by then the page's own spec has loaded, so the engine is known
  // from the URL or from spec.presentation, and an engine that does not need the stack (Workflow) never loads it.
  // A hand-built page (no compiler in its list) loads its scripts in their own order, as before.
  (async () => {
    await load(base + 'fonts.js');
    await load(base + 'manifest.js');
    const M = window.MX_MANIFEST, kit = (s) => M.kitName(s), spec = list.some((s) => kit(s) === M.compiler), held = spec ? list.filter((s) => M.stack3d.includes(kit(s))) : [];
    const step = (src) => { if (deferAudio && kit(src) === 'samples.js') { later.push(src); return Promise.resolve(); } return load(src); };
    const fonts = [new FontFace('Inter', 'url(' + MX.FONT_DATA.inter + ')', { weight: '100 900' }), new FontFace('Cormorant Garamond', 'url(' + MX.FONT_DATA.cormorant + ')', { weight: '300 700' })];
    for (const f of fonts) { await f.load(); document.fonts.add(f); }
    window.MX_THEME = theme; window.MX_PROFILE = spec ? null : 'hand-built';
    for (const s of list) {
      const k = kit(s);
      if (held.includes(s)) continue;
      if (spec && k === M.compiler) {
        const engine = window.MX_PROFILE = M.engineFor(q, window.SPEC, MX.presentation), e = M.needsFor(engine, window.SPEC);      // Paper with a vector scene: no stack, no mesh adapter
        if (e.stack3d) for (const h of held) await step(h);
        for (const m of e.modules) await step(base + m);
      }
      await step(s);
      if (k === 'core.js') for (const m of M.injected) await step(base + m);
    }
    // a missing sounds file means synthesised sound, not a dead play button
    Promise.all(later.map(load0)).then(() => audioDone(), (e) => { console.error(e); audioDone(); });
  })().catch((e) => { audioDone(); console.error(e); document.title = 'ERROR ' + e.message; });
})();
