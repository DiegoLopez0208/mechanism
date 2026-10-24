#!/usr/bin/env node
// check-all.mjs - runs the gate on every examples/*/spec.js, so a new example cannot skip CI by not being listed anywhere.
// Each spec runs in its own process (the gate loads specs with node:vm, which is not a sandbox; see SECURITY.md).
// Exits 1 if any spec fails its gate.
//
//   node scripts/check-all.mjs                 # every example
//   node scripts/check-all.mjs --json out/     # also writes out/<name>.verdict.json
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), jsonAt = argv.indexOf('--json'), jsonDir = jsonAt >= 0 ? path.resolve(argv[jsonAt + 1]) : null;
if (jsonDir) fs.mkdirSync(jsonDir, { recursive: true });
const names = fs.readdirSync(path.join(root, 'examples')).filter((n) => fs.existsSync(path.join(root, 'examples', n, 'spec.js'))).sort();
const tally = {}, failed = [];
for (const name of names) {
  const args = [path.join(root, 'scripts/check-spec.mjs'), path.join(root, 'examples', name, 'spec.js')];
  if (jsonDir) args.push('--json', path.join(jsonDir, name + '.verdict.json'));
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || ''), verdict = (/^verdict: ([A-Z ]+?)\s{2,}/m.exec(out) || [])[1] || (r.status ? 'DOES NOT PASS' : 'UNKNOWN');
  tally[verdict] = (tally[verdict] || 0) + 1;
  console.log((r.status ? 'FAIL ' : 'ok   ') + name.padEnd(28) + verdict);
  if (r.status) { failed.push(name); console.log(out.split('\n').filter((l) => /^(ERROR|DOES NOT PASS)/.test(l)).map((l) => '       ' + l).join('\n')); }
}
console.log('\n' + names.length + ' specs: ' + Object.entries(tally).map(([k, v]) => v + ' ' + k).join(', '));
if (failed.length) { console.log('DOES NOT PASS: ' + failed.join(', ')); process.exit(1); }
