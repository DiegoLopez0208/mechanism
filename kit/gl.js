/*
 * kit/gl.js - escenario 3D sobre three.js 0.186 (kit/vendor/three.bundle.js).
 * Pipeline de producto: color gestionado (sRGB), tone mapping Neutral, entorno de estudio (RoomEnvironment), luz principal con sombras suaves,
 * camara en perspectiva de focal larga (o isometrica ortografica), MSAA 4x, oclusion ambiental GTAO, profundidad de campo (Bokeh), bloom suave
 * y OutputPass. El mundo usa los ejes del plano tecnico: x a la derecha, y hacia arriba en la vista superior, z hacia arriba (altura);
 * internamente three usa X=x, Y=z, Z=-y. La salida se compone sobre el canvas 2D del arnes (MX.run) para dibujar etiquetas y cotas encima.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), TH = g.THREE, G = (MX.gl = {});
  const rad = Math.PI / 180;
  G.v = (x, y, z) => new TH.Vector3(x, z, -y);
  TH.ColorManagement.enabled = true;

  /* ------------------------------------------------------------ escenario */
  // o: { w, h, fov (grados; 0 = ortografica), shadow (opacidad de la sombra en el suelo), floorY, key: [x,y,z],
  //      exposure, ao, bloom, envIntensity, bgInner, bgOuter }
  G.stage = (o) => {
    const W = o.w, H = o.h, FOV = o.fov == null ? 22 : o.fov;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const renderer = new TH.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = TH.PCFSoftShadowMap;
    renderer.toneMapping = TH.NeutralToneMapping; renderer.toneMappingExposure = o.exposure == null ? ((MX.THEME.gl && MX.THEME.gl.exposure) || 1.0) : o.exposure;
    const scene = new TH.Scene();
    // fondo: papel con un velo de luz suave (se dibuja dentro de la escena para que el posprocesado lo vea)
    const TG = MX.THEME.gl || {}, night = !!MX.THEME.dark;
    const bgc = document.createElement('canvas'); bgc.width = TG.grid ? W : 512; bgc.height = TG.grid ? H : 640; const bx = bgc.getContext('2d'), gr = bx.createRadialGradient(bgc.width / 2, 270 * bgc.height / 640, 40 * bgc.height / 640, bgc.width / 2, 300 * bgc.height / 640, 520 * bgc.height / 640);
    gr.addColorStop(0, o.bgInner || TG.inner || (night ? '#2b2f3a' : '#faf9f5')); gr.addColorStop(1, o.bgOuter || TG.outer || (night ? '#090a0e' : '#dedbd1')); bx.fillStyle = gr; bx.fillRect(0, 0, bgc.width, bgc.height);
    if (TG.glow) { const gc = TG.glow === 'accent' ? MX.THEME.teal : TG.glow, rg = bx.createRadialGradient(bgc.width * 0.5, bgc.height * 0.46, 10, bgc.width * 0.5, bgc.height * 0.46, bgc.height * 0.46); rg.addColorStop(0, MX.rgba(gc, TG.glowA || 0.34)); rg.addColorStop(1, MX.rgba(gc, 0)); bx.fillStyle = rg; bx.fillRect(0, 0, bgc.width, bgc.height); }
    if (TG.grid) { const gp = TG.grid.px, n = TG.grid.every || 5; for (let i = 0, x = 0; x <= bgc.width; x += gp, i++) { bx.strokeStyle = i % n ? TG.grid.minor : TG.grid.major; bx.lineWidth = i % n ? 1 : 1.4; bx.beginPath(); bx.moveTo(x + 0.5, 0); bx.lineTo(x + 0.5, bgc.height); bx.stroke(); } for (let j = 0, y = 0; y <= bgc.height; y += gp, j++) { bx.strokeStyle = j % n ? TG.grid.minor : TG.grid.major; bx.lineWidth = j % n ? 1 : 1.4; bx.beginPath(); bx.moveTo(0, y + 0.5); bx.lineTo(bgc.width, y + 0.5); bx.stroke(); } }
    const bgt = new TH.CanvasTexture(bgc); bgt.colorSpace = TH.SRGBColorSpace; scene.background = bgt;
    const pm = new TH.PMREMGenerator(renderer); scene.environment = pm.fromScene(new TH.RoomEnvironment(), 0.04).texture; pm.dispose();
    scene.environmentIntensity = o.envIntensity == null ? 0.6 : o.envIntensity;
    const camera = FOV > 0 ? new TH.PerspectiveCamera(FOV, W / H, 10, 4000) : new TH.OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
    scene.add(new TH.HemisphereLight('#ffffff', '#d8d3c4', 0.28));
    const key = new TH.DirectionalLight('#fff1e0', 2.3), kp = o.key || [-60, 170, 110];
    key.position.set(kp[0], kp[1], kp[2]); key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.radius = 6; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.04;
    Object.assign(key.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 1, far: 700 }); scene.add(key);
    const fill = new TH.DirectionalLight('#cfe0ff', 0.3); fill.position.set(90, 50, -70); scene.add(fill);
    const rim = new TH.DirectionalLight('#ffffff', 0.3); rim.position.set(30, 60, -160); scene.add(rim);
    if (TG.rimColor) { rim.color.set(TG.rimColor === 'accent' ? MX.THEME.teal : TG.rimColor); rim.intensity = TG.rimK || 1.2; }
    const floor = new TH.Mesh(new TH.PlaneGeometry(1200, 1200), new TH.ShadowMaterial({ opacity: (o.shadow == null ? 0.2 : o.shadow) * (TG.floorK || (night ? 3.2 : 1)), color: TG.floor || (night ? '#000000' : '#2a2418') }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = o.floorY == null ? -14 : o.floorY; floor.receiveShadow = true; scene.add(floor);

    // posprocesado: render con MSAA en HalfFloat -> GTAO -> Bokeh (opcional) -> Bloom -> OutputPass (tone mapping + sRGB)
    const rt = new TH.WebGLRenderTarget(W, H, { type: TH.HalfFloatType, samples: 4 });
    const composer = new TH.EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
    composer.addPass(new TH.RenderPass(scene, camera));
    const ao = new TH.GTAOPass(scene, camera, W, H); ao.blendIntensity = o.ao == null ? 1.15 : o.ao;
    ao.updateGtaoMaterial({ radius: 7, distanceExponent: 1.4, thickness: 4, scale: 2.2, samples: 24, distanceFallOff: 1.2, screenSpaceRadius: false });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); composer.addPass(ao);
    const bokeh = new TH.BokehPass(scene, camera, { focus: 600, aperture: 0, maxblur: 0.01 }); bokeh.enabled = false; composer.addPass(bokeh);
    const bloom = new TH.UnrealBloomPass(new TH.Vector2(W, H), o.bloom == null ? (TG.bloom != null ? TG.bloom : (night ? 0.035 : 0.12)) : o.bloom, 0.45, TG.thr || (night ? 0.985 : 0.92)); composer.addPass(bloom);
    composer.addPass(new TH.OutputPass());
    const st = { renderer, scene, camera, composer, canvas: cv, floor, key, fill, rim, ao, bokeh, bloom, view: null, W, H, fov: FOV, aoSkip: [] };

    // vista: yaw (0 = mirando el borde y-min, 90 = mirando el borde x-max), pitch (0 = elevacion, 90 = planta), zoom (px por mm en el plano del blanco),
    // blanco t y su posicion en pantalla (cx, cy); dof: apertura del desenfoque (0 = todo nitido), focus: distancia al plano nitido (por defecto el blanco)
    st.setView = (v) => {
      st.view = v; const p = Math.min(v.pitch, 89.9) * rad, y = v.yaw * rad, S = v.zoom, cx = v.cx == null ? W / 2 : v.cx, cy = v.cy == null ? H / 2 : v.cy, t = G.v(v.tx || 0, v.ty || 0, v.tz || 0);
      let d = 600;
      if (FOV > 0) {
        d = H / (2 * S * Math.tan(FOV * rad / 2)); camera.near = Math.max(5, d - 500); camera.far = d + 900; camera.fov = FOV; camera.aspect = W / H;
        camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
      } else { camera.left = -cx / S; camera.right = (W - cx) / S; camera.top = cy / S; camera.bottom = -(H - cy) / S; }
      camera.updateProjectionMatrix();
      camera.position.set(t.x + d * Math.cos(p) * Math.sin(y), t.y + d * Math.sin(p), t.z + d * Math.cos(p) * Math.cos(y));
      camera.up.set(0, 1, 0); camera.lookAt(t); camera.updateMatrixWorld(true);
      const a = v.dof || 0; bokeh.enabled = FOV > 0 && a > 0;
      if (bokeh.enabled) { bokeh.uniforms.focus.value = v.focus == null ? d : v.focus; bokeh.uniforms.aperture.value = a * 1e-4; bokeh.uniforms.maxblur.value = Math.min(0.03, 0.004 + a * 0.004); }
      st.dist = d;
    };
    // punto del mundo (x,y,z del plano) -> pixel de pantalla
    st.project = (x, y, z) => { const q = G.v(x, y, z).project(camera); return [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H]; };
    // la oclusion ambiental ignora las piezas atenuadas (si no, un fantasma translucido proyectaria sombra como si fuese solido)
    const aoRender = ao.render.bind(ao);
    ao.render = function (...args) { const hidden = []; st.aoSkip.forEach((o2) => { if (o2.visible) { o2.visible = false; hidden.push(o2); } }); aoRender(...args); hidden.forEach((o2) => { o2.visible = true; }); };
    st.render = () => composer.render();
    st.blit = (ctx) => { ctx.drawImage(cv, 0, 0); };
    return st;
  };

  /* ------------------------------------------------------------ geometria y texturas */
  // caja con aristas biseladas: w (x), d (y del plano), h (altura); centrada en x,z y apoyada en y=0 (arriba)
  G.rbox = (w, d, h, r = 0.25) => {
    r = Math.max(0.02, Math.min(r, w / 2 - 0.01, d / 2 - 0.01, h / 2 - 0.01));
    const s = new TH.Shape(), x = w / 2 - r, y = d / 2 - r; s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
    const dep = Math.max(0.001, h - 2 * r);
    const geo = new TH.ExtrudeGeometry(s, { depth: dep, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelOffset: 0, bevelSegments: 4, curveSegments: 1 });
    geo.translate(0, 0, -dep / 2 + h / 2); geo.rotateX(-Math.PI / 2); return geo;     // queda apoyada en y=0 hasta y=h
  };
  G.canvasTex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); fn(x, w, h); const t = new TH.CanvasTexture(c); t.anisotropy = 8; t.colorSpace = TH.SRGBColorSpace; return t; };
  // material fisico: acepta cualquier parametro de MeshPhysicalMaterial (clearcoat, transmission, ior, thickness, iridescence, anisotropy, sheen...)
  G.mat = (color, o = {}) => new TH.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.6, metalness: 0 }, o));
  // vidrio con transmision real (refracta lo que tiene detras); thickness en mm
  G.glass = (tint, o = {}) => new TH.MeshPhysicalMaterial(Object.assign({ color: tint || '#ffffff', roughness: 0.04, metalness: 0, transmission: 1, ior: 1.5, thickness: 1.2, attenuationColor: tint || '#ffffff', attenuationDistance: 40, specularIntensity: 1, clearcoat: 0.3 }, o));
  // lamina plana encima de una cara. face: 'top' | 'px' (cara x+) | 'pz' (cara hacia el borde y-min). pos: [x, y, z] locales de la pieza (mundo three)
  G.decal = (face, w, h, mat, pos) => {
    const m = new TH.Mesh(new TH.PlaneGeometry(w, h), mat);
    if (face === 'top') m.rotation.x = -Math.PI / 2; else if (face === 'px') m.rotation.y = Math.PI / 2;
    m.position.set(pos[0], pos[1], pos[2]); m.renderOrder = 2; return m;
  };
  G.flatMat = (map, color) => new TH.MeshStandardMaterial({ map: map || null, color: color || '#ffffff', transparent: true, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
  G.shadows = (obj, cast = true, recv = true) => { obj.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } }); return obj; };
  G.dispose = (st) => { st.composer.dispose(); st.renderer.dispose(); };
})(typeof window !== 'undefined' ? window : globalThis);
