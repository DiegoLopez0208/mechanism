// entry-pathtracer.js - the path tracer, as window.THREE_PT: three-gpu-pathtracer (and three-mesh-bvh) over the page's own window.THREE.
// Built by node scripts/build-vendor.mjs -> kit/vendor/pathtracer.bundle.js. Only loaded for path-traced stills (render.mjs --pathtrace).
export { WebGLPathTracer, GradientEquirectTexture } from 'three-gpu-pathtracer';
