// entry.js - what the bundle exposes as window.THREE: all of three.js 0.186 plus the add-ons the engine uses.
// Built with: node scripts/build-vendor.mjs  ->  kit/vendor/three.bundle.js (a single file, works when the HTML is opened with file://)
export * from 'three';
export { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
export { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
export { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
export { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
export { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
export { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
export { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
export { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
export { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
export { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
export { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
export { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export { SSRPass } from 'three/examples/jsm/postprocessing/SSRPass.js';
