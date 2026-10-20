#!/usr/bin/env node
// export-svg.mjs - Draft 0.3: an engineering SVG of every 2D drawing part of a spec, with no browser (kit/svg2d.js over kit/geom2d.js).
//
//   node scripts/export-svg.mjs <spec.js> --mode geometry-1to1|sheet-fit --out <dir> [--json] [--allow-collisions]
//
// The spec must pass the gate (kit/spec-core.js) or nothing is written. Files are <out>/<spec id>-<part id>.svg (slugs only), always
// inside <out>; a file already there is replaced only when it is an earlier export of this tool. Contract: docs/draft-svg.md.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const file = args.find((a, i) => !a.startsWith('--') && !['--mode', '--out'].includes(args[i - 1]));
const fail = (msg) => { console.error('export-svg: ' + msg + '\nnothing was written.'); process.exit(1); };
if (!file) fail('usage: node scripts/export-svg.mjs <spec.js> --mode geometry-1to1|sheet-fit --out <dir> [--json] [--allow-collisions]');
const mode = opt('mode'), outArg = opt('out');
if (!['geometry-1to1', 'sheet-fit'].includes(mode)) fail('--mode must be geometry-1to1 (1 unit = 1 mm of the part) or sheet-fit (an A4 sheet, scaled and labelled as such)');
if (!outArg) fail('--out <dir> is required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({ console }); ctx.window = ctx;
for (const f of ['kit/kin.js', 'kit/enigma.js', 'kit/cube.js', 'kit/rar5.js', 'kit/deflate.js', 'kit/react-reconcile.js', 'kit/geom2d.js', 'kit/spec-core.js', 'kit/svg2d.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const dataJs = path.join(path.dirname(path.resolve(file)), 'data.js'); if (fs.existsSync(dataJs)) vm.runInContext(fs.readFileSync(dataJs, 'utf8'), ctx, { filename: dataJs });
vm.runInContext(fs.readFileSync(path.resolve(file), 'utf8'), ctx, { filename: file });
if (!ctx.SPEC) fail('the file does not define window.SPEC');
const V = ctx.MX.spec.validate(ctx.SPEC);
if (V.errors.length) fail('the spec does not pass the gate:\n' + V.errors.map((e) => '  ' + e).join('\n'));
if (!(ctx.SPEC.parts || []).some((p) => p.kind === 'drawing')) fail('the spec has no 2D drawing parts (kind: drawing): there is no geometry to export');
let results;
try { results = ctx.MX.svg2d.all(ctx.SPEC, { mode, validation: V, allowCollisions: args.includes('--allow-collisions') }); } catch (e) { fail(e.message); }
// where the files go: inside --out, under names made only of slugs, never over a file this tool did not write
const out = path.resolve(outArg); fs.mkdirSync(out, { recursive: true });
const written = [];
for (const r of results) {
  if (!/^[a-z0-9-]+\.svg$/.test(r.file)) fail('unsafe file name ' + JSON.stringify(r.file));
  const target = path.resolve(out, r.file); if (path.dirname(target) !== out) fail(r.file + ' would be written outside ' + out);
  if (fs.existsSync(target) && !fs.readFileSync(target, 'utf8').includes('<!-- ' + ctx.MX.svg2d.GENERATOR)) fail(target + ' exists and is not an earlier export of this tool: move it or choose another --out');
}
for (const r of results) { const target = path.join(out, r.file); fs.writeFileSync(target, r.svg); written.push({ file: target, ...r.report }); }
if (args.includes('--json')) console.log(JSON.stringify({ spec: ctx.SPEC.id, mode, files: written }, null, 2));
else for (const w of written) console.log(w.file + '  ' + w.mode + '  scale ' + w.scaleText + '  ' + w.dims + ' dimensions (' + w.dimCount.compared + ' compared, ' + w.dimCount.declared + ' declared, ' + w.dimCount.estimated + ' estimated)  gate ' + w.verdict + (w.collisions.length ? '  ' + w.collisions.length + ' COLLISIONS ALLOWED' : ''));
