// Source-bound serial production for the new Studio collection. No publication.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {withBrowser} from './lib/browser.mjs';
import {studioFilms} from '../films/studio-catalog.mjs';
const root=path.resolve(import.meta.dirname,'..');
const pos=process.argv.indexOf('--out');if(pos<0)throw Error('--out required');
const out=path.resolve(process.argv[pos+1]);
for(const sub of ['stills','posters','contact-sheets','logs','receipts'])fs.mkdirSync(path.join(out,sub),{recursive:true});
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const inputs=film=>Object.fromEntries(['kit/studio-expansion-film.js','kit/gl.js','kit/figure.js','kit/parts.js','kit/spec.js','kit/spec-core.js','scripts/render.mjs','scripts/lib/encoding.mjs',film.source+'/spec.js','films/'+film.id+'/index.html'].map(f=>[f,hash(path.join(root,f))]));
const fingerprint=film=>crypto.createHash('sha256').update(JSON.stringify(inputs(film))).digest('hex');
const run=(cmd,args,log)=>new Promise((resolve,reject)=>{
  const p=spawn(cmd,args,{cwd:root,env:process.env,windowsHide:true,stdio:['ignore','pipe','pipe']});const sink=fs.createWriteStream(log);
  p.stdout.pipe(sink,{end:false});p.stderr.pipe(sink,{end:false});p.on('error',reject);p.on('close',code=>{sink.end();code===0?resolve():reject(Error(cmd+' exit '+code+' / '+log));});
});
const command=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
const auditFile=path.join(out,'native-audit.json');
let audits=fs.existsSync(auditFile)?JSON.parse(fs.readFileSync(auditFile)).results:[];
const writeAudit=()=>fs.writeFileSync(auditFile,JSON.stringify({scope:'14 new authored Studio objects, not product verification',results:audits},null,2));
for(const film of studioFilms){
  const fp=fingerprint(film),old=audits.find(a=>a.id===film.id);
  if(old?.status==='PASS'&&old.fingerprint===fp){console.log('AUDIT REUSE '+film.id);continue;}
  // Existing evidence validation remains authoritative; synthetic dimensions must
  // remain estimates. Mathematical and visual checks below are a separate audit.
  const context=vm.createContext({console});context.window=context;
  for(const f of ['kin','spec-core'])vm.runInContext(fs.readFileSync(path.join(root,'kit',f+'.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(root,film.source,'spec.js'),'utf8'),context);
  const gate=context.MX.spec.validate(context.SPEC);assert.deepEqual([...gate.errors],[]);
  assert.equal(gate.verdict.state,'NOTHING CHECKED');
  const row={id:film.id,fingerprint:fp,inputs:inputs(film),parts:context.SPEC.parts.length,evidence:gate.verdict,samples:[],status:'AUDITING'};
  await withBrowser(async({send,ev,progress})=>{
    await send('Page.enable');await send('Page.navigate',{url:pathToFileURL(path.join(root,'films',film.id,'index.html')).href});
    for(let i=0;i<100;i++){if(await ev('typeof __frame === "function"'))break;await new Promise(r=>setTimeout(r,150));if(i===99)throw Error(await ev('document.title'));}
    await ev('document.fonts.ready.then(() => true)');
    const times=[0,.5,1,2,3.9,4,5,6,7.9,8,9,10,11.9,12,13,14,15.9,5];
    for(const t of times){
      const result=await ev(`(()=>{__paint(${t});const f=__studioFigure,d=__studyDiagnostics();return {t:${t},...d,parts:f.parts.map(p=>({id:p.id,position:p.group.position.toArray(),rotation:p.group.rotation.toArray().slice(0,3),visible:p.group.visible})),finite:f.parts.every(p=>[...p.group.position.toArray(),...p.group.rotation.toArray().slice(0,3)].every(Number.isFinite)),contextLost:f.st.renderer.getContext().isContextLost()};})()`);
      assert.equal(result.renderer,'original-studio-compositor');assert(result.finite);assert(!result.contextLost);
      const b=result.screenBounds;assert(b.every(Number.isFinite));assert(b[0]>=395&&b[1]>=135&&b[2]<=1550&&b[3]<=750,'clipping '+film.id+' '+JSON.stringify(b));
      row.samples.push(result);
      if([2,6,10,14].includes(t)){const png=await ev(`__frame(${t},1,.5,'png')`);fs.writeFileSync(path.join(out,'stills',film.id+'-'+t+'.png'),Buffer.from(png.split(',')[1],'base64'));}
      progress();
    }
    const initial=row.samples.find(s=>s.t===5),repeat=row.samples.at(-1);assert.deepEqual(initial.parts,repeat.parts,'non-deterministic transforms');
    const at=t=>row.samples.find(s=>s.t===t),position=(t,id)=>at(t).parts.find(p=>p.id===id).position;
    if(film.id==='studio-slider-crank')for(const t of [4,5,6,7.9,8,9,10,11.9]){
      const pin=position(t,'crank-pin'),slider=position(t,'slider');assert(Math.abs(Math.hypot(pin[0]-slider[0],pin[1]-slider[1])-48)<1e-9,'rod constraint');
    }
    if(film.id==='studio-scotch-yoke')for(const t of [4,5,6,8,9,10])assert(Math.abs(position(t,'roller-pin')[1]-position(t,'yoke')[1])<1e-9,'pin outside slot centre');
    if(film.id==='studio-eccentric-cam')for(const t of [4,5,6,8,9,10]){
      const a=position(t,'eccentric-cam'),b=position(t,'roller');assert(Math.abs(Math.hypot(a[0]-b[0],a[1]-b[1])-25)<1e-9,'cam contact');
    }
    if(film.id==='studio-rack-pinion')for(const t of [4,5,6,8,9,10]){
      const x=position(t,'rack')[0],theta=at(t).parts.find(p=>p.id==='pinion').rotation[2];assert(Math.abs(x+12*(theta-Math.PI/24))<1e-9,'rack pitch relation');
    }
    assert(JSON.stringify(at(4).parts)!==JSON.stringify(at(6).parts),'static assembly');
    const reference=await ev(`(()=>{__paint(5);window.__auditPixels=document.getElementById('c').getContext('2d').getImageData(0,0,1600,900).data;return true;})()`);
    assert(reference);await ev('__paint(13)');
    row.repeat=await ev(`(()=>{__paint(5);const b=document.getElementById('c').getContext('2d').getImageData(0,0,1600,900).data;let max=0,sum=0;for(let i=0;i<b.length;i++){const d=Math.abs(b[i]-__auditPixels[i]);max=Math.max(max,d);sum+=d;}return {max,mean:sum/b.length};})()`);
    if(row.repeat.max>2)fs.writeFileSync(path.join(out,film.id+'-repeat-failure.json'),JSON.stringify(row,null,2));
    assert(row.repeat.max<=2,'pixel repeatability '+JSON.stringify(row.repeat));
  },{timeout:120000});
  row.status='PASS';audits=audits.filter(a=>a.id!==film.id).concat(row);writeAudit();console.log('AUDIT PASS '+film.id+' / '+row.parts+' parts / '+row.samples.length+' samples');
}
if(process.argv.includes('--audit-only'))process.exit(0);
const manifestFile=path.join(out,'manifest.json');let records=[];
const writeManifest=()=>fs.writeFileSync(manifestFile,JSON.stringify({collection:'studio-expansion',generated:new Date().toISOString(),complete:records.length===studioFilms.length,films:records},null,2));
for(const [i,film] of studioFilms.entries()){
  const fp=fingerprint(film),movie=path.join(out,film.id+'.mp4'),receiptFile=path.join(out,'receipts',film.id+'.json');
  assert.equal(audits.find(a=>a.id===film.id)?.fingerprint,fp,'source changed since native audit');
  let receipt=fs.existsSync(receiptFile)?JSON.parse(fs.readFileSync(receiptFile)):null;
  if(receipt?.status==='verified'&&receipt.fingerprint===fp&&fs.existsSync(movie)&&hash(movie)===receipt.sha256){records.push(receipt);writeManifest();console.log('VIDEO REUSE '+film.id);continue;}
  console.log('RENDER '+(i+1)+'/'+studioFilms.length+' '+film.id);
  const temporary=path.join(out,'.'+film.id+'.pending.mp4'),start=Date.now();
  await run(process.execPath,['scripts/render.mjs','films/'+film.id+'/index.html','--fps','30','--blur','1','--encoder','png','--out',temporary],path.join(out,'logs',film.id+'.log'));
  assert.equal(fingerprint(film),fp,'source changed during render');
  const meta=JSON.parse(command('ffprobe',['-v','error','-show_streams','-show_format','-of','json',temporary]));
  const video=meta.streams.find(s=>s.codec_type==='video'),audio=meta.streams.find(s=>s.codec_type==='audio');
  assert.equal(video.width,1600);assert.equal(video.height,900);assert.equal(video.avg_frame_rate,'30/1');assert.equal(Number(video.nb_frames),480);assert.equal(video.codec_name,'h264');assert.equal(audio.codec_name,'aac');assert.equal(audio.sample_rate,'48000');assert(Math.abs(Number(meta.format.duration)-16)<.1);
  command('ffmpeg',['-v','error','-i',temporary,'-f','null','-']);
  command('ffmpeg',['-v','error','-y','-ss','6','-i',temporary,'-frames:v','1','-q:v','2',path.join(out,'posters',film.id+'.jpg')]);
  command('ffmpeg',['-v','error','-y','-i',temporary,'-vf','select=eq(n\\,60)+eq(n\\,180)+eq(n\\,300)+eq(n\\,420),scale=800:450,tile=2x2','-frames:v','1','-q:v','2',path.join(out,'contact-sheets',film.id+'.jpg')]);
  fs.renameSync(temporary,movie);
  receipt={id:film.id,title:film.title,engine:'studio',source:film.source,status:'verified',fingerprint:fp,inputs:inputs(film),sha256:hash(movie),bytes:fs.statSync(movie).size,width:1600,height:900,duration:16,fps:30,frames:480,decode:'PASS',nativeAudit:'PASS',visualReview:'PENDING',humanApproval:'NOT_RECORDED',audio:{codec:audio.codec_name,sampleRate:audio.sample_rate,channels:audio.channels},renderSeconds:(Date.now()-start)/1000};
  fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2));records.push(receipt);writeManifest();console.log('VERIFIED '+film.id+' / '+receipt.renderSeconds+'s');
}
console.log('COMPLETE '+records.length+' new Studio movies.');
