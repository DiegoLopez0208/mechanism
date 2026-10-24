import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { films } from '../films/catalog.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
fs.writeFileSync(path.join(root,'films/viewer.js'),"// Native collection views: the selected engine owns its original interface.\nMX.setStyle('dossier');\nMX.spec.run(window.SPEC);\n");
for(const film of films){
  const folder=path.join(root,'films',film.id),source=fs.readFileSync(path.join(folder,'index.html'),'utf8');
  const modules=/data-scripts="([^"]+)"/.exec(source)[1].replace('../../kit/production-film.js','../viewer.js');
  const title=film.title.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  fs.writeFileSync(path.join(folder,'view.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>${title} — native ${film.engine} view</title><style>html,body{margin:0;height:100%;background:#09192b;display:grid;place-items:center}canvas{display:block;max-width:100vw;max-height:100vh;object-fit:contain}</style></head><body><canvas id="c"></canvas><script>const q=new URLSearchParams(location.search);q.set('theme','dossier');q.delete('render');${film.engine==='studio'?"q.delete('method');q.delete('background');q.set('explore','');":`q.set('method','${film.engine}');q.set('background','blueprint');q.delete('explore');`}history.replaceState(null,'',location.pathname+'?'+q);</script><script src="../../kit/boot.js" data-scripts="${modules}"></script></body></html>\n`);
}
console.log('Built 18 matching native engine views, including benchmark specs.');
