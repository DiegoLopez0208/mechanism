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
const kind = args[0], fail = (m) => { console.error('build-skill: ' + m + '\nnothing was written or removed.'); process.exit(1); };
if (kind !== 'draft') fail('usage: node scripts/build-skill.mjs draft [--out <dir>] [--with mesh]');
for (const k of ['out', 'with']) if (args.includes('--' + k) && (!opt(k) || opt(k).startsWith('--'))) fail('--' + k + ' needs a value');
const withList = (opt('with', '') || '').split(',').filter(Boolean), withMesh = withList.includes('mesh');
if (withList.some((w) => w !== 'mesh')) fail('unknown --with ' + withList.filter((w) => w !== 'mesh').join(',') + ' (the only optional pack is mesh)');
const src = path.join(root, 'plugins', 'mechanism-draft'), out = path.resolve(opt('out', src));
const def = JSON.parse(fs.readFileSync(path.join(src, 'skill.json'), 'utf8'));

// Where it may write. The real path (symbolic links and junctions resolved, case folded on Windows) must be outside this repository,
// or exactly the skill's own folder; never the repository itself or a folder that contains it. An existing folder must be empty or
// a previous build of this skill (its files.json), and only the files that build listed may be removed.
const real = (p) => { let a = path.resolve(p), rest = []; while (!fs.existsSync(a)) { rest.unshift(path.basename(a)); const up = path.dirname(a); if (up === a) break; a = up; } return path.join(fs.realpathSync.native(a), ...rest); };
const key = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
const inside = (child, parent) => { const r = path.relative(key(parent), key(child)); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
const R = real(root), O = real(out), S = real(src), GEN = ['kit', 'scripts', 'examples'];
if (inside(R, O)) fail('--out ' + out + ' is this repository or a folder that contains it');
if (inside(O, R) && key(O) !== key(S)) fail('--out ' + out + ' is inside this repository but is not plugins/mechanism-draft');
let prev = null;
if (fs.existsSync(O)) {
  if (!fs.statSync(O).isDirectory()) fail('--out ' + out + ' exists and is not a folder');
  if (fs.readdirSync(O).length) {
    const f = path.join(O, 'files.json');
    if (!fs.existsSync(f)) fail('--out ' + out + ' is not empty and is not a build of this skill (no files.json): choose an empty or new folder');
    try { prev = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { fail(out + '/files.json is not valid JSON'); }
    if (prev.name !== def.name) fail('--out ' + out + ' holds a build of ' + JSON.stringify(prev.name) + ', not ' + def.name);
  }
}
// only paths the previous build wrote, inside the generated folders, with no way out of them
const removable = (f) => typeof f === 'string' && GEN.includes(f.split('/')[0]) && !f.split('/').includes('..') && !path.isAbsolute(f) && inside(path.join(O, f), O);
const listed = new Set(prev ? Object.keys(prev.files || {}).concat(Object.keys(prev.optional?.mesh?.files || {})).filter(removable) : []);
const present = [];
const walk = (d) => { const a = path.join(O, d); if (!fs.existsSync(a)) return; for (const e of fs.readdirSync(a, { withFileTypes: true })) { const r = d + '/' + e.name; if (e.isDirectory()) walk(r); else present.push(r); } };
for (const g of GEN) walk(g);
const unlisted = present.filter((f) => !listed.has(f));
if (unlisted.length) fail('files the previous build did not write would be in the way: ' + unlisted.slice(0, 5).join(', ') + (unlisted.length > 5 ? ' and ' + (unlisted.length - 5) + ' more' : '') + ' (move them, or choose another --out)');

// what Draft needs from kit/, from the manifest: a spec page without the 3D stack, the object models check-spec loads,
// Paper's vector engine and the compiler, plus the loader, its fonts and the manifest itself
const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(root, 'kit', 'manifest.js'), 'utf8'), ctx);
const M = ctx.MX_MANIFEST, paper = M.engines.paper;
const core = M.order.filter((f) => (M.specPage.includes(f) && !M.stack3d.includes(f)) || M.injected.includes(f) || M.domain.includes(f) || (M.exporters || []).includes(f) || paper.vector.modules.includes(f) || f === M.compiler).concat(['boot.js', 'fonts.js', 'manifest.js']);
const mesh = M.order.filter((f) => M.stack3d.includes(f) || (paper.modules.includes(f) && !paper.vector.modules.includes(f)));

const files = new Map();      // destination (relative to the skill) -> source (absolute)
for (const f of core) files.set('kit/' + f, path.join(root, 'kit', f));
if (withMesh) for (const f of mesh) files.set('kit/' + f, path.join(root, 'kit', f));
for (const f of def.runtime.scripts) files.set(f, path.join(root, f));
for (const f of def.runtime.files) files.set(f, path.join(root, f));
for (const name of def.runtime.examples) for (const f of fs.readdirSync(path.join(root, 'examples', name))) files.set('examples/' + name + '/' + f, path.join(root, 'examples', name, f));
if (key(O) !== key(S)) for (const f of def.handwritten) files.set(f, path.join(src, f));      // a build somewhere else also takes the hand-written part

// remove what the previous build wrote (one file at a time), then the folders it leaves empty; nothing else is touched
for (const f of present) fs.rmSync(path.join(O, f));
const prune = (d) => { const a = path.join(O, d); if (!fs.existsSync(a)) return; for (const e of fs.readdirSync(a, { withFileTypes: true })) if (e.isDirectory()) prune(d + '/' + e.name); if (!fs.readdirSync(a).length) fs.rmdirSync(a); };
for (const g of GEN) prune(g);
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'), list = {};
for (const [dest, from] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
  if (!fs.existsSync(from)) throw new Error('missing source for ' + dest + ': ' + path.relative(root, from));
  fs.mkdirSync(path.dirname(path.join(out, dest)), { recursive: true }); fs.copyFileSync(from, path.join(out, dest)); list[dest] = sha(from);
}
if (key(O) === key(S)) for (const f of def.handwritten) list[f] = sha(path.join(src, f));      // listed (and checked by the doctor) either way
for (const k of Object.keys(list).sort()) { const v = list[k]; delete list[k]; list[k] = v; }
const meshList = Object.fromEntries(mesh.map((f) => ['kit/' + f, sha(path.join(root, 'kit', f))]));
const manifest = { name: def.name, version: def.version, generatedBy: 'scripts/build-skill.mjs draft', files: list,
  optional: { mesh: { description: def.optional.mesh, installed: withMesh, files: meshList } } };
fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(manifest, null, 1) + '\n');
const bytes = Object.keys(list).reduce((n, f) => n + fs.statSync(path.join(out, f)).size, 0);
console.log(`built ${def.name} ${def.version} in ${path.relative(process.cwd(), out) || '.'}: ${Object.keys(list).length} files, ${(bytes / 1048576).toFixed(2)} MiB` + (withMesh ? ' (with the mesh pack)' : ''));
