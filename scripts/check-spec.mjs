#!/usr/bin/env node
// check-spec.mjs - valida un spec de mechanism SIN abrir un navegador: evidencia (fuente, cruce, error, motivo), geometria del tren de engranajes
// (distancias entre centros, mismo modulo, dientes que encajan) y que cada modo de marcha de el numero que publica el fabricante.
// Sale con codigo 1 si algo falla: el flujo del skill no renderiza un objeto que no pasa.
//
//   node scripts/check-spec.mjs examples/hub/spec.js
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = process.argv[2];
if (!file) { console.error('uso: node scripts/check-spec.mjs <spec.js>'); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({ console }); ctx.window = ctx;
for (const f of ['kit/kin.js', 'kit/enigma.js', 'kit/cube.js', 'kit/spec-core.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
vm.runInContext(fs.readFileSync(path.resolve(file), 'utf8'), ctx, { filename: file });
if (!ctx.SPEC) { console.error('el archivo no define window.SPEC'); process.exit(1); }
const r = ctx.MX.spec.validate(ctx.SPEC);
console.log(ctx.SPEC.title + '  (' + path.basename(path.dirname(path.resolve(file))) + ')');
r.lines.forEach((l) => console.log(l));
r.warnings.forEach((w) => console.log('AVISO  ' + w));
r.errors.forEach((e) => console.log('ERROR  ' + e));
console.log(r.errors.length ? '\nNO PASA: ' + r.errors.length + ' error(es)' : '\nPASA' + (r.warnings.length ? ' con ' + r.warnings.length + ' aviso(s)' : ''));
process.exit(r.errors.length ? 1 : 0);
