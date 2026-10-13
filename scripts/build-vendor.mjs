// build-vendor.mjs - reconstruye kit/vendor/three.bundle.js (three 0.186 + postprocesado) desde tools/vendor-build.
//   cd tools/vendor-build && npm install && cd ../.. && node scripts/build-vendor.mjs
import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, ['tools/vendor-build/node_modules/esbuild/bin/esbuild', 'tools/vendor-build/entry.js', '--bundle', '--format=iife', '--global-name=THREE', '--minify', '--target=es2020', '--outfile=kit/vendor/three.bundle.js'], { stdio: 'inherit' });
process.exit(r.status || 0);
