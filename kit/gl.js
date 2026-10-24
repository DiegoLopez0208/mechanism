/*
 * kit/gl.js - 3D stage on three.js 0.186 (kit/vendor/three.bundle.js).
 * Product pipeline: managed colour (sRGB), Neutral tone mapping, studio environment (RoomEnvironment), key light with soft shadows,
 * long-lens perspective camera (or orthographic isometric), 4x MSAA, GTAO ambient occlusion, depth of field (Bokeh), soft bloom
 * and OutputPass. The world uses technical-drawing axes: x to the right, y up in the top view, z up (height);
 * internally three uses X=x, Y=z, Z=-y. The output is composited onto the harness's 2D canvas (MX.run) so labels and dimensions go on top.
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

  // three's SSRPass composes its own (single-sampled) render with the reflections; this layer keeps only the reflections (OUTPUT.SSR, into a
  // private target) and blends them over the composer's multisampled frame, so nothing but the reflections changes
  // The reflections are worked out at half resolution (they are blurred anyway) and the ray march is capped at SSR_STEPS steps (about 480 px of
  // the full frame): three sizes it to the whole diagonal, thousands of steps a pixel, which a software renderer (CI) cannot finish in time.
  const SSR_STEPS = 240;
  class SSRLayer extends TH.SSRPass {
    constructor(o) { super(Object.assign({}, o, { width: Math.round(o.width / 2), height: Math.round(o.height / 2) })); this.output = TH.SSRPass.OUTPUT.SSR; this.layer = new TH.WebGLRenderTarget(this.width, this.height, { type: TH.HalfFloatType }); this.capSteps(); }
    capSteps() { this.ssrMaterial.defines.MAX_STEP = Math.min(SSR_STEPS, this.ssrMaterial.defines.MAX_STEP || SSR_STEPS); this.ssrMaterial.needsUpdate = true; }
    render(renderer, writeBuffer, readBuffer) {
      super.render(renderer, this.layer, readBuffer);
      const cm = this.copyMaterial;
      cm.uniforms.tDiffuse.value = readBuffer.texture; cm.blending = TH.NoBlending; this._renderPass(renderer, cm, writeBuffer);
      cm.uniforms.tDiffuse.value = this.layer.texture; cm.blending = TH.NormalBlending; this._renderPass(renderer, cm, writeBuffer);
    }
    setSize(w, h) { const hw = Math.round(w / 2), hh = Math.round(h / 2); super.setSize(hw, hh); this.layer.setSize(hw, hh); this.capSteps(); }
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
  // ... plus [5] macro amplitude: large, soft variation of the roughness (handling marks, smudges, areas polished by use: cells of about 10 mm),
  // the cue that tells a real object from a perfect render; and [6] edge wear: where the surface turns sharply (screen-space curvature), metal
  // is polished brighter and smoother and paint or plastic is rubbed lighter, as edges are on anything that has been handled
  G.DETAIL = {
    brushed: [0.32, 1.6, 0.035, 0.03, 0.12, 0.34, 0.7], cast: [0.3, 0.9, 1, 0.06, 0.35, 0.28, 0.45], polished: [0.18, 2.2, 0.08, 0.015, 0.06, 0.4, 0.5],
    plastic: [0.22, 2.4, 1, 0.025, 0.12, 0.26, 0.35], rubber: [0.16, 3.2, 1, 0.045, 0.3, 0.16, 0.15], board: [0.2, 3.6, 1, 0.04, 0.15, 0.2, 0.3], paint: [0.14, 1.8, 1, 0.02, 0.05, 0.3, 0.55],
  };
  const DETAIL_GLSL = `
varying vec3 vMxPos;
uniform vec4 mxP; uniform float mxBump; uniform vec2 mxE;
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
    shader.uniforms.mxP = { value: new TH.Vector4(d[0], d[1], d[2], d[3]) }; shader.uniforms.mxBump = { value: d[4] }; shader.uniforms.mxE = { value: new TH.Vector2(d[5] || 0, d[6] || 0) };
    shader.vertexShader = 'varying vec3 vMxPos;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMxPos = position;');
    shader.fragmentShader = DETAIL_GLSL + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec3 mxQ = vMxPos * mxP.y * vec3(mxP.z, 1.0, 1.0);
  float mxFade = clamp(1.6 - 1.4 * length(fwidth(mxQ)), 0.0, 1.0);
  float mxN = mxFbm(mxQ), mxN2 = mxFbm(mxQ * 0.37 + 11.0);
  float mxM = mxFbm(vMxPos * mxP.y * 0.06 + 3.3);      // macro: about 10 mm cells, never fades (it is larger than a pixel at any zoom)
  float mxEdge = 0.0;
  #ifndef FLAT_SHADED
    mxEdge = smoothstep(0.06, 0.32, length(fwidth(normalize(vNormal)))) * mxE.y;
  #endif
  diffuseColor.rgb *= 1.0 + mxFade * mxP.w * (mxN2 * 2.0 - 1.0) + 0.05 * mxE.x * (mxM * 2.0 - 1.0) + 0.14 * mxEdge;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = clamp(roughnessFactor * (1.0 + mxFade * mxP.x * (mxN * 2.0 - 1.0)) * (1.0 + mxE.x * (mxM * 2.0 - 1.0)) * (1.0 - 0.55 * mxEdge), 0.03, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  { float h = mxFade * mxBump * mxN * 0.02; vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, normal), r2 = cross(normal, sx);
    float det = dot(sx, r1); vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2); if (abs(det) > 1e-9) normal = normalize(abs(det) * normal - grad); }`);
  };

  /* ------------------------------------------------------------ escenario */
  // o: { w, h, fov (degrees; 0 = orthographic), shadow (opacity of the floor shadow), floorY, key: [x,y,z],
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
    // tone map: 'agx-punchy' (the default) is AgX, which rolls bright highlights off like a photograph, with Blender's Punchy look giving back the
    // saturation and contrast AgX takes away; 'agx' is plain AgX; 'neutral' (the look up to 0.10) keeps the maker's colours exactly
    const tmap = o.toneMap || (MX.THEME.gl && MX.THEME.gl.toneMap) || 'agx-punchy';
    renderer.toneMapping = tmap === 'neutral' ? TH.NeutralToneMapping : TH.AgXToneMapping;
    renderer.toneMappingExposure = (o.exposure == null ? ((MX.THEME.gl && MX.THEME.gl.exposure) || 1.0) : o.exposure) * (tmap === 'neutral' ? 1 : 1.18);
    const scene = new TH.Scene();
    // background: paper with a soft veil of light (drawn inside the scene so post-processing sees it)
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

    // post-processing: MSAA render in HalfFloat -> GTAO -> Bokeh (optional) -> Bloom -> OutputPass (tone mapping + sRGB)
    const rt = new TH.WebGLRenderTarget(RW, RH, { type: TH.HalfFloatType, samples: 4 });
    const composer = new TH.EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(RW, RH);
    // ssr: screen-space reflections, the metal reflects the parts next to it (not only the studio). As in Eevee it is a reflection LAYER over the
    // normal render: the multisampled render pass (its edges, its floor shadow) stays, and only the reflections, worked out by three's SSRPass
    // (which renders the scene again for colour, normals and metalness), are blended on top of it
    composer.addPass(new TH.RenderPass(scene, camera));
    let ssr = null;
    // on by default in renders (render.mjs opens the page with ?render=1); live viewers and the site keep their speed unless asked (?ssr=1).
    // A software renderer (SwiftShader, llvmpipe: CI, a machine with no GPU) leaves it off: there compiling its shader alone outlasts the browser
    // watchdog, and nobody watches those frames for reflections
    const glx = renderer.getContext(), dri = glx.getExtension('WEBGL_debug_renderer_info'), software = /swiftshader|llvmpipe|software/i.test(String(glx.getParameter(dri ? dri.UNMASKED_RENDERER_WEBGL : glx.RENDERER)));
    const ssrOn = o.ssr != null ? o.ssr : !software && typeof location !== 'undefined' && new URLSearchParams(location.search).get('render') === '1';
    if (ssrOn && !(o.pathtrace > 0)) {
      ssr = new SSRLayer({ renderer, scene, camera, width: RW, height: RH, selects: null });
      Object.assign(ssr, { thickness: 0.018, maxDistance: 140, opacity: 0.6, fresnel: true, distanceAttenuation: true, bouncing: false, blur: true, infiniteThick: false });
      composer.addPass(ssr);
    }
    const ao = new RepeatableGTAO(scene, camera, W, H); ao.blendIntensity = o.ao == null ? 1.15 : o.ao;
    ao.updateGtaoMaterial({ radius: 7, distanceExponent: 1.4, thickness: 4, scale: 2.2, samples: 24, distanceFallOff: 1.2, screenSpaceRadius: false });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); composer.addPass(ao);
    const bokeh = new TH.BokehPass(scene, camera, { focus: 600, aperture: 0, maxblur: 0.01 }); bokeh.enabled = false; composer.addPass(bokeh);
    const bloom = new TH.UnrealBloomPass(new TH.Vector2(W, H), o.bloom == null ? (TG.bloom != null ? TG.bloom : (night ? 0.035 : 0.12)) : o.bloom, 0.45, TG.thr || (night ? 0.985 : 0.92)); composer.addPass(bloom);
    composer.addPass(new TH.OutputPass());
    if (tmap === 'agx-punchy') composer.addPass(new TH.ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); vec3 s = mix(vec3(l), c.rgb, 1.28); s = (s - 0.5) * 1.08 + 0.5; gl_FragColor = vec4(clamp(s, 0.0, 1.0), c.a); }' }));
    const st = { renderer, scene, camera, composer, canvas: cv, floor, key, fill, rim, ao, bokeh, bloom, view: null, W, H, fov: FOV, aoSkip: [] };

    // view: yaw (0 = looking at the y-min edge, 90 = looking at the x-max edge), pitch (0 = elevation, 90 = plan), zoom (px per mm at the target plane),
    // target t and its screen position (cx, cy); dof: blur aperture (0 = all sharp), focus: distance to the sharp plane (the target by default)
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
    // world point (plan x,y,z) -> screen pixel
    st.project = (x, y, z) => { const q = G.v(x, y, z).project(camera); return [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H]; };
    // ambient occlusion ignores dimmed parts (otherwise a translucent ghost would cast shadow as if it were solid)
    const aoRender = ao.render.bind(ao);
    ao.render = function (...args) { const hidden = []; st.aoSkip.forEach((o2) => { if (o2.visible) { o2.visible = false; hidden.push(o2); } }); aoRender(...args); hidden.forEach((o2) => { o2.visible = true; }); };
    // only metal reflects (the shadow floor and the dielectrics would otherwise mirror the object); the list is taken at the first render, when
    // the parts exist, and kept (a part that is hidden is not drawn, so it reflects nothing)
    st.ssr = ssr;
    // pathtrace: N samples of a real path tracer (three-gpu-pathtracer, loaded by kit/boot.js with ?pathtrace) instead of the raster pipeline, for
    // stills: light bounces between parts, soft shadows and reflections come out of the physics. The environment is the same studio (as a cube
    // map); the frame is composed over the page's background.
    // PT_DIM: below this opacity a part is dimmed by a tour stop (about 0.01) and left out; an x-ray part (0.1 to 0.55) stays
    const PT_METAL_ROUGH = 0.2, PT_DIM = 0.05;
    const dimmedPart = (m) => { const mt = Array.isArray(m.material) ? m.material[0] : m.material; return mt.transparent && mt.opacity < PT_DIM; };
    let pt = null, ptEnv = null; const ptBg = new TH.Scene(); ptBg.background = scene.background;
    const xrayPart = (m) => { const mt = Array.isArray(m.material) ? m.material[0] : m.material; return mt.transparent && !mt.depthWrite && !dimmedPart(m); };
    // over the path-traced image, one raster pass draws what the path tracer cannot: the shadow on the floor (the shadow catcher it lacks), the
    // line overlays (dashed estimate boxes, leaders) and the x-ray parts, with their own material as in a film. The traced parts are drawn as
    // depth only (invisible, but they cast the shadow and hide what is behind)
    const depthOnly = new TH.MeshBasicMaterial({ colorWrite: false });
    let ptLayer = null;      // during a run: the x-ray parts the raster pass draws, and the raster environment they are lit by
    // a part dimmed (nearly transparent: the rest of the object during a tour stop) is left out: it would hide the lines and cast a ghost shadow
    const overlay = (r) => {
      const swapped = [], hidden = [], xr = ptLayer ? ptLayer.xray : [], bg = scene.background, env = scene.environment, fl = floor.visible;
      xr.forEach((m) => { m.visible = true; });
      scene.traverse((m) => {
        if (!m.isMesh || m === floor || !m.visible || !m.material || xr.includes(m)) return;
        if (dimmedPart(m)) { m.visible = false; hidden.push(m); } else { swapped.push([m, m.material]); m.material = depthOnly; }
      });
      scene.background = null; scene.environment = ptLayer ? ptLayer.env : null; floor.visible = true;
      try { r.clearDepth(); r.render(scene, camera); } finally { swapped.forEach(([m, mt]) => { m.material = mt; }); hidden.forEach((m) => { m.visible = true; }); xr.forEach((m) => { m.visible = false; }); scene.background = bg; scene.environment = env; floor.visible = fl; }
    };
    st.pathTrace = (samples) => {
      if (!g.THREE_PT) throw new Error('pathtrace: kit/vendor/pathtracer.bundle.js is not loaded (open the page with ?pathtrace)');
      if (!pt) {
        pt = new g.THREE_PT.WebGLPathTracer(renderer); Object.assign(pt, { renderDelay: 0, minSamples: 0, fadeDuration: 0, rasterizeScene: false, bounces: 8, filterGlossyFactor: 0.5 }); pt.tiles.set(2, 2);
        // the traced image goes through the same finish as a raster frame (depth of field, bloom, tone map, Punchy): it takes the place of the
        // render, reflection and ambient-occlusion passes (the path tracer does all three), drawn linear into the composer's buffer
        pt.renderToCanvasCallback = (target, r, quad) => {
          const passes = composer.passes, off = passes.slice(0, passes.indexOf(bokeh)).filter((p) => p.enabled);
          const traced = { enabled: true, needsSwap: true, clear: false, renderToScreen: false, setSize() {}, render: (rr, writeBuffer) => {
            rr.setRenderTarget(writeBuffer); const ac = rr.autoClear; rr.autoClear = false; rr.clear(); rr.render(ptBg, camera);
            quad.material.transparent = true; quad.material.blending = TH.NormalBlending; quad.render(rr); overlay(rr); rr.autoClear = ac;
          } };
          off.forEach((p) => { p.enabled = false; }); passes.unshift(traced);
          try { composer.render(); } finally { passes.shift(); off.forEach((p) => { p.enabled = true; }); }
        };
        const crt = new TH.WebGLCubeRenderTarget(512, { type: TH.HalfFloatType }); new TH.CubeCamera(0.1, 100, crt).update(renderer, G.studioEnvironment()); ptEnv = crt.texture;
      }
      // asynchronous, a few samples at a time with a pause between them: one long burst of GPU work loses the WebGL context (the driver's timeout).
      // MX.run's __frame waits for st.ptPending and draws the frame again with st.ptHold set, which keeps the accumulated image on the canvas.
      // a new call (the page draws once on load, then the frame asked for) cancels the run before it and puts the scene back first: two runs at once
      // would sample together, and the second would take the parts the first had hidden for invisible
      if (st.ptRestore) st.ptRestore();
      const run = st.ptRun = (st.ptRun || 0) + 1;
      const bg = scene.background, env = scene.environment, fl = floor.visible;
      scene.background = null; scene.environment = ptEnv; floor.visible = false;
      // the dimmed parts are left out of the traced scene too: nearly invisible on screen, they still show in a mirror and cost BVH and samples
      const dimmed = []; scene.traverse((m) => { if (m.isMesh && m.visible && m.material && dimmedPart(m)) { m.visible = false; dimmed.push(m); } });
      // the WebGL path tracer has no instancing: an InstancedMesh (Enigma's contact pins) is traced as one plain mesh per instance, for the run
      const inst = [], copies = []; scene.traverse((m) => { if (m.isInstancedMesh && m.visible && m.parent) inst.push(m); });
      inst.forEach((im) => { for (let i = 0; i < im.count; i++) { const c = new TH.Mesh(im.geometry, im.material); c.matrixAutoUpdate = false; im.getMatrixAt(i, c.matrix); c.matrix.premultiply(im.matrix); c.castShadow = im.castShadow; im.parent.add(c); copies.push(c); } im.visible = false; });
      // an x-ray part (transparent, no depth write) is left to the raster pass on top, with its own material: traced, it lost what was behind it
      // (a ray through it to the page's background comes back with alpha 0) and it covered twice (once per face it crosses)
      const xray = []; scene.traverse((m) => { if (m.isMesh && m.visible && m.material && xrayPart(m)) { m.visible = false; xray.push(m); } });
      ptLayer = { xray, env };
      // a metal gets a roughness floor: seen at a grazing angle, a near-mirror loses most of its reflection in the path tracer's sampler and its side
      // walls come out black; the raster adds micro roughness in the shader (G.DETAIL), so the floor keeps the two looks alike
      const rough = []; scene.traverse((m) => { const mt = m.isMesh && m.visible && m.material; if (mt && !Array.isArray(mt) && mt.metalness >= 0.5 && mt.roughness < PT_METAL_ROUGH) { rough.push([mt, mt.roughness]); mt.roughness = PT_METAL_ROUGH; } });
      st.ptRestore = () => { st.ptRestore = null; scene.background = bg; scene.environment = env; floor.visible = fl; dimmed.forEach((m) => { m.visible = true; }); rough.forEach(([mt, r]) => { mt.roughness = r; }); xray.forEach((m) => { m.visible = true; }); ptLayer = null; copies.forEach((c) => c.removeFromParent()); inst.forEach((im) => { im.visible = true; }); };
      pt.setScene(scene, camera); pt.reset();
      st.ptPending = (async () => {
        try {
          for (let i = 0; i < 2400 && pt.isCompiling && run === st.ptRun; i++) await new Promise((r) => setTimeout(r, 25));
          let guard = 0; while (run === st.ptRun && pt.samples < samples && guard++ < samples * 8) { pt.renderSample(); renderer.getContext().finish(); await new Promise((r) => setTimeout(r, 0)); }
        } finally { if (run === st.ptRun && st.ptRestore) st.ptRestore(); }
      })();
    };
    if (o.pathtrace > 0) g.__ptStage = st;
    st.render = () => {
      if (o.pathtrace > 0) { if (!st.ptHold) st.pathTrace(o.pathtrace); return; }
      if (ssr && !ssr.selects) { const sel = []; scene.traverse((m) => { if (m.isMesh && m !== floor && m.material && !Array.isArray(m.material) && m.material.metalness >= 0.5) sel.push(m); }); ssr.selects = sel; }
      composer.render();
    };
    st.blit = (ctx) => { ctx.drawImage(cv, 0, 0, W, H); };
    // Native viewport export: fits 3D bounds, without cropping a portrait film.
    // Its product renderer leaves the legacy camera and composer untouched.
    let studyRenderer, studyEnvironment, studyCanvas, studyCamera;
    const studyClones = new WeakMap();
    const syncStudyObject = source => {
      let copy = studyClones.get(source);
      if (!copy) { copy = source.clone(false); studyClones.set(source, copy); }
      copy.position.copy(source.position); copy.quaternion.copy(source.quaternion); copy.scale.copy(source.scale);
      copy.matrixAutoUpdate = source.matrixAutoUpdate; copy.matrix.copy(source.matrix); copy.matrixWorldNeedsUpdate = true;
      copy.visible = source.visible; copy.layers.mask = source.layers.mask; copy.renderOrder = source.renderOrder;
      copy.castShadow = source.castShadow; copy.receiveShadow = source.receiveShadow; copy.frustumCulled = source.frustumCulled;
      if (source.geometry) copy.geometry = source.geometry;
      if (source.material) copy.material = source.material;
      if (source.isLight) {
        copy.color.copy(source.color); copy.intensity = source.intensity;
        if (source.target) {
          copy.target.position.setFromMatrixPosition(source.target.matrixWorld); copy.target.updateMatrixWorld(true);
        }
      }
      const children = source.children.map(syncStudyObject);
      for (const child of [...copy.children]) if (!children.includes(child)) copy.remove(child);
      for (const child of children) if (child.parent !== copy) copy.add(child);
      copy.children = children;
      return copy;
    };
    st.studyImage = (bounds, width, height, liveBounds = bounds) => {
      if (!bounds || bounds.isEmpty()) throw new Error('Studio study needs nonempty bounds');
      if (!(width > 0 && height > 0)) throw new Error('Studio study needs a positive viewport');
      if (o.pathtrace > 0) throw new Error('Study view currently uses the raster pipeline');
      // Keep the legacy composer and its default framebuffer completely owned
      // by the film. The study uses deterministic 2x spatial supersampling.
      if (!studyRenderer) {
        studyRenderer = new TH.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
        studyRenderer.setPixelRatio(1); studyRenderer.outputColorSpace = TH.SRGBColorSpace;
        studyRenderer.toneMapping = TH.NeutralToneMapping; studyRenderer.toneMappingExposure = 1;
        studyRenderer.shadowMap.enabled = true; studyRenderer.shadowMap.type = TH.PCFSoftShadowMap;
        const pmrem = new TH.PMREMGenerator(studyRenderer);
        studyEnvironment = pmrem.fromScene(G.studioEnvironment()); pmrem.dispose();
      }
      if (studyRenderer.getContext().isContextLost()) throw new Error('Studio study WebGL context was lost');
      const targetWidth = width * 2, targetHeight = height * 2;
      const size = studyRenderer.getSize(new TH.Vector2());
      if (size.x !== targetWidth || size.y !== targetHeight) studyRenderer.setSize(targetWidth, targetHeight, false);
      // Three caches transmission targets per camera. Reuse its identity across
      // frames instead of allocating a new camera and GPU target every time.
      const cam = studyCamera || (studyCamera = camera.clone()); cam.copy(camera);
      const center = bounds.getCenter(new TH.Vector3());
      const inverse = cam.quaternion.clone().invert(), corners = [];
      if (bounds.studyPoints?.length) corners.push(...bounds.studyPoints.map(p => p.clone().sub(center).applyQuaternion(inverse)));
      else for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) corners.push(new TH.Vector3(x, y, z).sub(center).applyQuaternion(inverse));
      }
      const aspect = width / height, margin = .10, inner = 1 - 2 * margin;
      const direction = new TH.Vector3(0, 0, 1).applyQuaternion(cam.quaternion);
      let distance = 600;
      if (cam.isPerspectiveCamera) {
        const tanY = Math.tan(cam.fov * rad / 2), tanX = tanY * aspect;
        distance = Math.max(...corners.map(p => p.z + Math.max(Math.abs(p.x) / tanX, Math.abs(p.y) / tanY) / inner)) + 1;
        cam.aspect = aspect; cam.clearViewOffset();
      } else {
        const extent = Math.max(...corners.map(p => Math.max(Math.abs(p.y), Math.abs(p.x) / aspect))) / inner;
        cam.left = -extent * aspect; cam.right = extent * aspect; cam.top = extent; cam.bottom = -extent;
      }
      cam.near = .1; cam.far = distance + bounds.getSize(new TH.Vector3()).length() + 1000;
      cam.position.copy(center).addScaledVector(direction, distance);
      cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
      // Reuse model geometry/materials while keeping renderer-owned light and
      // shadow state isolated from the legacy compositor.
      const productScene = syncStudyObject(scene);
      productScene.environment = studyEnvironment.texture;
      studyRenderer.render(productScene, cam);
      if (studyRenderer.getContext().isContextLost()) throw new Error('Studio study WebGL context was lost while rendering');
      const image = studyCanvas || (studyCanvas = document.createElement('canvas'));
      if (image.width !== width || image.height !== height) { image.width = width; image.height = height; }
      const context = image.getContext('2d', { alpha: false, willReadFrequently: true });
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      context.drawImage(studyRenderer.domElement, 0, 0, width, height);
      const projectRange = points => {
        const projected = points.map(p => p.clone().project(cam));
        return projected.length ? [0, 1].map(end => ['x', 'y', 'z'].map(axis => end
          ? Math.max(...projected.map(p => p[axis])) : Math.min(...projected.map(p => p[axis])))) : [];
      };
      st.studyDiagnostics = { viewport: [width, height], margin, renderer: 'studio-native-product',
        resources: { study: { ...studyRenderer.info.memory }, native: { ...renderer.info.memory },
          programs: studyRenderer.info.programs.length, heap: performance.memory?.usedJSHeapSize || null },
        toneMapping: 'neutral', postprocessing: false,
        bounds: projectRange(corners.map(p => p.clone().applyQuaternion(cam.quaternion).add(center))),
        liveBounds: projectRange(liveBounds.studyPoints || []) };
      return image;
    };
    st.disposeStudy = () => {
      studyRenderer?.dispose(); studyEnvironment?.dispose();
      if (studyCanvas) { studyCanvas.width = 1; studyCanvas.height = 1; }
      studyRenderer = null; studyEnvironment = null; studyCanvas = null; studyCamera = null;
    };
    return st;
  };

  /* ------------------------------------------------------------ geometria y texturas */
  // box with bevelled edges: w (x), d (plan y), h (height); centred on x,z and resting on y=0 (top)
  G.rbox = (w, d, h, r = 0.25) => {
    r = Math.max(0.02, Math.min(r, w / 2 - 0.01, d / 2 - 0.01, h / 2 - 0.01));
    const s = new TH.Shape(), x = w / 2 - r, y = d / 2 - r; s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
    const dep = Math.max(0.001, h - 2 * r);
    const geo = new TH.ExtrudeGeometry(s, { depth: dep, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelOffset: 0, bevelSegments: 4, curveSegments: 1 });
    geo.translate(0, 0, -dep / 2 + h / 2); geo.rotateX(-Math.PI / 2); return geo;     // rests on y=0 up to y=h
  };
  G.canvasTex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); fn(x, w, h); const t = new TH.CanvasTexture(c); t.anisotropy = 8; t.colorSpace = TH.SRGBColorSpace; return t; };
  // material fisico: acepta cualquier parametro de MeshPhysicalMaterial (clearcoat, transmission, ior, thickness, iridescence, anisotropy, sheen...)
  // detail: a G.DETAIL name (brushed, cast, polished, plastic, rubber, board, paint) or an array; the shader then adds the surface micro-detail
  G.mat = (color, o = {}) => {
    const { detail, ...rest } = o, m = new TH.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.6, metalness: 0 }, rest));
    const d = Array.isArray(detail) ? detail : G.DETAIL[detail]; if (d) m.userData.mxDetail = d.slice();
    return m;
  };
  // glass with real transmission (refracts what is behind it); thickness in mm
  G.glass = (tint, o = {}) => new TH.MeshPhysicalMaterial(Object.assign({ color: tint || '#ffffff', roughness: 0.04, metalness: 0, transmission: 1, ior: 1.5, thickness: 1.2, attenuationColor: tint || '#ffffff', attenuationDistance: 40, specularIntensity: 1, clearcoat: 0.3 }, o));
  // flat sheet on a face. face: 'top' | 'px' (x+ face) | 'pz' (face towards the y-min edge). pos: [x, y, z] local to the part (three's world)
  G.decal = (face, w, h, mat, pos) => {
    const m = new TH.Mesh(new TH.PlaneGeometry(w, h), mat);
    if (face === 'top') m.rotation.x = -Math.PI / 2; else if (face === 'px') m.rotation.y = Math.PI / 2;
    m.position.set(pos[0], pos[1], pos[2]); m.renderOrder = 2; return m;
  };
  G.flatMat = (map, color) => new TH.MeshStandardMaterial({ map: map || null, color: color || '#ffffff', transparent: true, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
  G.shadows = (obj, cast = true, recv = true) => { obj.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } }); return obj; };
  G.dispose = (st) => { st.composer.dispose(); st.renderer.dispose(); };
})(typeof window !== 'undefined' ? window : globalThis);
