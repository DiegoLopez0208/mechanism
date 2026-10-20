#!/usr/bin/env node
// Regeneration is always explicit; npm test never overwrites golden evidence.
import fs from 'node:fs';
import path from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';
import { examples, width, height, root, withExample, sampleTimes, capture, compareFrame } from './lib/visual.mjs';
const update = process.argv.includes('--update'), names = process.argv.slice(2).filter(x => !x.startsWith('--'));
const dir = path.join(root, 'tests', 'goldens', process.platform);
if (update) fs.mkdirSync(dir, { recursive: true });
let failures = 0;
for (const name of names.length ? names : examples) {
  await withExample(name, async (b, info) => {
    const metaPath = path.join(dir, name + '.json'), dataPath = path.join(dir, name + '.rgb.deflate');
    const metadata = update ? { version: 1, width, height, channels: 3, frames: sampleTimes(info) } : JSON.parse(fs.readFileSync(metaPath));
    if (metadata.width !== width || metadata.height !== height) throw new Error('golden dimensions differ');
    const size = width * height * 3, reference = update ? null : inflateSync(fs.readFileSync(dataPath)), frames = [];
    if (reference && reference.length !== size * metadata.frames.length) throw new Error('invalid golden length');
    for (const [i, frame] of metadata.frames.entries()) {
      const actual = await capture(b, frame.t); frames.push(actual);
      if (update) console.log(name, frame.label, 'captured');
      else {
        const r = compareFrame(actual, reference.subarray(i * size, (i + 1) * size));
        console.log(name, frame.label, r.ok ? 'ok' : 'FAIL', 'SSIM', r.ssim.toFixed(6), 'worst tile', r.min.toFixed(4));
        if (!r.ok) failures++;
      }
    }
    if (update) { fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + '\n'); fs.writeFileSync(dataPath, deflateSync(Buffer.concat(frames), { level: 9 })); }
  });
}
if (failures) process.exitCode = 1;
