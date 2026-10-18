#!/usr/bin/env node
// build-skill.mjs - assembles a standalone skill folder from this repository, so the skill runs with no access to the rest of it.
// The file lists are not written here: the kit modules come from kit/manifest.js (what each engine needs) and the rest from the
// skill's own skill.json. Every file is copied byte for byte and listed with its sha256 in <out>/files.json, which
// scripts/skill-doctor.mjs checks after an install and tests/draft-skill.test.mjs compares with a fresh build.
//
//   node scripts/build-skill.mjs draft [--out plugins/mechanism-draft] [--with mesh]
//
// Without --out the skill is rebuilt in place (its hand-written SKILL.md, README.md, references/ and skill.json are kept;
// the generated kit/, scripts/, examples/, LICENSE, THIRD_PARTY.md and files.json are replaced).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const kind = args[0];
if (kind !== 'draft') { console.error('usage: node scripts/build-skill.mjs draft [--out <dir>] [--with mesh]'); process.exit(1); }
const src = path.join(root, 'plugins', 'mechanism-draft'), out = path.resolve(opt('out', src)), withMesh = (opt('with', '') || '').split(',').includes('mesh');
const def = JSON.parse(fs.readFileSync(path.join(src, 'skill.json'), 'utf8'));

// what Draft needs from kit/, from the manifest: a spec page without the 3D stack, the object models check-spec loads,
// Paper's vector engine and the compiler, plus the loader, its fonts and the manifest itself
const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(root, 'kit', 'manifest.js'), 'utf8'), ctx);
const M = ctx.MX_MANIFEST, paper = M.engines.paper;
const core = M.order.filter((f) => (M.specPage.includes(f) && !M.stack3d.includes(f)) || M.injected.includes(f) || M.domain.includes(f) || paper.vector.modules.includes(f) || f === M.compiler).concat(['boot.js', 'fonts.js', 'manifest.js']);
const mesh = M.order.filter((f) => M.stack3d.includes(f) || (paper.modules.includes(f) && !paper.vector.modules.includes(f)));

const files = new Map();      // destination (relative to the skill) -> source (absolute)
for (const f of core) files.set('kit/' + f, path.join(root, 'kit', f));
if (withMesh) for (const f of mesh) files.set('kit/' + f, path.join(root, 'kit', f));
for (const f of def.runtime.scripts) files.set(f, path.join(root, f));
for (const f of def.runtime.files) files.set(f, path.join(root, f));
for (const name of def.runtime.examples) for (const f of fs.readdirSync(path.join(root, 'examples', name))) files.set('examples/' + name + '/' + f, path.join(root, 'examples', name, f));
if (out !== src) for (const f of def.handwritten) files.set(f, path.join(src, f));      // a build somewhere else also takes the hand-written part

for (const g of ['kit', 'scripts', 'examples']) fs.rmSync(path.join(out, g), { recursive: true, force: true });
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'), list = {};
for (const [dest, from] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
  if (!fs.existsSync(from)) throw new Error('missing source for ' + dest + ': ' + path.relative(root, from));
  fs.mkdirSync(path.dirname(path.join(out, dest)), { recursive: true }); fs.copyFileSync(from, path.join(out, dest)); list[dest] = sha(from);
}
if (out === src) for (const f of def.handwritten) list[f] = sha(path.join(src, f));      // listed (and checked by the doctor) either way
for (const k of Object.keys(list).sort()) { const v = list[k]; delete list[k]; list[k] = v; }
const meshList = Object.fromEntries(mesh.map((f) => ['kit/' + f, sha(path.join(root, 'kit', f))]));
const manifest = { name: def.name, version: def.version, generatedBy: 'scripts/build-skill.mjs draft', files: list,
  optional: { mesh: { description: def.optional.mesh, installed: withMesh, files: meshList } } };
fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(manifest, null, 1) + '\n');
const bytes = Object.keys(list).reduce((n, f) => n + fs.statSync(path.join(out, f)).size, 0);
console.log(`built ${def.name} ${def.version} in ${path.relative(process.cwd(), out) || '.'}: ${Object.keys(list).length} files, ${(bytes / 1048576).toFixed(2)} MiB` + (withMesh ? ' (with the mesh pack)' : ''));
