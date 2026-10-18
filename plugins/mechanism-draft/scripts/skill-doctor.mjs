#!/usr/bin/env node
// skill-doctor.mjs - checks a standalone skill install (built by scripts/build-skill.mjs): every file listed in files.json is
// present and unchanged, which optional packs are installed, and whether the tools it runs with are there. It only reads.
//
//   node scripts/skill-doctor.mjs [--json]        (run from the skill folder)
//
// Exit code 1 when a listed file is missing or changed, or an optional pack is half installed. A missing browser or ffmpeg is
// reported (renders need them) but is not a broken install.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findBrowser } from './lib/browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), json = process.argv.includes('--json');
const listFile = path.join(root, 'files.json');
if (!fs.existsSync(listFile)) { console.log('no files.json here: this is a full Mechanism checkout, not a built skill; nothing to verify.'); process.exit(0); }
const m = JSON.parse(fs.readFileSync(listFile, 'utf8')), sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const missing = [], changed = [];
for (const [f, h] of Object.entries(m.files)) { const p = path.join(root, f); if (!fs.existsSync(p)) missing.push(f); else if (sha(p) !== h) changed.push(f); }
const packs = {};
for (const [name, pack] of Object.entries(m.optional || {})) {
  const state = Object.entries(pack.files).map(([f, h]) => { const p = path.join(root, f); return !fs.existsSync(p) ? 'absent' : sha(p) === h ? 'ok' : 'changed'; });
  packs[name] = state.every((s) => s === 'ok') ? 'installed' : state.every((s) => s === 'absent') ? 'not installed' : 'incomplete';
}
// files inside the generated folders that files.json does not list (an install should hold exactly what was built)
const declared = new Set(Object.keys(m.files).concat(...Object.values(m.optional || {}).map((p) => Object.keys(p.files))));
const undeclared = [];
const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const r = d + '/' + e.name; if (e.isDirectory()) walk(r); else if (!declared.has(r)) undeclared.push(r); } };
for (const d of ['kit', 'scripts']) if (fs.existsSync(path.join(root, d))) walk(d);
const tool = (cmd, a) => { const r = spawnSync(cmd, a, { encoding: 'utf8' }); return r.status === 0 ? (r.stdout || r.stderr).split('\n')[0].trim() : null; };
const tools = { node: process.version, nodeOk: Number(process.versions.node.split('.')[0]) >= 22, browser: findBrowser() || null, ffmpeg: tool(process.env.FFMPEG || 'ffmpeg', ['-version']) };
const ok = !missing.length && !changed.length && !Object.values(packs).includes('incomplete');
const capabilities = { 'paper vector scenes (paperScene)': ok, 'paper mesh projection (any spec)': ok && packs.mesh === 'installed', 'films (render.mjs)': ok && !!tools.browser && !!tools.ffmpeg && tools.nodeOk };
const report = { skill: m.name, version: m.version, ok, missing, changed, undeclared, optional: packs, tools, capabilities };
if (json) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`${m.name} ${m.version}: ${ok ? 'install OK' : 'install BROKEN'} (${Object.keys(m.files).length} files listed)`);
  for (const f of missing) console.log('  MISSING  ' + f);
  for (const f of changed) console.log('  CHANGED  ' + f);
  for (const f of undeclared) console.log('  extra    ' + f + ' (not listed in files.json)');
  for (const [n, s] of Object.entries(packs)) console.log(`  optional ${n}: ${s}` + (s === 'not installed' ? ' (only needed for specs without a vector paperScene)' : ''));
  console.log(`  node ${tools.node}${tools.nodeOk ? '' : ' (renders need Node 22 or later)'}; browser ${tools.browser ? 'found' : 'NOT FOUND (needed for stills, films and the preflight)'}; ffmpeg ${tools.ffmpeg ? 'found' : 'NOT FOUND (needed for films)'}`);
  for (const [c, yes] of Object.entries(capabilities)) console.log(`  ${yes ? 'can' : 'cannot'}: ${c}`);
}
process.exitCode = ok ? 0 : 1;
