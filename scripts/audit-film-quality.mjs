// Audit new native study views without launching the production batch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withBrowser } from './lib/browser.mjs';
import { films } from '../films/catalog.mjs';
import { filmInputs } from './lib/film-fingerprint.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), at = args.indexOf('--out');
if (at < 0 || !args[at + 1]) throw new Error('--out <audit folder> is required');
const out = path.resolve(args[at + 1]); fs.mkdirSync(path.join(out, 'stills'), { recursive: true });
const results = [];
const recorder = `(() => {
  window.__qualityText=[];window.__qualityErrors=[];window.__qualityWebgl=0;
  addEventListener('error', e=>__qualityErrors.push(e.message));
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.startsWith('webgl'))__qualityWebgl++;return get.call(this,type,...args);};
  const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(s,x,y,...args){
    if(this.canvas.id==='c'&&window.__qualityRecording){
      const m=this.measureText(s),transform=this.getTransform(),w=m.width;
      const left=this.textAlign==='right'||this.textAlign==='end'?x-w:this.textAlign==='center'?x-w/2:x;
      const size=Number((/([\\d.]+)px/.exec(this.font)||[])[1]||0);
      const top=y-(m.actualBoundingBoxAscent||size*.8),bottom=y+(m.actualBoundingBoxDescent||size*.2);
      const points=[[left,top],[left+w,top],[left,bottom],[left+w,bottom]].map(([a,b])=>[transform.a*a+transform.c*b+transform.e,transform.b*a+transform.d*b+transform.f]);
      __qualityText.push({s:String(s),size:size*Math.hypot(transform.a,transform.b),alpha:this.globalAlpha,
        x0:Math.min(...points.map(p=>p[0])),x1:Math.max(...points.map(p=>p[0])),y0:Math.min(...points.map(p=>p[1])),y1:Math.max(...points.map(p=>p[1]))});
    }
    return fill.call(this,s,x,y,...args);
  };
})()`;
await withBrowser(async b => {
  await b.send('Page.enable');
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: recorder });
  const onlyAt = args.indexOf('--only');
  const selected = onlyAt < 0 ? films : films.filter(film => args[onlyAt + 1].split(',').includes(film.id));
  if (!selected.length) throw new Error('No film matches --only');
  for (const film of selected) {
    const start = Date.now();
    const fingerprint = filmInputs(root, film);
    await b.send('Page.navigate', { url: pathToFileURL(path.join(root, 'films', film.id, 'index.html')).href + '?render=1&fps=60' });
    let ready = false;
    for (let i = 0; i < 200; i++) {
      if (await b.ev('typeof __studyDiagnostics === "function"')) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error(film.id + ': native study did not initialize: ' + JSON.stringify(await b.ev('__qualityErrors')));
    const info = await b.ev('__specInfo()');
    const samples = [];
    const sampleTimes = [4, ...Array.from({ length: 32 }, (_, i) => i).filter(t => t !== 4), 4];
    for (const t of sampleTimes) {
      const result = await b.ev(`(() => {
        __qualityText=[];__qualityRecording=true;__paint(${t},1,.5);__qualityRecording=false;
        const cv=document.getElementById('c'),x=cv.getContext('2d');
        const data=x.getImageData(0,0,cv.width,cv.height).data;
        let changed=0,max=0,sum=0;
        if(${t}===4){if(window.__qualityFirst){for(let i=0;i<data.length;i++){const d=Math.abs(data[i]-__qualityFirst[i]);if(d)changed++;max=Math.max(max,d);sum+=d;}}
          else window.__qualityFirst=data.slice();}
        const text=__qualityText.filter(r=>r.alpha>.3&&r.s.trim());
        const clipped=text.filter(r=>r.x0<-.5||r.x1>cv.width+.5||r.y0<-.5||r.y1>cv.height+.5);
        const overlaps=[];
        for(let i=0;i<text.length;i++)for(let j=i+1;j<text.length;j++){
          const a=text[i],b=text[j],w=Math.max(0,Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)),h=Math.max(0,Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0));
          const small=Math.min((a.x1-a.x0)*(a.y1-a.y0),(b.x1-b.x0)*(b.y1-b.y0));
          if(small>0&&w*h/small>.18)overlaps.push([a.s,b.s]);
        }
        const stats=[];for(let y=170;y<750;y+=12)for(let xx=65;xx<980;xx+=12){const i=(y*cv.width+xx)*4;stats.push((data[i]+data[i+1]+data[i+2])/3);}
        const mean=stats.reduce((a,b)=>a+b,0)/stats.length;
        return {diagnostics:__studyDiagnostics(),clipped,overlaps,minFont:Math.min(...text.map(r=>r.size)),textCount:text.length,
          sceneStd:Math.sqrt(stats.reduce((a,b)=>a+(b-mean)**2,0)/stats.length),repeat:{changed,max,mae:sum/data.length},
          frameInfo:__frameInfo,webgl:__qualityWebgl,errors:__qualityErrors};
      })()`);
      samples.push({ t, ...result });
      if ([4, 12, 20, 28].includes(t) && (t !== 4 || samples.length === 1)) {
        const frame = await b.ev(`__frame(${t},1,.5)`);
        fs.writeFileSync(path.join(out, 'stills', film.id + '-' + t + '.png'), Buffer.from(frame.split(',')[1], 'base64'));
      }
    }
    const failures = [];
    for (const sample of samples) {
      if (sample.clipped.length) failures.push({ t: sample.t, check: 'TEXT_CLIPPED', detail: sample.clipped });
      if (sample.overlaps.length) failures.push({ t: sample.t, check: 'TEXT_OVERLAP', detail: sample.overlaps });
      if (sample.minFont < 17.9) failures.push({ t: sample.t, check: 'SMALL_TEXT', value: sample.minFont });
      if (sample.sceneStd < 3) failures.push({ t: sample.t, check: 'EMPTY_SCENE', value: sample.sceneStd });
      if (sample.errors.length) failures.push({ t: sample.t, check: 'BROWSER_ERROR', detail: sample.errors });
      if (sample.frameInfo.fps !== 60) failures.push({ check: 'FPS_NOT_PROPAGATED' });
      if (film.engine !== 'studio' && sample.webgl !== 0) failures.push({ check: '2D_CREATED_WEBGL' });
      if (sample.diagnostics.detailBoxes?.some(box => box.bottom > box.limit)) failures.push({ t: sample.t, check: 'WORKFLOW_CARD_OVERFLOW' });
      if (film.engine === 'studio') {
        const bounds = sample.diagnostics.screenBounds;
        if (!bounds || bounds[0] < 400 || bounds[1] < 140 || bounds[2] > 1560 || bounds[3] > 742) {
          failures.push({ t: sample.t, check: 'ACTUAL_MESH_OUTSIDE_RESERVED_SPACE', detail: bounds });
        }
      }
    }
    const repeat = samples.at(-1).repeat;
    if ((film.engine !== 'studio' && repeat.max !== 0) || (film.engine === 'studio' && repeat.max > 2)) failures.push({ check: 'SEEK_REPEATABILITY', detail: repeat });
    if (info.errors.length) failures.push({ check: 'GATE_ERRORS', detail: info.errors });
    if (filmInputs(root, film).hash !== fingerprint.hash) failures.push({ check: 'SOURCES_CHANGED_DURING_AUDIT' });
    results.push({ id: film.id, engine: film.engine, fingerprint, evidence: info.evidence, status: failures.length ? 'FAIL' : 'PASS',
      failures, samples, elapsedSeconds: (Date.now() - start) / 1000, visualReview: 'PENDING', humanApproval: 'NOT_RECORDED' });
    fs.writeFileSync(path.join(out, 'native-audit.json'), JSON.stringify({ version: 1, generated: new Date().toISOString(),
      scope: 'Native views, 1-second sampling plus out-of-order seek; not human approval or full video inspection.', results }, null, 2) + '\n');
    console.log(results.at(-1).status + ' ' + film.id + ' ' + failures.length + ' findings');
  }
}, { timeout: 90000, retries: 0 });
if (results.some(r => r.status === 'FAIL')) process.exitCode = 1;
