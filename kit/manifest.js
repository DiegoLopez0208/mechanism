/*
 * kit/manifest.js - which kit modules each engine needs, in one place. kit/boot.js (in the browser), scripts/new.mjs and
 * tests/manifest.test.mjs (in Node, through vm) all read this table; nothing else lists files per engine.
 *
 *   order    every kit module a page may name, in the order they must load (paths relative to kit/)
 *   stack3d  modules that run three.js as soon as they load: an engine that does not need them never loads them
 *   injected loaded by boot.js right after core.js; pages do not list them
 *   engines  per presentation method: whether it needs the 3D stack and which engine modules boot.js adds for it
 *   legacy   the engine of a page with no presentation method (the existing film and viewer)
 *   compiler the spec compiler; the engine is decided just before it loads, when the page's own spec is already known
 */
(function (g) {
  'use strict';
  const M = {
    order: ['vendor/three.bundle.js', 'iso.js', 'core.js', 'presentation.js', 'audio.js', 'samples.js', 'sound.js', 'gl.js', 'figure.js', 'parts.js', 'kin.js',
      'enigma.js', 'cube.js', 'deflate.js', 'rar5.js', 'react-reconcile.js', 'spec-core.js', 'workflow-engine.js', 'paper-engine.js', 'paper-mesh.js', 'spec.js'],
    stack3d: ['vendor/three.bundle.js', 'gl.js', 'figure.js', 'parts.js'],
    injected: ['presentation.js'],
    engines: {
      studio: { stack3d: true, modules: [] },
      paper: { stack3d: true, modules: ['paper-engine.js', 'paper-mesh.js'] },      // vector engine, then the mesh adapter that projects the model meshes through three.js
      workflow: { stack3d: false, modules: ['workflow-engine.js'] },
    },
    legacy: 'studio',
    compiler: 'spec.js',
    // object models a spec page names only when its spec uses them
    domain: ['enigma.js', 'cube.js', 'deflate.js', 'rar5.js', 'react-reconcile.js'],
    // kit modules of a declarative spec page (what scripts/new.mjs writes), before the page's own files; domain models are added in order
    specPage: ['vendor/three.bundle.js', 'iso.js', 'core.js', 'samples.js', 'sound.js', 'gl.js', 'figure.js', 'parts.js', 'kin.js', 'spec-core.js'],
  };
  // the kit-relative name of a script URL or path ('../../kit/gl.js', 'file:///.../kit/vendor/three.bundle.js'), or null for a page file
  M.kitName = (src) => { const m = /(?:^|\/)kit\/([^?#]+)/.exec(String(src).replace(/\\/g, '/')); return m && M.order.includes(m[1]) ? m[1] : null; };
  // the kit modules of a declarative page that uses these domain models, in load order
  M.pageModules = (domain = []) => M.order.filter((f) => M.specPage.includes(f) || domain.includes(f));
  // the engine a page will run: the URL wins, then spec.presentation (same rule as MX.presentation.resolve); none means the legacy film
  M.engineFor = (query, spec, presentation) => {
    try { const c = presentation.resolve(query, spec || {}); return c.enabled ? c.method : M.legacy; } catch (e) { return M.legacy; }      // an invalid method is reported by the compiler, as before
  };
  // the kit modules a page loads for an engine: its listed modules minus the 3D stack when the engine does not need it, plus the injected and engine modules
  M.modulesFor = (engine, listed) => {
    const e = M.engines[engine], set = new Set(listed.filter((f) => e.stack3d || !M.stack3d.includes(f)).concat(M.injected, e.modules));
    return M.order.filter((f) => set.has(f));
  };
  g.MX_MANIFEST = M;
})(typeof window !== 'undefined' ? window : globalThis);
