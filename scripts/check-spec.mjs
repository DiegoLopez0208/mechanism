#!/usr/bin/env node
// check-spec.mjs - checks a mechanism spec WITHOUT a browser: evidence (source, cross-check, error, reason), gear-train geometry
// (centre distances, same module, teeth that mesh) and that every drive mode gives the figure the maker publishes.
// Exits 1 if anything fails: the skill does not render an object that does not pass.
//
//   node scripts/check-spec.mjs examples/hub/spec.js [--json verdict.json] [--trusted]
//
// A spec is JavaScript and node:vm is not a sandbox, so the gate re-runs itself under Node's permission model: it may read the kit
// and the spec's own folder, write only the --json report, and start no process or network connection. --trusted (or
// MECHANISM_TRUSTED=1) skips that, for a spec you wrote yourself on a Node without the permission model.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2), jsonAt = argv.indexOf('--json'), jsonOut = jsonAt >= 0 ? argv[jsonAt + 1] : null, file = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--json');
if (!file) { console.error('usage: node scripts/check-spec.mjs <spec.js> [--json verdict.json] [--trusted]'); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.permission && !argv.includes('--trusted') && process.env.MECHANISM_TRUSTED !== '1') {
  const flag = ['--permission', '--experimental-permission'].find((f) => process.allowedNodeEnvironmentFlags.has(f));
  if (!flag) { console.error('check-spec: this Node has no permission model to contain the spec; use Node 22.13+ or pass --trusted for a spec you wrote'); process.exit(1); }
  const reads = [root, path.dirname(path.resolve(file))].map((p) => '--allow-fs-read=' + p), writes = jsonOut ? ['--allow-fs-write=' + path.resolve(jsonOut)] : [];
  const r = spawnSync(process.execPath, [flag, ...reads, ...writes, fileURLToPath(import.meta.url), ...argv], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
const ctx = vm.createContext({ console, TextEncoder, TextDecoder }); ctx.window = ctx;
for (const f of ['kit/kin.js', 'kit/enigma.js', 'kit/cube.js', 'kit/rar5.js', 'kit/deflate.js', 'kit/react-reconcile.js', 'kit/geom2d.js', 'kit/spec-core.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: path.join(root, f) });
const dataJs = path.join(path.dirname(path.resolve(file)), 'data.js'); if (fs.existsSync(dataJs)) vm.runInContext(fs.readFileSync(dataJs, 'utf8'), ctx, { filename: dataJs });      // evidence generated next to the spec (for example scripts/make-winrar-sample.mjs)
vm.runInContext(fs.readFileSync(path.resolve(file), 'utf8'), ctx, { filename: file });
if (!ctx.SPEC) { console.error('the file does not define window.SPEC'); process.exit(1); }
const r = ctx.MX.spec.validate(ctx.SPEC);
console.log(ctx.SPEC.title + '  (' + path.basename(path.dirname(path.resolve(file))) + ')');
r.lines.forEach((l) => console.log(l));
r.warnings.forEach((w) => console.log('WARNING  ' + w));
r.errors.forEach((e) => console.log('ERROR  ' + e));
console.log(r.errors.length ? '\nDOES NOT PASS: ' + r.errors.length + ' error(s)' : '\nPASSES' + (r.warnings.length ? ' with ' + r.warnings.length + ' warning(s)' : ''));
if (jsonOut) {      // reproducible report: verdict, errors, spec and kit hashes, Node version and date
  const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'), kit = ['kin', 'enigma', 'cube', 'rar5', 'deflate', 'geom2d', 'spec-core'].map((n) => path.join(root, 'kit', n + '.js'));
  fs.writeFileSync(jsonOut, JSON.stringify({ spec: ctx.SPEC.id, title: ctx.SPEC.title, verdict: r.verdict, errors: r.errors, warnings: r.warnings, lines: r.lines, specSha256: sha(path.resolve(file)), kitSha256: crypto.createHash('sha256').update(kit.map(sha).join('')).digest('hex'), node: process.version, generated: new Date().toISOString() }, null, 2) + '\n');
}
process.exit(r.errors.length ? 1 : 0);
