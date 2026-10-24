import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
export function revisionInputs(repo){
  const src=path.join(repo,'films/studio-revision'),read=f=>fs.readFileSync(path.join(src,f),'utf8'),files=['catalog.js','geometry.js','models.js','models-fluid.js','director.js','index.html'];
  const context={window:{RevisionGeometry:{}}};vm.runInNewContext(read('catalog.js'),context);vm.runInNewContext(read('models.js'),context);vm.runInNewContext(read('models-fluid.js'),context);
  const shared={};for(const file of ['catalog.js','geometry.js','director.js','index.html'])shared['films/studio-revision/'+file]=sha(read(file));
  for(const file of ['boot.js','fonts.js','manifest.js','vendor/three.bundle.js','iso.js','core.js','presentation.js','geom2d.js','gl.js','parts.js'])shared['kit/'+file]=sha(fs.readFileSync(path.join(repo,'kit',file)));
  const prefixes=[read('models.js').split('B.spur=')[0],read('models-fluid.js').split('B.universal=')[0]];
  shared.modelHelpers=sha(prefixes.join('\0'));
  const items={};for(const meta of context.window.STUDIO_REVISION){const factory=String(context.window.RevisionModels[meta.id]);items[meta.id]={factorySha256:sha(factory),shared,fingerprint:sha(JSON.stringify({id:meta.id,shared,factory}))};}
  return {legacyGlobalFingerprint:sha(files.map(read).join('\0')),items};
}
