/* Paper Mesh Adapter: turns the model meshes the spec compiles into a plain view set that the Paper vector engine
 * (kit/paper-engine.js) draws. This is the only Paper module that touches three.js. It never renders: the stage it
 * gives MX.figure is mathematical, and what it returns is numbers.
 *
 *   MX.paperMesh.stage(o)      the minimal stage MX.figure needs to compile parts without WebGL
 *   MX.paperMesh.viewSet(F)    { entries: [{ id, conf, anchor, views: { front|top|side: { points, bounds, offset } } }],
 *                                parts: { <id>: { sizeLabel, param: { name, value, unit } | null } } }
 *                              points: Float32Array of 2D segments (x0, y0, x1, y1, ...) in model mm, already projected
 *                              bounds: [left, top, right, bottom] of those points; offset: the exploded translation in that view
 *                              anchor: the first edge point in the front view (where the callout leader starts), or null
 *   MX.paperMesh.shapeCheck(F) the area check the preflight reads (flat parts whose mesh does not cover their outline)
 */
(function (g) {
  'use strict';
  const MX=g.MX=g.MX||{}, M=MX.paperMesh={}, E=MX.paperEngine;
  // Geometry compilation uses the figure's scene graph, but never G.stage.
  // Supply the minimal mathematical stage needed by that compiler and exports.
  M.stage=o=>{
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
  // The same sequence Paper ran inside its engine before the split: edges once per mesh, lines at the assembled pose,
  // explode offsets from the pose at e = .55 (the figure is left there, as before), three projections, then plain data.
  M.viewSet=F=>{
    const cache=meshEdges(F.parts),TH=g.THREE;
    const pose={t:0,e:0,mech:{ang:()=>0,step:0,phase:0},view:{yaw:0,pitch:0,zoom:1}};
    F.apply(pose,false);F.st.scene.updateMatrixWorld(true);const lines=worldLines(cache);
    const origins=F.parts.map(p=>new TH.Vector3().setFromMatrixPosition(p.group.matrixWorld));
    F.apply({...pose,e:.55},false);F.st.scene.updateMatrixWorld(true);
    lines.forEach((entry,i)=>{entry.offset=new TH.Vector3().setFromMatrixPosition(entry.part.group.matrixWorld).sub(origins[i]).toArray();});
    // Technical explosion is translation-only. Cache contour topology and all
    // three orthographic projections once, then move vector paths analytically.
    prepare(lines);
    const entries=lines.map(l=>({id:l.part.id,conf:l.part.spec.conf,anchor:l.segments.length?E.project(l.segments[0][0],'front'):null,views:l.views}));
    const parts={};
    for(const p of F.parts){
      const param=Object.entries(p.spec.params||{}).find(([,q])=>q.conf!=='estimated'&&q.value!=null);
      parts[p.id]={sizeLabel:p.info?.sizeEvidence?.label||null,param:param?{name:param[0],value:param[1].value,unit:param[1].unit||''}:null};
    }
    return{entries,parts};
  };
  M.shapeCheck=F=>()=>F.parts.map(p=>{
    let ratio=1;p.group.traverse(m=>{const u=m.geometry?.userData;if(u?.areaRatio!=null&&Math.abs(u.areaRatio-1)>Math.abs(ratio-1))ratio=u.areaRatio;});return{id:p.id,ratio};
  }).filter(p=>Math.abs(p.ratio-1)>.01);
})(typeof window !== 'undefined' ? window : globalThis);
