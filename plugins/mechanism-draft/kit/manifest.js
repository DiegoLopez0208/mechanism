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
    order: ['vendor/three.bundle.js', 'iso.js', 'core.js', 'presentation.js', 'geom2d.js', 'audio.js', 'samples.js', 'sound.js', 'gl.js', 'figure.js', 'parts.js', 'kin.js',
      'enigma.js', 'cube.js', 'deflate.js', 'rar5.js', 'react-reconcile.js', 'spec-core.js', 'workflow-engine.js', 'paper-engine.js', 'paper-mesh.js', 'spec.js'],
    stack3d: ['vendor/three.bundle.js', 'gl.js', 'figure.js', 'parts.js'],
    // geom2d.js is pure math the gate needs for any spec with 2D drawing parts, whatever the engine (no DOM, no three.js)
    injected: ['presentation.js', 'geom2d.js'],
    engines: {
      studio: { stack3d: true, modules: [] },
      // vector engine, then the mesh adapter that projects the model meshes through three.js; a spec with a vector scene
      // Paper draws natively needs neither the stack nor the adapter (see vectorScene below)
      paper: { stack3d: true, modules: ['paper-engine.js', 'paper-mesh.js'], vector: { stack3d: false, modules: ['paper-engine.js'] } },
      workflow: { stack3d: false, modules: ['workflow-engine.js'] },
    },
    // the vector scene kinds Paper draws without any 3D model (spec.paperScene.kind); the only list of them: kit/paper-engine.js
    // implements exactly these (MX.paperEngine.scenes) and tests/manifest.test.mjs checks the two match
    paperScenes: ['pin-section'],
    // vector paths that give Paper a view set made from declared 2D geometry (kit/geom2d.js viewSet), not from meshes
    paperViewSets: ['geometry'],
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
  // does this spec carry a vector scene Paper draws natively (a scene, or declared 2D geometry)? An unknown kind is not one: it goes through the meshes
  M.vectorScene = (spec) => !!(spec && spec.paperScene && (M.paperScenes.includes(spec.paperScene.kind) || M.paperViewSets.includes(spec.paperScene.kind)));
  // what an engine needs for this spec: { stack3d, modules }
  M.needsFor = (engine, spec) => { const e = M.engines[engine]; return engine === 'paper' && M.vectorScene(spec) ? e.vector : e; };
  // the kit modules a page loads for an engine and spec: its listed modules minus the 3D stack when not needed, plus the injected and engine modules
  M.modulesFor = (engine, listed, spec) => {
    const e = M.needsFor(engine, spec), set = new Set(listed.filter((f) => e.stack3d || !M.stack3d.includes(f)).concat(M.injected, e.modules));
    return M.order.filter((f) => set.has(f));
  };
  g.MX_MANIFEST = M;
})(typeof window !== 'undefined' ? window : globalThis);
