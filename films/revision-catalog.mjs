import fs from 'node:fs';
import vm from 'node:vm';
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('./studio-revision/catalog.js',import.meta.url),'utf8'),ctx);
export const revisionFilms=[{
  id:'revision-bearing',engine:'studio',source:'films/bearing-revision',title:'6205 / bearing construction',
  question:'See the raceways, balls and formed cage.',limit:'Published NSK envelope and ball data. Raceway and cage geometry remain approximate. Silent 12 s study.',
  viewer:'films/bearing-revision/index.html',evidencePath:'films/bearing-revision/NOTES.md',evidenceLabel:'Sources & estimates'
},...ctx.window.STUDIO_REVISION.map(meta=>({
  id:'revision-'+meta.id,engine:'studio',source:'films/studio-revision',title:meta.title,
  question:meta.chapters[0][0]+'.',limit:'12 s construction study. '+meta.estimated+'.',
  viewer:'films/studio-revision/index.html?item='+meta.id,evidencePath:'films/studio-revision/notes/'+meta.id+'.md',evidenceLabel:'Sources & estimates'
}))];
