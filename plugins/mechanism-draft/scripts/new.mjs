#!/usr/bin/env node
// new.mjs - crea examples/<nombre>/ con una pagina, run.js y un spec.js minimo que NO pasa el chequeo hasta que reemplaces cada TODO por lo investigado (nace como borrador: un TODO o example.com es un error).
//
//   node scripts/new.mjs rubik --title "Rubik's cube"
//   node scripts/check-spec.mjs examples/rubik/spec.js
//
// La pagina toma el HTML de examples/hub y la lista de scripts de kit/manifest.js (lo unico que cambia es spec.js).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2), name = args.find((a) => !a.startsWith('--') && !(args[args.indexOf(a) - 1] || '').startsWith('--'));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) { console.error('uso: node scripts/new.mjs <nombre-en-minusculas> [--title "Titulo"] [--fig "Fig 8"] [--dir <carpeta de trabajo>]'); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), work = opt('dir', null), dir = work ? path.resolve(work, name) : path.join(root, 'examples', name), title = opt('title', name), fig = opt('fig', 'Fig 1');
// --dir <folder>: the object goes in a folder of YOUR project (never inside the skill folder: agents cannot write there), and its page points at the kit by absolute URL
const rel = work ? dir.split(path.sep).join('/') : 'examples/' + name, kitUrl = pathToFileURL(path.join(root, 'kit') + path.sep).href;
const taken = ['spec.js', 'index.html', 'run.js'].filter((f) => fs.existsSync(path.join(dir, f)));      // a folder that already holds your notes or a log is fine; one that holds the object itself is not
if (taken.length) { console.error('ya existe ' + rel + ' (tiene ' + taken.join(', ') + '): elige otro nombre o borra esos archivos'); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });

// the page takes its markup from examples/hub and its script list from kit/manifest.js (the same table kit/boot.js reads)
const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(root, 'kit/manifest.js'), 'utf8'), ctx);
const scripts = ctx.MX_MANIFEST.pageModules([]).map((f) => '../../kit/' + f).concat('spec.js', '../../kit/' + ctx.MX_MANIFEST.compiler, 'run.js').join(',');
// the markup template: examples/hub in the full repository; a standalone skill (scripts/build-skill.mjs) carries only its own examples
const tpl = ['hub', ...fs.readdirSync(path.join(root, 'examples')).sort()].map((n) => path.join(root, 'examples', n)).find((d) => fs.existsSync(path.join(d, 'index.html')) && fs.existsSync(path.join(d, 'run.js')));
// --title and --fig are free text: escaped for HTML in the page, JSON-encoded in spec.js, kept out of its comment, and never used as a replace() pattern
const html = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const comment = (s) => String(s).replace(/\*\//g, '* /').replace(/[\r\n\u2028\u2029]+/g, ' ');
const hub = fs.readFileSync(path.join(tpl, 'index.html'), 'utf8').replace(/data-scripts="[^"]*"/, () => 'data-scripts="' + scripts + '"');
fs.writeFileSync(path.join(dir, 'index.html'), (work ? hub.split('../../kit/').join(kitUrl) : hub).replace(/<title>[^<]*<\/title>/, () => '<title>' + html(fig) + ' - ' + html(title) + '</title>'));
fs.copyFileSync(path.join(tpl, 'run.js'), path.join(dir, 'run.js'));
fs.writeFileSync(path.join(dir, 'spec.js'), `/*
 * spec.js - ${comment(title)}. Plantilla minima, BORRADOR: "node scripts/check-spec.mjs ${comment(rel)}/spec.js" falla hasta que cada TODO y example.com se reemplacen por lo que investigaste.
 * Reemplaza las fuentes, las afirmaciones y las piezas por lo que investigaste. Reglas: todo numero SPEC / MEASURED / DERIVED nombra su fuente
 * (DERIVED trae su cruce, MEASURED su error, ESTIMATED su motivo). Ver SKILL.md y examples/hub, examples/switch, examples/enigma.
 */
window.SPEC = {
  id: '${name}', fig: ${JSON.stringify(fig)}, kicker: 'REAL OBJECT', title: ${JSON.stringify(title)}, sub: 'Every number says where it came from.',
  research: {
    sources: [
      { id: 'src1', title: 'TODO: the page or datasheet you opened', url: 'https://example.com/', fetched: '${new Date().toISOString().slice(0, 10)}', note: 'What you read there, and what you could not read.' },
    ],
    claims: [
      { id: 'size', conf: 'spec', text: 'TODO: a published number, quoted.', src: ['src1'] },
      { id: 'guess', conf: 'estimated', text: 'TODO: what nobody publishes (drawn dashed).', why: 'Why no source gives it.' },
    ],
  },
  parts: [
    { id: 'base', name: 'Base', kind: 'plate', p: { w: 60, h: 40, r: 4, t: 6 }, mat: 'steel', at: [0, 0, 0], explode: [0, 0, 0], conf: 'spec', claims: ['size'], info: { title: 'Base', lines: ['TODO: what it is'], conf: ['spec'] } },
    { id: 'cover', name: 'Cover', kind: 'plate', p: { w: 60, h: 40, r: 4, t: 3 }, mat: 'aluminum', at: [0, 0, 7], explode: [0, 0, 16], conf: 'estimated', claims: ['guess'], info: { title: 'Cover', lines: ['TODO'], conf: ['estimated'] } },
  ],
  // mechanism: { links: [...], free: '...', drive: { modes: [...] } }   // gear train
  // mechanism: { press: { travel, actuation, force: [[mm, cN], ...] }, drive: { modes: [...] } }   // press
  // mechanism: { enigma: { rotors, reflector, rings, start, tests: [...] }, drive: { modes: [...] } }   // cipher
  director: {},
};
`);
console.log('creado ' + rel + '/ (index.html, run.js, spec.js)\nsiguiente: edita spec.js con lo investigado -> node scripts/check-spec.mjs ' + rel + '/spec.js -> node scripts/probe.mjs \"' + rel + '/index.html?explore\" ' + (work ? rel + '/probe' : 'out/probe-' + name));
