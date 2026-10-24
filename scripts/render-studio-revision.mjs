import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {withBrowser} from './lib/browser.mjs';
import {videoArgs} from './lib/encoding.mjs';
import {revisionInputs} from './lib/revision-inputs.mjs';
const repo=path.resolve(import.meta.dirname,'..'),src=path.join(repo,'films/studio-revision');
const outputAt=process.argv.indexOf('--out');
if(outputAt<0||!process.argv[outputAt+1])throw Error('--out <external output directory> is required');
const out=path.resolve(process.argv[outputAt+1]);
fs.mkdirSync(out,{recursive:true});
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(src,'catalog.js'),'utf8'),ctx);const catalog=ctx.window.STUDIO_REVISION;
const selected=process.argv.find(x=>x.startsWith('--only='))?.slice(7),items=selected?catalog.filter(x=>selected.split(',').includes(x.id)):catalog;
const mode=process.argv.includes('--render')?'render':'stills';
const files=['catalog.js','geometry.js','models.js','models-fluid.js','director.js','index.html'];
const expectedInputs=revisionInputs(repo);
const require=createRequire(import.meta.url),sharp=require('sharp');
const decode=s=>Buffer.from(s.split(',')[1],'base64');
const write=async(stream,buf)=>{if(!stream.write(buf))await new Promise((resolve,reject)=>{const drain=()=>{stream.off('error',fail);resolve();},fail=e=>{stream.off('drain',drain);reject(e);};stream.once('drain',drain);stream.once('error',fail);});};
for(const item of items){
  const fingerprint=expectedInputs.items[item.id].fingerprint,digest=()=>revisionInputs(repo).items[item.id].fingerprint;
  const dir=path.join(out,item.id);fs.mkdirSync(dir,{recursive:true});
  if(mode==='render'&&fs.existsSync(path.join(dir,'receipt.json'))){const rec=JSON.parse(fs.readFileSync(path.join(dir,'receipt.json')));if(rec.fingerprint===fingerprint&&fs.existsSync(path.join(dir,item.id+'.mp4'))&&crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,item.id+'.mp4'))).digest('hex')===rec.sha256){console.log('REUSE '+item.id);continue;}}
  console.log(mode.toUpperCase()+' '+item.id);
  await withBrowser(async({send,ev,progress,onCleanup,stopWatchdog})=>{
    await send('Page.enable');await send('Page.navigate',{url:pathToFileURL(path.join(src,'index.html')).href+'?render=1&item='+item.id});
    for(let i=0;i<120;i++){if(await ev('typeof __frame === "function"'))break;await new Promise(r=>setTimeout(r,150));if(i===119)throw Error(await ev('document.title'));}
    const poses=[];
    for(const t of [0,1,2,3.8,4.2,6,7.8,8.2,10,11.9]){
      await ev(`__paint(${t},1)`);progress();const d=await ev('__revisionDiagnostics()');
      if(d.contextLost||!d.screenBounds.every(Number.isFinite)||d.screenBounds[0]<525||d.screenBounds[1]<125||d.screenBounds[2]>1540||d.screenBounds[3]>808)throw Error('Invalid framing: '+JSON.stringify(d));
      const finite=await ev('(()=>{let valid=true;__revision.m.root.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))valid=false;});return valid;})()');if(!finite)throw Error('Invalid transform');
      if(t<8){if(item.id==='slider'&&Math.abs(d.rod-46)>1e-6)throw Error('Rod constraint');if(item.id==='cam'&&Math.abs(d.contactDistance-23)>1e-6)throw Error('Cam contact');if(['rack','screw'].includes(item.id)&&Math.abs(d.error)>1e-6)throw Error('Lead/travel constraint');if(item.id==='universal'&&d.pivotOrthogonalityError>1e-6)throw Error('Joint axes');}
      poses.push(d);
    }
    const hashes=[],images=[],matrices=[];
    for(const t of [2,6,10,2]){const png=decode(await ev(`__frame(${t},1,.5,'png')`));fs.writeFileSync(path.join(dir,'still-'+t+'.png'),png);hashes.push(crypto.createHash('sha256').update(png).digest('hex'));images.push(png);matrices.push(await ev('JSON.stringify(__revision.m.parts.map(p=>p.o.matrixWorld.elements))'));progress();}
    let repeat={exactBytes:hashes[0]===hashes[3],exactTransforms:matrices[0]===matrices[3],maxChannelDifference:0,meanChannelDifference:0};
    if(!repeat.exactBytes){const a=await sharp(images[0]).removeAlpha().raw().toBuffer(),b=await sharp(images[3]).removeAlpha().raw().toBuffer();let sum=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);sum+=d;repeat.maxChannelDifference=Math.max(repeat.maxChannelDifference,d);}repeat.meanChannelDifference=sum/a.length;}
    repeat.rasterTolerance={meanChannelDifference:.01,maxChannelDifference:32};
    if(!repeat.exactTransforms||repeat.meanChannelDifference>.01||repeat.maxChannelDifference>32)throw Error('Non-repeatable source: '+JSON.stringify(repeat));
    const thumbs=[];for(const t of [2,6,10])thumbs.push({input:await sharp(path.join(dir,'still-'+t+'.png')).resize(800,450).png().toBuffer(),left:0,top:450*thumbs.length});
    await sharp({create:{width:800,height:1350,channels:3,background:'#071322'}}).composite(thumbs).jpeg({quality:94}).toFile(path.join(dir,'contact.jpg'));
    fs.writeFileSync(path.join(dir,'native-checks.json'),JSON.stringify({fingerprint,effectiveInputs:expectedInputs.items[item.id],poses,repeatability:repeat,frameHashes:hashes,limits:'Exact transforms required. GPU raster differences measured separately; not claimed byte-identical. No load simulation or manufacturer CAD fidelity claim.'},null,2));
    if(mode==='stills')return;
    if(digest()!==fingerprint)throw Error('Sources changed before rendering');
    const tmp=path.join(dir,item.id+'.rendering.mp4'),final=path.join(dir,item.id+'.mp4');
    const encoder=spawn('ffmpeg',videoArgs({browser:false,fps:30,crf:'17',preset:'medium',out:tmp,input:'png'}),{stdio:['pipe','ignore','pipe']});let err='';encoder.stderr.on('data',b=>err=(err+b).slice(-2500));let encError=null;encoder.on('error',e=>encError=e);encoder.stdin.on('error',e=>encError=e);const done=new Promise(r=>encoder.on('close',r));const detach=onCleanup(()=>{encoder.stdin.destroy();encoder.kill();});
    let frameBounds=[Infinity,Infinity,-Infinity,-Infinity];
    for(let i=0;i<360;i++){if(encError)throw encError;const result=await ev(`(()=>{const frame=__frame(${i}/30,1,.5,'png');return {frame,bounds:__revisionDiagnostics().screenBounds};})()`),b=result.bounds;if(!b.every(Number.isFinite)||b[0]<525||b[1]<125||b[2]>1540||b[3]>808)throw Error('Frame '+i+' outside safe area '+JSON.stringify(b));frameBounds=[Math.min(frameBounds[0],b[0]),Math.min(frameBounds[1],b[1]),Math.max(frameBounds[2],b[2]),Math.max(frameBounds[3],b[3])];await write(encoder.stdin,decode(result.frame));progress();if(i%90===0)console.log(item.id+' '+i+'/360');}
    encoder.stdin.end();if(await done!==0)throw Error(err);detach();stopWatchdog();if(digest()!==fingerprint)throw Error('Sources changed during rendering');
    const probe=spawnSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',tmp],{encoding:'utf8'});if(probe.status)throw Error(probe.stderr);const metadata=JSON.parse(probe.stdout),v=metadata.streams.find(s=>s.codec_type==='video');if(v.nb_read_frames!=='360'||v.width!==1600||v.height!==900||v.r_frame_rate!=='30/1'||Math.abs(Number(metadata.format.duration)-12)>.02)throw Error('Invalid output '+JSON.stringify(v));
    const decoded=spawnSync('ffmpeg',['-hide_banner','-v','error','-i',tmp,'-f','null','-'],{encoding:'utf8'});if(decoded.status!==0||decoded.stderr.trim())throw Error('Decode failure '+decoded.stderr);
    fs.renameSync(tmp,final);
    const receipt={id:item.id,fingerprint,effectiveInputs:expectedInputs.items[item.id],sha256:crypto.createHash('sha256').update(fs.readFileSync(final)).digest('hex'),frames:360,width:1600,height:900,fps:30,duration:12,frameBounds,audio:'none; silent construction study',metadata,completeDecode:true,source:item.source,known:item.known,estimated:item.estimated,visualReview:'Codex three chapter stills; user approval of new individual films pending'};
    fs.writeFileSync(path.join(dir,'receipt.json'),JSON.stringify(receipt,null,2));console.log('DONE '+item.id);
  },{timeout:120000});
}
console.log(mode.toUpperCase()+' COMPLETE '+items.length);
