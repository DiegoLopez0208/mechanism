// entry.js - lo que el bundle expone como window.THREE: todo three.js 0.186 mas los complementos que usa el motor.
// Se compila con: node scripts/build-vendor.mjs  ->  kit/vendor/three.bundle.js (un solo archivo, funciona abriendo el HTML con file://)
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
