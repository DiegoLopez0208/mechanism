// Build reproducible, dependency-free film pages. Does not render or upload media.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { edition, films } from '../films/catalog.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'kit/manifest.js'), 'utf8'), ctx);
const M = ctx.MX_MANIFEST;
const modules = M.order.filter(f => M.specPage.includes(f) || M.domain.includes(f));
const esc = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
for (const [i, film] of films.entries()) {
  const dir = path.join(root, 'films', film.id); fs.mkdirSync(dir, { recursive: true });
  const rel = name => path.relative(dir, path.join(root, name)).replaceAll('\\', '/');
  const source = film.source;
  if (!fs.existsSync(path.join(root, source, 'spec.js'))) throw new Error('Missing spec: ' + source);
  const list = modules.map(m => rel('kit/' + m));
  if (fs.existsSync(path.join(root, source, 'data.js'))) list.push(rel(source + '/data.js'));
  list.push(rel(source + '/spec.js'), rel('kit/spec.js'), rel('kit/production-film.js'));
  const data = JSON.stringify({ ...film, edition, number: String(i + 1).padStart(2, '0') }).replaceAll('<', '\\u003c');
  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(film.title)} — Mechanism technical studies</title><link rel="icon" href="data:,">
<style>html,body{margin:0;min-height:100%;background:#050d18}body{display:grid;place-items:center}canvas{display:block;width:100%;max-height:100vh;object-fit:contain}#native-canvas{display:none}</style>
</head><body><canvas id="c"></canvas><script>window.TECHNICAL_FILM=${data};
const query=new URLSearchParams(location.search);query.set('theme','dossier');if(window.TECHNICAL_FILM.engine!=='studio')query.set('method',window.TECHNICAL_FILM.engine);else query.delete('method');
query.set('render','1');history.replaceState(null,'',location.pathname+'?'+query);</script>
<script src="${rel('kit/boot.js')}" data-scripts="${list.join(',')}"></script></body></html>
`);
}
console.log('Built ' + films.length + ' ' + edition + ' film pages; no media written.');
