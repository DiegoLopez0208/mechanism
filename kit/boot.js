/*
 * kit/boot.js - arranque de una figura: carga las fuentes incrustadas, aplica el tema y recien entonces carga los scripts en orden.
 * Uso en el HTML:  <script src="../../kit/boot.js" data-scripts="../../kit/vendor/three.bundle.js,../../kit/iso.js,...,scene.js"></script>
 * Tema: ?theme=night (oscuro, de lujo) o ?theme=paper (por defecto).
 */
(function () {
  'use strict';
  const self = document.currentScript, list = (self.getAttribute('data-scripts') || '').split(',').map((s) => s.trim()).filter(Boolean), base = self.src.replace(/boot\.js.*$/, '');
  const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = res; s.onerror = () => rej(new Error('no se pudo cargar ' + src)); document.head.appendChild(s); });
  const theme = new URLSearchParams(location.search).get('theme') || self.getAttribute('data-theme') || 'paper';
  (async () => {
    await load(base + 'fonts.js');
    const fonts = [new FontFace('Inter', 'url(' + MX.FONT_DATA.inter + ')', { weight: '100 900' }), new FontFace('Cormorant Garamond', 'url(' + MX.FONT_DATA.cormorant + ')', { weight: '300 700' })];
    for (const f of fonts) { await f.load(); document.fonts.add(f); }
    window.MX_THEME = theme;
    for (const s of list) await load(s);
  })().catch((e) => { console.error(e); document.title = 'ERROR ' + e.message; });
})();
