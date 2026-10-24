(function(g){
  'use strict'; const T=g.THREE, P=g.MX.parts, tau=Math.PI*2;
  const material=(color,metalness=1,roughness=.29)=>new T.MeshPhysicalMaterial({color,metalness,roughness});
  const mat={steel:material('#bbc4ca'),dark:material('#566571',1,.34),bronze:material('#ae8552',1,.34),blue:material('#285a77',.65,.35),red:material('#a72e36',.45,.32),rubber:material('#242a30',0,.75),orange:material('#dc792a',0,.45),friction:material('#806247',.1,.8),cut:material('#78a3b2',.5,.48),white:material('#e3e4dc',0,.42)};
  const mesh=(geo,material=mat.steel)=>{const m=new T.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;return m;};
  const group=(...children)=>{const o=new T.Group();children.forEach(c=>o.add(c));return o;};
  const at=(o,x=0,y=0,z=0)=>{o.position.set(x,y,z);return o;};
  const circle=(r,x=0,y=0)=>{const p=new T.Path();p.absarc(x,y,r,0,tau,true);return p;};
  function extrude(s,w,material=mat.steel,bevel=.15){const geo=new T.ExtrudeGeometry(s,{depth:Math.max(.01,w-2*bevel),bevelEnabled:bevel>0,bevelSize:bevel*.7,bevelThickness:bevel,bevelSegments:2,steps:1,curveSegments:64});geo.translate(0,0,-(w-2*bevel)/2);return mesh(geo,material);}
  function profile(points,w,material=mat.steel,holes=[]){const s=new T.Shape(points.map(p=>new T.Vector2(...p)));holes.forEach(h=>s.holes.push(h));return extrude(s,w,material);}
  function ring(ri,ro,w,material=mat.steel,start=0,sweep=tau){
    const c=Math.min(.45,(ro-ri)/5,w/6), ps=[[ri+c,-w/2],[ro-c,-w/2],[ro,-w/2+c],[ro,w/2-c],[ro-c,w/2],[ri+c,w/2],[ri,w/2-c],[ri,-w/2+c],[ri+c,-w/2]].map(p=>new T.Vector2(...p));
    const geom=new T.LatheGeometry(ps,160,start,sweep);geom.rotateX(Math.PI/2);const obj=group(mesh(geom,material));
    if(sweep<tau-.001){const cap=new T.ShapeGeometry(new T.Shape(ps));for(const a of [start,start+sweep]){const cg=cap.clone(), p=cg.attributes.position;for(let i=0;i<p.count;i++){const r=p.getX(i),z=p.getY(i);p.setXYZ(i,r*Math.sin(a),-r*Math.cos(a),z);}cg.computeVertexNormals();const cm=mat.cut.clone();cm.side=T.DoubleSide;obj.add(mesh(cg,cm));}}
    return obj;
  }
  const cylinder=(r,w,m=mat.steel)=>{const o=mesh(new T.CylinderGeometry(r,r,w,64),m);o.rotation.x=Math.PI/2;return o;};
  function box(w,h,d,m=mat.steel){const r=Math.min(1.1,w/8,h/8,d/3),s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return extrude(s,d,m,Math.min(.4,d/5));}
  function gear(z,m=1,w=8,material=mat.steel,bore=3,web=false){const gr=P.gear({z,m,width:w,bore,mat:material,backlash:.025,web:web?{n:6,r:m*z*.29,d:m*z*.16}:null});return gr;}
  function sector(ri,ro,a0,a1,w,m=mat.steel){const s=new T.Shape();s.absarc(0,0,ro,a0,a1,false);s.lineTo(ri*Math.cos(a1),ri*Math.sin(a1));s.absarc(0,0,ri,a1,a0,true);s.closePath();return extrude(s,w,m,.08);}
  function bolt(r=1.5,len=8){const h=mesh(new T.CylinderGeometry(r*1.75,r*1.75,r,6),mat.dark);h.rotation.x=Math.PI/2;h.position.z=len/2;return group(cylinder(r,len,mat.dark),h);}
  function link(length,width,w,material=mat.steel){const r=width/2,s=new T.Shape();s.absarc(0,length/2,r,0,Math.PI,false);s.lineTo(-r,-length/2);s.absarc(0,-length/2,r,Math.PI,tau,false);s.closePath();s.holes.push(circle(r*.42,0,length/2),circle(r*.42,0,-length/2));return extrude(s,w,material,.2);}
  function spring(r,wire,turns,len){const ps=[];for(let i=0;i<=turns*48;i++){const a=i/48*tau;ps.push(new T.Vector3(r*Math.cos(a),r*Math.sin(a),len*(i/(turns*48)-.5)));}return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(ps),turns*64,wire/2,8),mat.steel);}
  function helix(core,crest,pitch,len,material=mat.steel,phase=0,span=tau,start=0){
    const verts=[],indices=[],turns=len/pitch,N=Math.ceil(turns*96),depth=Math.abs(crest-core),halfC=.5,halfB=halfC+depth*Math.tan(Math.PI/12),section=[[core,-halfB],[crest,-halfC],[crest,halfC],[core,halfB]];
    for(let i=0;i<=N;i++){const a=i/N*turns*tau+phase;for(let j=0;j<4;j++)for(const [r,dz]of [section[j],section[(j+1)%4]])verts.push(r*Math.cos(a),r*Math.sin(a),-len/2+i/N*len+dz);}
    for(let i=0;i<N;i++){const a=((i/N*turns*tau+phase-start)%tau+tau)%tau;if(a>span)continue;for(let j=0;j<4;j++){const k=i*8+j*2,l=k+1;indices.push(k,k+8,l,k+8,l+8,l);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(geo,material);
  }
  function model(){const root=new T.Group(),parts=[];return{root,parts,part(id,child,pos=[0,0,0],ex=[0,0,0]){const o=group(child);at(o,...pos);root.add(o);const p={id,o,base:new T.Vector3(...pos),ex:new T.Vector3(...ex)};parts.push(p);return o;},reset(){parts.forEach(p=>{p.o.visible=true;p.o.position.copy(p.base);p.o.rotation.set(0,0,0);p.o.scale.set(1,1,1);});},explode(e){parts.forEach(p=>p.o.position.addScaledVector(p.ex,e));},pose(){},check(){return{};}};}
  g.RevisionGeometry={T,P,tau,mat,mesh,group,at,circle,extrude,profile,ring,cylinder,box,gear,sector,bolt,link,spring,helix,model};
})(window);
