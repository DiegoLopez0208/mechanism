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

  // GTAOPass creates its denoiser's simplex-noise texture with Math.random at
  // construction, not once per rendered frame. Seed only that synchronous
  // texture factory; keep UUIDs unique and leave application randomness alone.
  class RepeatableGTAO extends TH.GTAOPass {
    _generateNoise(...args) {
      const random = Math.random; let seed = 0x6d78616f, texture;
      try {
        Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
        texture = super._generateNoise(...args);
      } finally { Math.random = random; }
      texture.uuid = TH.MathUtils.generateUUID();
      return texture;
    }
  }

  /* ------------------------------------------------------------ estudio de producto */
  // the environment the metal reflects: a dark studio with softboxes, not a grey room. A large key softbox above and in front-left, two tall strips
  // at the sides (rim), a back panel, a faint warm floor bounce. Values above 1 are HDR: PMREM keeps them, so a reflection reads as a bright panel.
  G.studioEnvironment = () => {
    const s = new TH.Scene(), box = new TH.BoxGeometry();
    const room = new TH.Mesh(box, new TH.MeshBasicMaterial({ side: TH.BackSide, color: new TH.Color(0.3, 0.31, 0.33) })); room.scale.set(34, 18, 34); room.position.y = 7; s.add(room);
    const panel = (sx, sy, sz, x, y, z, k, tint) => { const m = new TH.Mesh(box, new TH.MeshBasicMaterial({ color: new TH.Color(tint || '#ffffff').multiplyScalar(k) })); m.scale.set(sx, sy, sz); m.position.set(x, y, z); s.add(m); };
    panel(16, 0.1, 12, -4, 13.5, 4, 5.5, '#fff6ea');    // key softbox, overhead front-left
    panel(20, 9, 0.1, 0, 5, 16.5, 1.25);                // broad front fill, behind the camera: faces turned to the viewer read as lit metal
    panel(0.1, 12, 3, -16.5, 5, -1, 4.0);               // left strip
    panel(0.1, 12, 3, 16.5, 5, -3, 3.2, '#e6eeff');     // right strip, cooler
    panel(16, 3.5, 0.1, 0, 5, -16.5, 2.4);              // back rim panel
    panel(22, 0.1, 22, 0, -1.9, 0, 0.55, '#d9d2c2');    // floor bounce
    return s;
  };

  /* ------------------------------------------------------------ detalle de superficie */
  // Procedural micro-detail in the shader, not a texture: no UVs needed (extrusions, lathes and boxes all get it), resolution independent, the
  // same every frame (no noise seed), and fixed to the part (object space), so it travels with a part that moves or explodes. It varies the
  // roughness (what makes a highlight look machined, cast or moulded), the albedo very slightly, and the normal a little; it fades out where
  // its cells would be smaller than a pixel, so a large object seen whole does not shimmer. Parameters live in material.userData.mxDetail
  // (copied by clone(), unlike onBeforeCompile): [roughness amplitude, cells per mm, stretch along the part's x (brushed < 1), albedo amplitude, bump].
  G.DETAIL = {
    brushed: [0.32, 1.6, 0.035, 0.03, 0.12], cast: [0.3, 0.9, 1, 0.06, 0.35], polished: [0.18, 2.2, 0.08, 0.015, 0.06],
    plastic: [0.22, 2.4, 1, 0.025, 0.12], rubber: [0.16, 3.2, 1, 0.045, 0.3], board: [0.2, 3.6, 1, 0.04, 0.15], paint: [0.14, 1.8, 1, 0.02, 0.05],
  };
  const DETAIL_GLSL = `
varying vec3 vMxPos;
uniform vec4 mxP; uniform float mxBump;
float mxHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mxNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mxHash(i), mxHash(i + vec3(1,0,0)), f.x), mix(mxHash(i + vec3(0,1,0)), mxHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(mxHash(i + vec3(0,0,1)), mxHash(i + vec3(1,0,1)), f.x), mix(mxHash(i + vec3(0,1,1)), mxHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float mxFbm(vec3 p) { return 0.55 * mxNoise(p) + 0.3 * mxNoise(p * 2.03 + 7.1) + 0.15 * mxNoise(p * 4.11 + 3.7); }
`;
  const proto = TH.MeshPhysicalMaterial.prototype, baseKey = proto.customProgramCacheKey;
  proto.customProgramCacheKey = function () { return (this.userData && this.userData.mxDetail ? 'mxd|' : '') + baseKey.call(this); };
  proto.onBeforeCompile = function (shader) {
    const d = this.userData && this.userData.mxDetail; if (!d) return;
    shader.uniforms.mxP = { value: new TH.Vector4(d[0], d[1], d[2], d[3]) }; shader.uniforms.mxBump = { value: d[4] };
    shader.vertexShader = 'varying vec3 vMxPos;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMxPos = position;');
    shader.fragmentShader = DETAIL_GLSL + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec3 mxQ = vMxPos * mxP.y * vec3(mxP.z, 1.0, 1.0);
  float mxFade = clamp(1.6 - 1.4 * length(fwidth(mxQ)), 0.0, 1.0);
  float mxN = mxFbm(mxQ), mxN2 = mxFbm(mxQ * 0.37 + 11.0);
  diffuseColor.rgb *= 1.0 + mxFade * mxP.w * (mxN2 * 2.0 - 1.0);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = clamp(roughnessFactor * (1.0 + mxFade * mxP.x * (mxN * 2.0 - 1.0)), 0.03, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  { float h = mxFade * mxBump * mxN * 0.02; vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, normal), r2 = cross(normal, sx);
    float det = dot(sx, r1); vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2); if (abs(det) > 1e-9) normal = normalize(abs(det) * normal - grad); }`);
  };

  /* ------------------------------------------------------------ escenario */
  // o: { w, h, fov (grados; 0 = ortografica), shadow (opacidad de la sombra en el suelo), floorY, key: [x,y,z],
  //      exposure, ao, bloom, envIntensity, bgInner, bgOuter }
  G.stage = (o) => {
    const W = o.w, H = o.h, FOV = o.fov == null ? 22 : o.fov;
    const scale = o.renderScale == null ? 1 : o.renderScale;
    if (!Number.isFinite(scale) || scale < 1 || scale > 2) throw new Error('stage.renderScale must be between 1 and 2');
    const RW = Math.round(W * scale), RH = Math.round(H * scale);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const renderer = new TH.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
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
    const pm = new TH.PMREMGenerator(renderer); scene.environment = pm.fromScene(o.environment === 'room' ? new TH.RoomEnvironment() : G.studioEnvironment(), 0.035).texture; pm.dispose();
    scene.environmentIntensity = o.envIntensity == null ? 0.74 : o.envIntensity;
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
    const rt = new TH.WebGLRenderTarget(RW, RH, { type: TH.HalfFloatType, samples: 4 });
    const composer = new TH.EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
    composer.addPass(new TH.RenderPass(scene, camera));
    const ao = new RepeatableGTAO(scene, camera, W, H); ao.blendIntensity = o.ao == null ? 1.15 : o.ao;
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
    st.blit = (ctx) => { ctx.drawImage(cv, 0, 0, W, H); };
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
  // detail: a G.DETAIL name (brushed, cast, polished, plastic, rubber, board, paint) or an array; the shader then adds the surface micro-detail
  G.mat = (color, o = {}) => {
    const { detail, ...rest } = o, m = new TH.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.6, metalness: 0 }, rest));
    const d = Array.isArray(detail) ? detail : G.DETAIL[detail]; if (d) m.userData.mxDetail = d.slice();
    return m;
  };
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
