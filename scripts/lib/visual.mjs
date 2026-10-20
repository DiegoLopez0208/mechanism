import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { withBrowser } from './browser.mjs';
import { comparePixels } from './ssim.mjs';

export const examples = ['hub', 'switch', 'enigma', 'k20a', 'rubik', 'rtx4090', 'mos6502', 'rar5', 'winrar', 'lock', 'react'];
export const width = 360, height = 450;
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Capture the figure for mutation tests without adding a debug global to the kit.
const hook = `let mx={};Object.defineProperty(window,'MX',{get:()=>mx,set:v=>{mx=v;
 if(!Object.getOwnPropertyDescriptor(mx,'figure')?.get){let figure;Object.defineProperty(mx,'figure',{configurable:true,get:()=>figure,set:fn=>{figure=(...args)=>{window.__testFigure=fn(...args);return __testFigure;};}});}
}});window.MX=mx;`;

export async function withExample(name, fn) {
  return withBrowser(async b => {
    await b.send('Page.enable'); await b.send('Page.addScriptToEvaluateOnNewDocument', { source: hook });
    await b.send('Page.navigate', { url: pathToFileURL(path.join(root, 'examples', name, 'index.html')).href + '?render=1&t=0' });
    for (let i = 0; i < 150; i++) { await sleep(100); if (await b.ev('typeof __paint === "function"')) break; }
    await b.ev('document.fonts.ready.then(() => true)');
    const info = await b.ev('__specInfo()');
    if (info.errors.length) throw new Error(info.errors.join('; '));
    return fn(b, info);
  }, { timeout: 90000, retries: 0 });
}

export function sampleTimes(info) {
  const mode = info.shots.find(s => s.label.startsWith('mode ')) || info.shots[0];
  const claim = info.panels.find(p => p.kind === 'claims'), receipt = info.panels.find(p => p.kind === 'verdict');
  return [mode, info.shots.find(s => s.label === 'exploded'),
    { label: 'claims', t: claim.from + (claim.to - claim.from) * 0.65 },
    { label: 'receipt', t: receipt.from + (receipt.to - receipt.from) * 0.65 }];
}

export async function capture(b, t) {
  const base64 = await b.ev(`(() => {
    __paint(${t},1,.5); const c=document.createElement('canvas');c.width=${width};c.height=${height};
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(MX.ctx.canvas,0,0,c.width,c.height);
    const rgba=x.getImageData(0,0,c.width,c.height).data,rgb=new Uint8Array(c.width*c.height*3);
    for(let i=0,j=0;i<rgba.length;i+=4){rgb[j++]=rgba[i];rgb[j++]=rgba[i+1];rgb[j++]=rgba[i+2];}
    let s='';for(let i=0;i<rgb.length;i+=0x8000)s+=String.fromCharCode(...rgb.subarray(i,i+0x8000));return btoa(s);
  })()`);
  return Buffer.from(base64, 'base64');
}

export function compareFrame(actual, expected) {
  const result = comparePixels(actual, expected, width, height, 3);
  // A tiny displaced part must not be diluted by a mostly unchanged background.
  return { ...result, ok: result.ssim >= 0.985 && result.min >= 0.35 && result.badFraction <= 0.03 };
}
