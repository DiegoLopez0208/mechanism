import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { films as previousFilms, edition } from '../films/catalog.mjs';
import { revisionFilms as studioFilms } from '../films/revision-catalog.mjs';
const films = [...previousFilms.slice(0,3), ...studioFilms, ...previousFilms.slice(3)];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), file = path.join(root, 'index.html');
let html = fs.readFileSync(file, 'utf8');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels = { studio: 'Studio / 3D mechanisms', workflow: 'Workflow / processes', paper: 'Paper / technical drawings' };
const newStudioIds = new Set(studioFilms.map(film=>film.id));
const cards = films.map(film => `<article class="card film-card" data-engine="${film.engine}"><div class="stage"><video controls loop playsinline preload="none" aria-label="${esc(film.title)}" poster="docs/media/${edition}/${film.id}.jpg" src="media/${edition}/${film.id}.mp4"></video><div class="shine"></div></div>
<h3>${esc(film.title)}</h3><span class="chip plain">${esc(newStudioIds.has(film.id)?'Studio / 3D construction':labels[film.engine])}</span><p>${esc(film.question)}</p><p class="film-limit">${esc(film.limit)}</p>
<div class="dl"><a href="${esc(film.viewer||'films/'+film.id+'/view.html')}" target="_blank" rel="noopener">${film.engine==='studio'?'Viewer':film.engine==='paper'?'Drawing view':'Process view'}</a><a href="${esc(film.evidencePath||film.source+'/spec.js')}" target="_blank" rel="noopener">${film.evidenceLabel||'spec.js'}</a><a href="media/${edition}/${film.id}.mp4" download>Download film</a></div></article>`).join('\n');
const section = `<section id="examples" data-label="The films"><div class="wrap">
<div class="head"><h2>Twenty-two mechanisms. Built in three dimensions.</h2><p>Explore 22 Studio assemblies, including the revised bearing and fifteen new construction films. Workflow and Paper add twelve process films and technical drawings. Sources and estimated details accompany each new model.</p></div>
<div class="film-filters" role="group" aria-label="Filter films by engine">${['all','studio','workflow','paper'].map((name, i) => `<button type="button" data-film-filter="${name}" aria-pressed="${i === 0}">${name === 'all' ? 'All '+films.length+' films' : esc(labels[name])+' · '+films.filter(f=>f.engine===name).length}</button>`).join('')}</div>
<p id="film-count" aria-live="polite">${films.length} films · 3 engines</p><div class="grid film-grid">${cards}</div>
</div></section>\n\n`;
const begin = html.indexOf('<section id="examples"'), end = html.indexOf('<section id="runs"');
if (begin < 0 || end < begin) throw new Error('Missing original film section boundaries');
html = html.slice(0, begin) + section + html.slice(end);
html = html.replace('<b>12</b><span>real objects</span>', '<b>20</b><span>Studio assemblies</span>');
html = html.replace('<b>20</b><span>Studio assemblies</span>', '<b>22</b><span>Studio assemblies</span>');
// The historical run reports remain evidence, with links rather than old players.
html = html.replace(/<video\b[^>]*\bsrc="https:\/\/github.com\/DiegoLopez0208\/mechanism\/releases\/download\/media\/[^>]*><\/video>/g, tag => {
  const poster = /poster="([^"]+)"/.exec(tag)?.[1];
  return `<img src="${esc(poster)}" alt="Historical agent-run still" loading="lazy">`;
});
html = html.replace('<h2>Then we let an agent do it alone.</h2>', '<h2>Archived agent runs.</h2>');
if (!html.includes('id="film-collection-style"')) html = html.replace('</style>', `\n/* Film collection: existing brand and card structure, wide native films. */
.film-grid .stage{aspect-ratio:16/9;height:auto}.film-grid .stage video{object-fit:contain}.film-grid .film-card[hidden]{display:none}.film-filters{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0 8px}.film-filters button{font:600 12px 'Inter';padding:12px 16px;background:transparent;color:var(--mute);border:1px solid var(--line);cursor:pointer}.film-filters button[aria-pressed=true]{background:var(--teal);color:var(--bg);border-color:var(--teal)}.film-filters button:focus-visible{outline:2px solid var(--ink);outline-offset:3px}.film-limit{font-size:13px!important;color:var(--mute)}#film-count{font:500 12px 'Inter';color:var(--mute);margin-bottom:20px}
</style><meta id="film-collection-style" name="film-collection" content="${edition}">`);
const script = `<script id="film-collection-script">
if(location.hostname==='diegolopez0208.github.io'){
const base='https://github.com/DiegoLopez0208/mechanism/releases/download/${edition}/';
document.querySelectorAll('.film-card').forEach(card=>{const video=card.querySelector('video'),name=new URL(video.src).pathname.split('/').pop();video.src=base+name;card.querySelector('a[download]').href=base+name;});
}
document.querySelectorAll('[data-film-filter]').forEach(button=>button.addEventListener('click',()=>{
const engine=button.dataset.filmFilter;document.querySelectorAll('[data-film-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
let count=0;document.querySelectorAll('.film-card').forEach(card=>{card.hidden=engine!=='all'&&card.dataset.engine!==engine;if(card.hidden)card.querySelector('video').pause();else count++;});
document.getElementById('film-count').textContent=count+' films · '+(engine==='all'?'3 engines':engine);
}));
const requestedEngine=new URLSearchParams(location.search).get('engine');
if(['studio','workflow','paper'].includes(requestedEngine))document.querySelector('[data-film-filter="'+requestedEngine+'"]').click();
</script>`;
html = html.replace(/<script id="film-collection-script">[\s\S]*?<\/script>/, '');
html = html.replace('</body>', script + '\n</body>');
fs.writeFileSync(file, html);
console.log('Integrated '+films.length+' native films, including '+films.filter(f=>f.engine==='studio').length+' Studio assemblies.');
