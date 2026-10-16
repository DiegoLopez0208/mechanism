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
  E.run=({spec,validation,config,F,W,H,length})=>{
    const plan=P.plan(spec,'paper',length),T=MX.THEME,cache=meshEdges(F.parts);
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
        text(c,'ORTHOGRAPHIC STUDY • NOT TO SCALE',72,204,17,W-144,T.mute);
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
