/* Paper: Canvas2D technical drawing engine. Three's geometry/math is only a
 * model-data adapter: there is no WebGL renderer, shaded image or Studio frame. */
(function (g) {
  'use strict';
  const MX=g.MX=g.MX||{}, E=MX.paperEngine={}, P=MX.presentation;
  const {text,line,box,smooth}=P.util;
  E.project=(p,view)=>view==='top'?[p[0],p[2]]:view==='side'?[p[2],-p[1]]:[p[0],-p[1]];
  E.fit=(points,rect)=>{
    let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
    points.forEach(p=>{left=Math.min(left,p[0]);right=Math.max(right,p[0]);top=Math.min(top,p[1]);bottom=Math.max(bottom,p[1]);});
    if(!points.length)return p=>[rect.x+rect.w/2,rect.y+rect.h/2];
    const k=Math.min(rect.w/Math.max(.001,right-left),rect.h/Math.max(.001,bottom-top));
    return p=>[rect.x+rect.w/2+(p[0]-(left+right)/2)*k,rect.y+rect.h/2+(p[1]-(top+bottom)/2)*k];
  };
  // Geometry compilation uses the figure's scene graph, but never G.stage.
  // Supply the minimal mathematical stage needed by that compiler and exports.
  E.stage=o=>{
    const TH=g.THREE,scene=new TH.Scene();
    return {scene,camera:null,key:{position:new TH.Vector3()},floor:new TH.Group(),aoSkip:[],ao:{updateGtaoMaterial(){}},
      setView(){},
      project(x,y,z){const p=E.project([x,z,-y],'front');return[o.w/2+p[0],o.h/2+p[1]];},
      render(){throw new Error('Paper is a vector engine: shaded rendering is forbidden');},
      blit(){throw new Error('Paper cannot composite a Studio image');}};
  };
  function silhouettes(geometry){
    const TH=g.THREE,pos=geometry.attributes.position,idx=geometry.index,edges=new Map();
    for(let i=0;i<(idx?idx.count:pos.count);i+=3){
      const v=[0,1,2].map(j=>new TH.Vector3().fromBufferAttribute(pos,idx?idx.getX(i+j):i+j));
      const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
      const keys=v.map(p=>p.toArray().map(n=>Math.round(n*1e5)).join(','));
      for(let j=0;j<3;j++){
        const k=(j+1)%3,key=[keys[j],keys[k]].sort().join('/');
        if(!edges.has(key))edges.set(key,{ends:[v[j].clone(),v[k].clone()],normals:[]});
        edges.get(key).normals.push(normal.clone());
      }
    }
    return Array.from(edges.values());
  }
  function meshEdges(parts){
    const TH=g.THREE;
    return parts.map(part=>{
      const meshes=[];
      part.group.traverse(mesh=>{
        if(!mesh.isMesh||!mesh.geometry)return;
        const geometry=new TH.EdgesGeometry(mesh.geometry,35),pos=geometry.attributes.position;
        meshes.push({mesh,points:pos.array.slice(),outline:silhouettes(mesh.geometry)});geometry.dispose();
      });return{part,meshes};
    });
  }
  function worldLines(cache){
    const TH=g.THREE,v=new TH.Vector3();
    return cache.map(({part,meshes})=>{
      const segments=[],outline=[];
      for(const {mesh,points,outline:edges} of meshes){
       const normalMatrix=new TH.Matrix3().getNormalMatrix(mesh.matrixWorld);
       for(const edge of edges)outline.push({ends:edge.ends.map(v=>v.clone().applyMatrix4(mesh.matrixWorld).toArray()),normals:edge.normals.map(n=>n.clone().applyNormalMatrix(normalMatrix).toArray())});
       for(let i=0;i<points.length;i+=6){
        const ends=[];for(let j=0;j<6;j+=3){v.set(points[i+j],points[i+j+1],points[i+j+2]).applyMatrix4(mesh.matrixWorld);ends.push(v.toArray());}segments.push(ends);
       }
      }
      return{part,segments,outline};
    });
  }
  function prepare(entries) {
    for(const entry of entries){
      entry.views={};
      for(const view of ['front','top','side']){
        const axis=view==='top'?1:view==='side'?0:2;
        const outline=entry.outline.filter(e=>e.normals.length===1||e.normals.some(n=>(n[axis]>1e-7)!==(e.normals[0][axis]>1e-7))).map(e=>e.ends);
        const points=entry.segments.concat(outline).flatMap(s=>s.flatMap(p=>E.project(p,view)));
        let l=Infinity,r=-Infinity,t=Infinity,b=-Infinity;
        for(let i=0;i<points.length;i+=2){l=Math.min(l,points[i]);r=Math.max(r,points[i]);t=Math.min(t,points[i+1]);b=Math.max(b,points[i+1]);}
        entry.views[view]={points:Float32Array.from(points),bounds:[l,t,r,b],offset:E.project(entry.offset,view)};
      }
    }
  }
  function drawing(c,entries,view,rect,T,active,fraction=1,all=false,explode=0){
    let l=Infinity,r=-Infinity,t=Infinity,b=-Infinity;
    for(const entry of entries){const v=entry.views[view],dx=v.offset[0]*explode,dy=v.offset[1]*explode;
      l=Math.min(l,v.bounds[0]+dx);r=Math.max(r,v.bounds[2]+dx);t=Math.min(t,v.bounds[1]+dy);b=Math.max(b,v.bounds[3]+dy);}
    const k=Math.min(rect.w/Math.max(.001,r-l),rect.h/Math.max(.001,b-t)),cx=(l+r)/2,cy=(t+b)/2;
    const fit=p=>[rect.x+rect.w/2+(p[0]-cx)*k,rect.y+rect.h/2+(p[1]-cy)*k];
    for(const entry of entries){
      const v=entry.views[view],points=v.points,part=entry.part,selected=part.id===active,estimated=part.spec.conf==='estimated';
      c.save();c.translate(rect.x+rect.w/2,rect.y+rect.h/2);c.scale(k,k);c.translate(-cx+v.offset[0]*explode,-cy+v.offset[1]*explode);
      c.beginPath();c.setLineDash(estimated?[7/k,5/k]:[]);
      const limit=Math.floor(points.length/4*fraction)*4;
      for(let i=0;i<limit;i+=4){c.moveTo(points[i],points[i+1]);c.lineTo(points[i+2],points[i+3]);}
      c.strokeStyle=estimated?T.ember:selected?T.teal:T.ink;c.globalAlpha=(all||selected)?.95:.46;c.lineWidth=(selected?2.2:1.15)/k;c.stroke();c.restore();
    }
    return fit;
  }
  /* ---- the section scene: how a pin tumbler lock works, drawn as a technical section from the published keying table.
   * Every number comes from spec.paperScene (the table the gate checks); this code only draws and animates it. */
  const sg = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
  const label = (c, s, x, y, size, color, weight = 600, align = 'center') => { c.font = weight + ' ' + size + 'px ' + MX.SANS; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = color; c.fillText(s, x, y); };
  const pill = (c, s, x, y, size, fill, color) => { c.font = '700 ' + size + 'px ' + MX.SANS; const w = c.measureText(s).width + size * 1.3; box(c, x - w / 2, y - size * 1.05, w, size * 1.6, fill, null, size * .8); label(c, s, x, y, size, color, 700); };
  const inch = v => v.toFixed(3).replace(/^0/, '');
  const sceneSteps = (scene) => {
    const total = i => scene.depth[scene.code[i] - 1] + scene.pin[scene.code[i] - 1], base = total(0), wrongSum = scene.depth[scene.wrong[2] - 1] + scene.pin[scene.code[2] - 1];
    return [
      { index: 0, title: 'The lock, cut open', formula: 'A side section: the housing above, the plug below, and between them the shear line (' + inch(scene.plug) + ' in). Five spring-loaded pin stacks cross it.', value: scene.code.length + ' pin stacks', conf: 'derived' },
      { index: 1, title: 'Without the key', formula: 'The springs push every driver pin down into the plug. The stacks cross the shear line, so the plug cannot turn.', value: 'LOCKED', conf: 'derived' },
      { index: 2, title: 'The right key goes in', formula: 'Each cut lets a stack rise by a different amount. Key pin plus cut depth is ' + inch(base) + ' in for all five.', value: inch(base) + ' in', conf: 'derived' },
      { index: 3, title: 'Every split on the shear line', formula: 'The gap between key pin and driver pin lands on the line within ' + inch(Math.abs(base - scene.plug)) + ' in. Nothing crosses it: the plug turns.', value: 'FREE', conf: 'derived' },
      { index: 4, title: 'A wrong key', formula: 'One cut is three steps off (cut ' + scene.wrong[2] + ' instead of cut ' + scene.code[2] + '). That split sits ' + inch(Math.abs(wrongSum - scene.plug)) + ' in from the line and the plug stays locked.', value: 'LOCKED', conf: 'derived' },
    ];
  };
  const hatch = (c, x, y, w, h, dir, gap, color) => {      // diagonal section lines inside a rectangle
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = color; c.lineWidth = 1.3; c.beginPath();
    for (let o = -h; o < w + h; o += gap) { c.moveTo(x + o, dir > 0 ? y + h : y); c.lineTo(x + o + h * dir, dir > 0 ? y : y + h); } c.stroke(); c.restore();
  };
  function section(c, a, k) {
    const { scene, T, W, H, FS } = k, IN = scene.inch, cx = i => (scene.first + i * scene.pitch) * IN, S = scene.plug * IN, N = scene.code.length, tall = H >= 1600;
    const idx = a.intro ? -1 : a.closing ? 3 : a.index, p = a.closing || a.intro ? 1 : a.progress, ink = T.ink, AMBER = T.dark ? '#f2c14e' : '#b45f06', ON = T.dark ? '#14191f' : '#ffffff';
    const kk = Math.min((W - 140) / 40, H * (tall ? .39 : .4) / 31), left = (W - 40 * kk) / 2, top = H * .17, X = x => left + (x + 3) * kk, Y = y => top + (scene.cap + 4.5 - y) * kk;
    const OUT = -scene.tip - 4, drawn = a.intro ? sg(a.t, 0, 1.6) : 1;
    let dx = OUT, code = scene.code;      // which key is in and how far (key shoulder at dx, in mm)
    if (idx === 2) dx = OUT * (1 - smooth(sg(p, .06, .94)));
    else if (idx === 3) dx = 0;
    else if (idx === 4) { if (p < .22) dx = OUT * smooth(p / .22); else { code = scene.wrong; dx = OUT * (1 - smooth(sg(p, .22, .78))); } }
    const prof = scene.profile(code), lift = i => { const xk = cx(i) - dx; return xk < 0 || xk >= scene.tip ? 0 : prof(xk); };
    const pinH = i => scene.pin[scene.code[i] - 1] * IN, split = i => lift(i) + pinH(i), drv = scene.driver;
    c.save(); c.beginPath(); c.rect(X(-3) - 6, Y(scene.cap + 4.5) - 4, 40 * kk + 12, (scene.cap + 4.5 + 2.4) * kk); c.clip();
    // housing and plug in section: hatched walls between the chambers, a cap above, a base below
    const wall = (a0, a1, y0, y1, dir, col) => { const x0 = X(a0), w = X(a1) - x0, yy = Y(y1), h = Y(y0) - Y(y1); c.save(); c.globalAlpha = drawn; hatch(c, x0, yy, w, h, dir, 11, MX.rgba(col, .5)); c.strokeStyle = ink; c.lineWidth = 2.4; c.strokeRect(x0, yy, w, h); c.restore(); };
    for (let q = 0; q <= N; q++) { const a0 = q === 0 ? -3 : cx(q - 1) + scene.chamber / 2, a1 = q === N ? 37 : cx(q) - scene.chamber / 2; wall(a0, a1, S, scene.cap, 1, T.mute); wall(a0, a1, scene.keyway, S, -1, T.teal); }
    wall(-3, 37, scene.cap, scene.cap + 3, 1, T.mute); wall(-3, 37, -1.6, 0, -1, T.teal);
    c.save(); c.globalAlpha = drawn; c.strokeStyle = T.teal; c.lineWidth = 2.6; c.setLineDash([14, 8]); c.beginPath(); c.moveTo(X(-3), Y(S)); c.lineTo(X(37), Y(S)); c.stroke(); c.restore();      // the shear line
    // pin stacks: key pin, driver pin and the spring above them
    for (let i = 0; i < N; i++) {
      const s = split(i), x = X(cx(i)), w = scene.pinR * 2 * kk, show = drawn * (a.intro ? sg(a.t, .7 + i * .12, 1.2 + i * .12) : 1);
      c.save(); c.globalAlpha = show;
      const kb = Y(lift(i)), ks = Y(s), dt = Y(s + drv), cap = Y(scene.cap);
      c.beginPath(); c.roundRect(x - w / 2, ks, w, kb - ks, 4); c.fillStyle = MX.rgba(T.teal, .22); c.fill(); c.strokeStyle = ink; c.lineWidth = 2.2; c.stroke();
      c.beginPath(); c.roundRect(x - w / 2, dt, w, ks - dt, 4); c.fillStyle = T.plate; c.fill(); c.strokeStyle = ink; c.lineWidth = 2.2; c.stroke();
      c.beginPath(); const coils = 9, sw = w * .45; c.moveTo(x, dt); for (let q = 1; q <= coils; q++) c.lineTo(x + (q % 2 ? sw : -sw), dt + (cap - dt) * q / (coils + 1)); c.lineTo(x, cap); c.strokeStyle = MX.rgba(ink, .75); c.lineWidth = 1.8; c.stroke();
      c.restore();
      if (idx >= 1 && show > .9) {      // where the split of each stack is: on the line (check) or a pin crosses it (warning)
        const onLine = Math.abs(s - S) < .12, across = (s < S - .12 && s + drv > S) || (s > S + .12 && lift(i) < S);
        if (onLine || across) { c.beginPath(); c.arc(x, Y(S), 12, 0, Math.PI * 2); c.fillStyle = onLine ? T.teal : AMBER; c.fill();
          if (onLine) { c.beginPath(); c.moveTo(x - 5, Y(S)); c.lineTo(x - 1, Y(S) + 4); c.lineTo(x + 6, Y(S) - 5); c.strokeStyle = ON; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); } else label(c, '!', x, Y(S) + 7, 19, ON, 800); }
      }
    }
    // the key: a real profile polygon with the V cuts, sliding in from the left
    if (dx > OUT + .2) { c.save(); c.beginPath(); c.moveTo(X(dx), Y(0)); c.lineTo(X(scene.tip + dx), Y(0)); for (let xk = scene.tip; xk >= 0; xk -= .1) c.lineTo(X(xk + dx), Y(prof(xk))); c.lineTo(X(dx), Y(prof(0))); c.closePath();
      c.fillStyle = T.plate; c.fill(); c.strokeStyle = ink; c.lineWidth = 2.6; c.lineJoin = 'round'; c.stroke(); c.restore(); }
    c.restore();
    // drafting callouts, one by one in the first stage
    const reveal = n => idx > 0 ? 1 : idx === 0 ? sg(p, .04 + n * .13, .2 + n * .13) : 0;
    const call = (s, tx, ty, px, py, n, side) => { const u = reveal(n); if (u <= 0) return; c.save(); c.globalAlpha = u; c.strokeStyle = T.teal; c.lineWidth = 1.6; c.beginPath(); c.moveTo(tx, ty - 8); c.lineTo(px, py); c.stroke(); c.beginPath(); c.arc(px, py, 5, 0, Math.PI * 2); c.fillStyle = T.teal; c.fill();
      c.font = '700 ' + 21 * FS + 'px ' + MX.SANS; const w = c.measureText(s).width + 22, x0 = side === 'right' ? tx - w : tx; box(c, x0, ty - 26 * FS, w, 36 * FS, T.paper, T.plateEdge, 6); label(c, s, x0 + 11, ty - 1, 21 * FS, T.ink, 700, 'left'); c.restore(); };
    call('HOUSING', W - 74, Y(scene.cap - 2.5), X(33), Y(scene.cap - 2.5), 0, 'right'); call('PLUG', W - 74, Y(10.6), X(33), Y(10.6), 1, 'right'); call('SHEAR LINE  ' + inch(scene.plug) + ' in', W - 74, Y(S) - 34 * kk / 23, X(35.5), Y(S), 2, 'right');
    call('SPRING', 74, Y(scene.cap + 1.7) + 6, X(cx(0)), Y(scene.cap - 2), 3, 'left'); call('DRIVER PIN', 74, Y(15.2), X(cx(0)), Y(split(0) + drv * .62), 4, 'left'); call('KEY PIN', 74, Y(3.2), X(cx(0)), Y(lift(0) + pinH(0) * .5), 5, 'left');
    if (idx >= 2 || a.closing) { c.save(); c.globalAlpha = idx === 2 ? sg(p, .1, .5) : 1; label(c, 'KEY', X(cx(N - 1) + 9), Y(2.4), 22 * FS, T.mute, 700, 'left'); c.restore(); }
    // the table under the drawing: cut depth + key pin height = the same sum in every column
    const ty = Y(-1.6) + 46 * (tall ? 1 : .8), row = 56 * FS, sumOf = i => scene.depth[code[i] - 1] + scene.pin[scene.code[i] - 1];
    if (idx >= 2) { c.save(); c.globalAlpha = idx > 2 ? 1 : sg(p, .5, .9);
      [['CUT', i => scene.depth[code[i] - 1]], ['PIN', i => scene.pin[scene.code[i] - 1]], ['SUM', sumOf]].forEach(([name, f], r) => { const yy = ty + r * row; label(c, name, 74, yy, 21 * FS, T.mute, 700, 'left');
        for (let i = 0; i < N; i++) { const v = f(i), good = Math.abs(sumOf(i) - scene.plug) < .0035, changed = code[i] !== scene.code[i]; label(c, inch(v), X(cx(i)), yy, 26 * FS, r === 2 ? (good ? T.teal : AMBER) : r === 0 && changed ? AMBER : ink, r === 2 ? 800 : 600); } });
      label(c, 'in  ·  plug ' + inch(scene.plug) + ' in, within ' + inch(.003), W - 74, ty + 2 * row, 20 * FS, T.mute, 600, 'right'); c.restore(); }
    const msg = idx === 1 ? ['PLUG BLOCKED', AMBER, sg(p, .35, .6)] : idx === 3 || a.closing ? ['PLUG FREE TO TURN', T.teal, a.closing ? 1 : sg(p, .2, .45)] : idx === 4 && p > .8 ? ['PLUG BLOCKED', AMBER, sg(p, .8, .92)] : null;
    if (msg) { c.save(); c.globalAlpha = msg[2]; pill(c, msg[0], W / 2, top - 22, 30 * FS, msg[1], ON); c.restore(); }
    return Y(-1.6) + (tall ? 290 : 190);      // where the caption starts: constant, so nothing jumps between stages
  }
  E.run=({spec,validation,config,F,W,H,length})=>{
    const plan=P.plan(spec,'paper',length),T=MX.THEME,cache=meshEdges(F.parts);
    const scene=spec.paperScene&&spec.paperScene.kind==='pin-section'?spec.paperScene:null;
    if(scene){plan.items=sceneSteps(scene);plan.slot=(plan.end-plan.begin)/plan.items.length;}
    const pose={t:0,e:0,mech:{ang:()=>0,step:0,phase:0},view:{yaw:0,pitch:0,zoom:1}};
    F.apply(pose,false);F.st.scene.updateMatrixWorld(true);const entries=worldLines(cache),TH=g.THREE;
    const origins=F.parts.map(p=>new TH.Vector3().setFromMatrixPosition(p.group.matrixWorld));
    F.apply({...pose,e:.55},false);F.st.scene.updateMatrixWorld(true);
    entries.forEach((entry,i)=>{entry.offset=new TH.Vector3().setFromMatrixPosition(entry.part.group.matrixWorld).sub(origins[i]).toArray();});
    // Technical explosion is translation-only. Cache contour topology and all
    // three orthographic projections once, then move vector paths analytically.
    prepare(entries);
    const viewCache=new Map();
    const cols=['A','B','C','D','E','F'];
    const shapeCheck=()=>F.parts.map(p=>{
      let ratio=1;p.group.traverse(m=>{const u=m.geometry?.userData;if(u?.areaRatio!=null&&Math.abs(u.areaRatio-1)>Math.abs(ratio-1))ratio=u.areaRatio;});return{id:p.id,ratio};
    }).filter(p=>Math.abs(p.ratio-1)>.01);
    return P.mount({plan,spec,validation,config,W,H,engine:'paper-vector2d',shapeCheck,diagnostics:()=>({renderer:'canvas2d-vector',studioFrames:0,projection:'orthographic'}),
      draw(c,a){
        const compact=H<1600,active=F.byId[a.item.id];
        const explode=smooth((a.t-2)/3)*(1-smooth((a.t-plan.end)/1.3));
        c.save();c.fillStyle=T.paper;c.fillRect(0,0,W,H);
        // Drawing-sheet registration, zone letters and restrained drafting grid.
        c.strokeStyle=T.plateEdge;c.lineWidth=1.5;c.strokeRect(35,35,W-70,H-70);
        c.strokeStyle=T.line;c.lineWidth=1;c.strokeRect(45,45,W-90,H-90);
        for(let i=0;i<6;i++){
          const x=45+(W-90)*(i+.5)/6;text(c,String(i+1),x-5,30,14,30,T.mute);
          const y=100+(H-210)*(i+.5)/6;text(c,cols[i],12,y,14,22,T.mute);
        }
        text(c,'PAPER / TECHNICAL DRAWING',72,91,19,W-144,T.teal,700);
        text(c,spec.title,72,148,compact?36:44,W-144,T.ink,500);
        if(!scene)text(c,'ORTHOGRAPHIC STUDY • NOT TO SCALE',72,204,17,W-144,T.mute);
        if(scene){
          text(c,'SECTION VIEW • DIMENSIONS FROM THE PUBLISHED KEYING TABLE',72,204,17,W-144,T.mute);
          const capY=section(c,a,{scene,T,W,H,plan,FS:compact?1:1.15});
          if(!a.closing){
            let y=capY;
            y+=text(c,'STEP '+String(a.index+1).padStart(2,'0')+' / '+plan.items.length,72,y,19,W-144,T.teal,700)+16;
            y+=text(c,a.item.title,72,y,compact?32:40,W-144,T.ink,600)+14;
            text(c,a.item.formula,72,y,compact?22:26,W-144,T.mute);
          }else{
            text(c,'DRAWING REVIEW / '+(validation.verdict?.state||'NOTHING CHECKED'),72,capY+20,compact?28:36,W-144,T.ink,700);
            text(c,(validation.verdict?.estimated||0)+' estimated claims • the pin diameter and driver length are estimates',72,capY+75,22,W-144,T.mute);
          }
          line(c,[45,H-110],[W-45,H-110],T.plateEdge,1.5);line(c,[W*.58,H-110],[W*.58,H-45],T.plateEdge,1);
          text(c,String(spec.fig||spec.id).toUpperCase()+' / '+config.background.toUpperCase(),72,H-72,17,W*.5,T.ink,600);
          text(c,'SHEET '+String(a.index+1).padStart(2,'0')+' / '+String(plan.items.length).padStart(2,'0'),W*.60,H-72,17,W*.32,T.mute);
          c.restore();return;
        }
        const main={x:100,y:255,w:W-200,h:H*(compact?.25:.30)};
        for(let x=100;x<=W-100;x+=50)line(c,[x,main.y],[x,main.y+main.h],MX.rgba(T.ink,.035),1);
        for(let y=main.y;y<=main.y+main.h;y+=50)line(c,[100,y],[W-100,y],MX.rgba(T.ink,.035),1);
        const detailY=H*(compact?.62:.65), insetY=main.y+main.h+70, insetH=Math.max(55,detailY-insetY-55);
        const drawViews=ctx=>{
          const fit=drawing(ctx,entries,'front',main,T,a.item.id,a.intro?smooth(a.t/2.4):1,a.intro||a.closing,explode);
          text(ctx,'01 / FRONT • '+(a.closing?'ASSEMBLED':'EXPLODED CONSTRUCTION'),100,main.y+main.h+28,16,W-200,T.mute);
          const left={x:110,y:insetY,w:(W-280)/2,h:insetH},right={...left,x:W/2+50};
          drawing(ctx,entries,'top',left,T,a.item.id,1,true,explode);drawing(ctx,entries,'side',right,T,a.item.id,1,true,explode);
          text(ctx,'02 / TOP',left.x,insetY+insetH+26,16,left.w,T.mute);text(ctx,'03 / SIDE',right.x,insetY+insetH+26,16,right.w,T.mute);
          return fit;
        };
        let fit;
        if(!a.intro&&(explode===0||explode===1)){
          const key=a.item.id+'/'+a.closing+'/'+explode;
          if(!viewCache.has(key)){
            const image=document.createElement('canvas');image.width=W;image.height=H;
            const ctx=image.getContext('2d',{willReadFrequently:true});viewCache.set(key,{image,fit:drawViews(ctx)});
          }
          const cached=viewCache.get(key);c.drawImage(cached.image,0,0);fit=cached.fit;
        }else fit=drawViews(c);
        line(c,[72,detailY-20],[W-72,detailY-20],T.plateEdge,1);
        if(!a.closing){
          let y=detailY+16;
          y+=text(c,'PART '+String(a.index+1).padStart(2,'0')+' / '+plan.items.length+' • '+String(a.item.conf).toUpperCase(),72,y,19,W-144,T.teal,700)+16;
          y+=text(c,a.item.title,72,y,compact?30:38,W-144,T.ink,600)+15;
          y+=text(c,a.item.formula,72,y,compact?21:26,W-144,T.mute)+18;
          const size=active.info.sizeEvidence; y+=text(c,size?.label||'SIZE NOT COMPARED',72,y,18,W-144,T.teal,600)+18;
          const room=H-160-y;
          if(room>45){
            const chosen=entries.filter(e=>e.part.id===a.item.id);
            drawing(c,chosen,'front',{x:W*.5,y:y+10,w:W*.38,h:Math.max(20,room-35)},T,a.item.id,smooth(a.progress*3),true);
            const param=Object.entries(active.spec.params||{}).find(([,p])=>p.conf!=='estimated'&&p.value!=null);
            if(param)text(c,param[0].toUpperCase()+' = '+param[1].value+' '+(param[1].unit||''),72,y+35,25,W*.38,T.ink,600);
            text(c,'DETAIL '+String(a.index+1).padStart(2,'0'),72,y+75,18,W*.38,T.mute);
          }
          const selected=entries.find(e=>e.part===active);
          if(selected?.segments.length){
            const origin=E.project(selected.segments[0][0],'front'),offset=selected.views.front.offset;
            const p=fit([origin[0]+offset[0]*explode,origin[1]+offset[1]*explode]),to=[W-115,main.y+main.h-10];
            line(c,p,to,T.teal,1.2);c.beginPath();c.arc(to[0],to[1],19,0,Math.PI*2);c.fillStyle=T.paper;c.fill();c.strokeStyle=T.teal;c.stroke();
            text(c,String(a.index+1).padStart(2,'0'),to[0]-12,to[1]+6,17,40,T.teal,700);
          }
        }else{
          text(c,'DRAWING REVIEW / '+(validation.verdict?.state||'NOTHING CHECKED'),72,detailY+35,compact?28:36,W-144,T.ink,700);
          text(c,(validation.verdict?.estimated||0)+' estimated claims • dashed amber lines',72,detailY+90,24,W-144,T.mute);
          text(c,'Confidence does not verify every drawn dimension.',72,detailY+135,24,W-144,T.mute);
        }
        // A drafting title block, not a Studio HUD or a process dashboard.
        line(c,[45,H-110],[W-45,H-110],T.plateEdge,1.5);line(c,[W*.58,H-110],[W*.58,H-45],T.plateEdge,1);
        text(c,String(spec.fig||spec.id).toUpperCase()+' / '+config.background.toUpperCase(),72,H-72,17,W*.5,T.ink,600);
        text(c,'SHEET '+String(a.index+1).padStart(2,'0')+' / '+String(plan.items.length).padStart(2,'0'),W*.60,H-72,17,W*.32,T.mute);
        c.restore();
      },
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
