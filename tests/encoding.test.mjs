import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { bitrateFor, installEncoder, videoArgs, jpegConversion } from '../scripts/lib/encoding.mjs';

test('JPEG conversion changes the samples as well as the colour tags', () => {
  const a = videoArgs({ browser: false, fps: 30, crf: 17, preset: 'medium', out: 'v.mp4' });
  assert.equal(a[a.indexOf('-vf') + 1], jpegConversion);
  for (const [flag, value] of [['-pix_fmt', 'yuv420p'], ['-color_range', 'tv'], ['-colorspace', 'bt709'], ['-color_trc', 'iec61966-2-1']]) assert.equal(a[a.indexOf(flag) + 1], value);
});
test('Annex B input has an explicit demuxer and input rate, and is copied', () => {
  const a = videoArgs({ browser: true, fps: 30, out: 'v.mp4' });
  assert.deepEqual(a.slice(3, 9), ['-f', 'h264', '-r', '30', '-i', '-']);
  assert.equal(a[a.indexOf('-c:v') + 1], 'copy'); assert.ok(!a.includes('-framerate'));
});
test('bitrate scales with pixels, fps and complexity; draft has a lower budget', () => {
  const a = { width: 720, height: 900, fps: 30, parts: 20 }, b = bitrateFor(a);
  assert.equal(bitrateFor({ ...a, width: 1440 }), b * 2);
  assert.equal(bitrateFor({ ...a, fps: 60 }), b * 2);
  assert.ok(bitrateFor({ ...a, parts: 173 }) > b);
  assert.ok(bitrateFor({ ...a, draft: true }) < b);
});
test('unsupported WebCodecs returns false before painting (safe JPEG fallback)', async () => {
  assert.equal(await vm.runInNewContext(`(${installEncoder.toString()})({})`), false);
  const context = { window: { __paint() { throw new Error('must not paint'); } }, VideoFrame: class {}, document: { getElementById: () => ({ width: 720, height: 900 }) }, VideoEncoder: class { static async isConfigSupported() { return { supported: false }; } } };
  assert.equal(await vm.runInNewContext(`(${installEncoder.toString()})({fps:30})`, context), false);
});
test('CPU frames have explicit limited-range BT.709 planes; GPU input is unchanged', async () => {
  for (const rgb of [[255,0,0],[255,255,255],[0,0,0]]) for (const cpu of [false,true]) {
    let frame,reads=0,paints=0;
    const pixels=Uint8ClampedArray.from([...rgb,255,...rgb,255,...rgb,255,...rgb,255]);
    const canvas={width:2,height:2,getContext:()=>({getContextAttributes:()=>({willReadFrequently:cpu}),getImageData(){reads++;return{data:pixels};}})};
    const window={__paint(){paints++;return canvas;}};
    const context={window,document:{getElementById:()=>canvas},VideoFrame:class{constructor(source,init){this.source=source;this.init=init;}close(){}},
      VideoEncoder:class{static async isConfigSupported(){return{supported:true};}configure(){}encode(value){frame=value;}close(){}}};
    assert.equal(await vm.runInNewContext('('+installEncoder.toString()+')({fps:30,bitrate:3000000,blur:1,shutter:.5})',context),true);
    await window.__video.step(0,0);assert.equal(paints,1);assert.equal(reads,cpu?1:0);
    if(!cpu){assert.equal(frame.source,canvas);continue;}
    assert.equal(frame.init.format,'I420');assert.equal(frame.init.colorSpace.matrix,'bt709');assert.equal(frame.init.colorSpace.fullRange,false);
    const [y,u,v]=rgb[0]===0?[16,128,128]:rgb[1]===255?[235,128,128]:[63,102,240];
    assert.deepEqual(Array.from(frame.source),[y,y,y,y,u,v]);
  }
});
