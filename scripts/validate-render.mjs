#!/usr/bin/env node
// Review artifacts only: encode lossless samples, then compare Chromium's decoded RGB.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { withBrowser } from './lib/browser.mjs';
import { bitrateFor, installEncoder, videoArgs } from './lib/encoding.mjs';
import { comparePixels } from './lib/ssim.mjs';
import { mediaServer } from './lib/media-server.mjs';
const args=process.argv.slice(2), opt=(k,d)=>{const i=args.indexOf('--'+k);return i<0?d:args[i+1];};
const names=args.filter((v,i)=>!v.startsWith('--')&&!args[i-1]?.startsWith('--'));
if(!names.length||!opt('out',null))throw new Error('usage: validate-render.mjs <example>... --out <work-dir> [--encoder browser|jpeg]');
const output=path.resolve(opt('out')), mode=opt('encoder','browser'), reports=[];
const videoDir=opt('video-dir',null);
for(const name of names){
 const dir=path.join(output,name);mkdirSync(dir,{recursive:true});
 await withBrowser(async({send,ev,onCleanup})=>{
  await send('Page.navigate',{url:pathToFileURL(path.resolve('examples',name,'index.html')).href+'?render=1&t=0'});
  for(let i=0;i<100;i++){await sleep(100);if(await ev('typeof __paint === "function"'))break;}
  await ev('document.fonts.ready.then(()=>true)');const info=await ev('__specInfo()');
  if(info.errors.length)throw new Error(info.errors.join('; '));
  const samples=Array.from({length:8},(_,i)=>({label:'clip '+i,t:Math.round(300*(i+.5)/8)/30}))
   .concat(info.shots,info.panels.map(p=>({label:`${p.kind} ${p.page??''}`.trim(),t:p.from+(p.to-p.from)*.65}))).map(s=>({...s,t:Number((Math.round(s.t*30)/30).toFixed(5))}));
  const size=await ev('({width:MX.ctx.canvas.width,height:MX.ctx.canvas.height})'),bitrate=bitrateFor({...size,parts:info.parts,fps:30});
  const browser=!videoDir&&mode==='browser'&&await ev(`(${installEncoder.toString()})(${JSON.stringify({fps:30,bitrate,blur:4,shutter:.5})})`);
  if(!videoDir&&mode==='browser'&&!browser)throw new Error('H.264 unsupported');
  const file=videoDir?path.resolve(videoDir,name+'.mp4'):path.join(dir,'samples.mp4');
  if(videoDir){
   for(const[i,s]of samples.entries()){
    const png=await ev(`__frame(${s.t},4,.5)`);writeFileSync(path.join(dir,`ref-${i}.png`),Buffer.from(png.split(',')[1],'base64'));
   }
   console.log(name,'captured',samples.length,'references for full film');
  }else{
  const enc=spawn(process.env.FFMPEG||'ffmpeg',videoArgs({browser,fps:30,crf:17,preset:'medium',out:file}),{stdio:['pipe','ignore','pipe']});
  let err='';enc.stderr.on('data',d=>err+=d);enc.stdin.on('error',()=>{});
  const finished=new Promise((r,j)=>{enc.once('error',j);enc.once('close',c=>c===0?r():j(new Error(err)));});
  const detach=onCleanup(()=>enc.kill());
  const write=async b=>{if(!enc.stdin.write(b))await new Promise((r,j)=>{
   const drain=()=>{enc.stdin.off('error',fail);r();},fail=e=>{enc.stdin.off('drain',drain);j(e);};enc.stdin.once('drain',drain);enc.stdin.once('error',fail);
  });};
  for(const[i,s]of samples.entries()){
   if(browser)await ev(`__video.step(${i},${s.t})`);else await ev(`__paint(${s.t},4,.5);true`);
   const png=await ev("MX.ctx.canvas.toDataURL('image/png')");writeFileSync(path.join(dir,`ref-${i}.png`),Buffer.from(png.split(',')[1],'base64'));
   if(browser)await write(Buffer.from(await ev('__video.drain()'),'base64'));
   else await write(Buffer.from((await ev("MX.ctx.canvas.toDataURL('image/jpeg',.97)")).split(',')[1],'base64'));
  }
  if(browser){await ev('__video.finish()');await write(Buffer.from(await ev('__video.drain()'),'base64'));}
  enc.stdin.end();await finished;detach();console.log(name,'encoded',samples.length,'samples');
  }
  const files={'/video.mp4':file};samples.forEach((_,i)=>files[`/ref-${i}.png`]=path.join(dir,`ref-${i}.png`));
  const server=await mediaServer(files);
  try{
   await send('Page.navigate',{url:server.url});
   for(let i=0;i<50;i++){await sleep(50);if(await ev(`location.href===${JSON.stringify(server.url)}&&document.readyState==='complete'`))break;}
   await ev(`(async()=>{
    window.__compare=${comparePixels.toString()};const v=window.__v=document.createElement('video');v.muted=true;v.preload='auto';
    const loaded=new Promise((r,j)=>{const t=setTimeout(()=>j(new Error('video load timeout')),15000);v.onloadeddata=()=>{clearTimeout(t);r();};v.onerror=()=>j(new Error(v.error?.message));});
    v.src='/video.mp4';document.body.appendChild(v);await loaded;return true;
   })()`);
   const rows=[];
   for(const[i,sample]of samples.entries()){
    const {png,...metric}=await ev(`(async()=>{
     const v=window.__v;const seek=new Promise((r,j)=>{const t=setTimeout(()=>j(new Error('seek timeout at ${i}')),10000);v.onseeked=()=>{clearTimeout(t);r();};});v.currentTime=${videoDir?sample.t+0.5/30:(i+0.5)/30};await seek;
     await new Promise(r=>setTimeout(r,50));const c=document.createElement('canvas'),ref=document.createElement('canvas');c.width=ref.width=v.videoWidth;c.height=ref.height=v.videoHeight;
     const x=c.getContext('2d',{willReadFrequently:true}),y=ref.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0);
     const img=new Image();img.src='/ref-${i}.png';await img.decode();y.drawImage(img,0,0);
     return {...__compare(x.getImageData(0,0,c.width,c.height).data,y.getImageData(0,0,c.width,c.height).data,c.width,c.height),png:c.toDataURL('image/png')};
    })()`);
    writeFileSync(path.join(dir,`decoded-${i}.png`),Buffer.from(png.split(',')[1],'base64'));rows.push({...sample,...metric});
   }
   const mean=rows.reduce((s,r)=>s+r.ssim,0)/rows.length,clip=rows.slice(0,8),color={meanAbs:clip.reduce((s,r)=>s+r.meanAbs,0)/8,bias:[0,1,2].map(k=>clip.reduce((s,r)=>s+r.bias[k],0)/8)};
   const report={name,encoder:mode,bitrate,size,duration:info.duration,samples:rows,meanSSIM:mean,clipColor:color,visualReview:'pending'};
   writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));reports.push(report);console.log(name,'SSIM',mean.toFixed(5),'clip colour',JSON.stringify(color),'panels',info.panels.length);
  }finally{await server.close();}
 },{timeout:30000,retries:0});
}
writeFileSync(path.join(output,'report.json'),JSON.stringify(reports,null,2));
if(reports.some(r=>r.meanSSIM<.93))process.exitCode=1;
