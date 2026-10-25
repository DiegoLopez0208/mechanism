// build-vendor.mjs - rebuilds kit/vendor/three.bundle.js (three 0.186 + post-processing) from tools/vendor-build,
// and kit/vendor/pathtracer.bundle.js (three-gpu-pathtracer + three-mesh-bvh on the page's window.THREE: three is not duplicated).
//   cd tools/vendor-build && npm install && cd ../.. && node scripts/build-vendor.mjs
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const r = spawnSync(process.execPath, ['tools/vendor-build/node_modules/esbuild/bin/esbuild', 'tools/vendor-build/entry.js', '--bundle', '--format=iife', '--global-name=THREE', '--minify', '--target=es2020', '--outfile=kit/vendor/three.bundle.js'], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
const esbuild = await import(pathToFileURL(path.resolve('tools/vendor-build/node_modules/esbuild/lib/main.js')).href);
// 'three' (exactly) is the page's global; everything else the path tracer imports (three/examples/..., three-mesh-bvh) is bundled
const globalThree = { name: 'global-three', setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: 'three', namespace: 'global-three' })); b.onLoad({ filter: /.*/, namespace: 'global-three' }, () => ({ contents: 'module.exports = window.THREE;', loader: 'js' })); } };
await esbuild.build({ entryPoints: ['tools/vendor-build/entry-pathtracer.js'], bundle: true, format: 'iife', globalName: 'THREE_PT', minify: true, target: 'es2020', outfile: 'kit/vendor/pathtracer.bundle.js', plugins: [globalThree], logLevel: 'warning' });
console.log('built kit/vendor/three.bundle.js and kit/vendor/pathtracer.bundle.js');
